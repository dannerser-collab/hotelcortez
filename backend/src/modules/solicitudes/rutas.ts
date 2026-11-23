// Solicitudes de la mucama: crear, ver, modificar mientras no esté asignada y anular.
import { Router } from 'express';
import { z } from 'zod';
import { transaccion, fila, ejecutar } from '../../db/pool.js';
import { falla, ruta, validar, idValido, texto, fotoBase64 } from '../../lib/http.js';
import { guardarFoto, borrarFoto } from '../../lib/fotos.js';
import { avisar } from '../../lib/tiempoReal.js';
import { enviarPush, pushSupervisores } from '../../lib/push.js';
import { OCUPACIONES, prioridadPorOcupacion, requiereSupervisor, puedePasar, codigoIncidente } from '../../domain/reglas.js';
import { permitir, usuario } from '../auth/auth.js';
import { listarSolicitudes, obtenerSolicitud, bloquearSolicitud, registrarEvento, actualizarHabitacion } from './consultas.js';

export const rutasSolicitudes = Router();

rutasSolicitudes.get(
    '/',
    ruta(async (req, res) => {
        const q = validar(
            z.object({
                estado: z.string().optional(),
                bloque: z.coerce.number().int().optional(),
                q: z.string().max(100).optional(),
                historial: z.enum(['0', '1']).optional(),
                limite: z.coerce.number().int().optional()
            }),
            req.query
        );
        res.json(await listarSolicitudes(usuario(res), { estado: q.estado, bloque: q.bloque, texto: q.q, historial: q.historial === '1', limite: q.limite }));
    })
);

rutasSolicitudes.get(
    '/:id',
    ruta(async (req, res) => {
        res.json(await obtenerSolicitud(usuario(res), validar(idValido, req.params.id)));
    })
);

const esquemaNueva = z.object({
    numero_habitacion: z
        .string()
        .trim()
        .regex(/^\d{1,5}$/, 'Ingresa un número de habitación válido.'),
    problema: texto(2000, 'el detalle del problema'),
    ocupacion: z.enum(OCUPACIONES, { message: 'Indica si la habitación está libre, ocupada o reservada.' }),
    prioridad: z.coerce.number().int().min(1).max(3).optional(),
    foto: fotoBase64.optional().nullable()
});

rutasSolicitudes.post(
    '/',
    permitir('MUCAMA'),
    ruta(async (req, res) => {
        const d = validar(esquemaNueva, req.body);
        const u = usuario(res);
        const nivel = prioridadPorOcupacion(d.ocupacion, d.prioridad);
        const foto = d.foto ? await guardarFoto(d.foto) : null;
        try {
            const r = await transaccion(async c => {
                const h = await fila<{ id_habitacion: number; id_mucama: number | null }>(
                    'SELECT id_habitacion, id_mucama FROM habitacion WHERE numero = ? FOR UPDATE',
                    [d.numero_habitacion],
                    c
                );
                if (!h) falla(404, `La habitación ${d.numero_habitacion} no existe en el catálogo. Pide al supervisor que la registre.`);
                if (h!.id_mucama !== u.id_empleado) falla(403, `La habitación ${d.numero_habitacion} no está asignada a tu usuario.`);
                const ins = await ejecutar(
                    'INSERT INTO solicitud (id_empleado, id_habitacion, problema, ocupacion, nivel_prioridad, foto, creada_en) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [u.id_empleado, h!.id_habitacion, d.problema, d.ocupacion, nivel, foto],
                    c
                );
                await registrarEvento(c, ins.insertId, 'REPORTADA', u.id_empleado);
                await actualizarHabitacion(c, h!.id_habitacion);
                return { id_solicitud: ins.insertId, codigo: codigoIncidente(ins.insertId), nivel_prioridad: nivel };
            });
            avisar('solicitudes');
            avisar('habitaciones');
            if (requiereSupervisor(nivel)) void pushSupervisores('Nueva solicitud prioritaria', `Hab. ${d.numero_habitacion}: ${d.problema.slice(0, 80)}`);
            res.status(201).json(r);
        } catch (e) {
            await borrarFoto(foto);
            throw e;
        }
    })
);

const esquemaCambio = z.object({
    problema: texto(2000, 'el detalle del problema').optional(),
    ocupacion: z.enum(OCUPACIONES).optional(),
    prioridad: z.coerce.number().int().min(1).max(3).optional(),
    foto: fotoBase64.optional().nullable()
});

/** La mucama puede modificar su solicitud solo mientras siga sin asignar. */
rutasSolicitudes.patch(
    '/:id',
    permitir('MUCAMA'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(esquemaCambio, req.body);
        const u = usuario(res);
        const nuevaFoto = d.foto ? await guardarFoto(d.foto) : null;
        let fotoVieja: string | null = null;
        try {
            await transaccion(async c => {
                const s = await bloquearSolicitud(c, id);
                if (s.id_empleado !== u.id_empleado) falla(403, 'Solo puedes modificar tus propias solicitudes.');
                if (s.estado !== 'SIN_ASIGNAR') falla(409, 'Ya fue asignada, no se puede modificar.');
                const actual = await fila<{ ocupacion: any; nivel_prioridad: number }>(
                    'SELECT ocupacion, nivel_prioridad FROM solicitud WHERE id_solicitud = ?',
                    [id],
                    c
                );
                const ocupacion = d.ocupacion ?? actual!.ocupacion;
                const nivel = d.ocupacion || d.prioridad ? prioridadPorOcupacion(ocupacion, d.prioridad ?? actual!.nivel_prioridad) : actual!.nivel_prioridad;
                const sets = ['ocupacion = ?', 'nivel_prioridad = ?'];
                const p: unknown[] = [ocupacion, nivel];
                if (d.problema) {
                    sets.push('problema = ?');
                    p.push(d.problema);
                }
                if (d.foto !== undefined) {
                    sets.push('foto = ?');
                    p.push(nuevaFoto);
                    fotoVieja = s.foto;
                }
                await ejecutar(`UPDATE solicitud SET ${sets.join(', ')} WHERE id_solicitud = ?`, [...p, id], c);
                await registrarEvento(c, id, 'MODIFICADA', u.id_empleado);
            });
        } catch (e) {
            await borrarFoto(nuevaFoto);
            throw e;
        }
        await borrarFoto(fotoVieja);
        avisar('solicitudes');
        res.json({ ok: true });
    })
);

rutasSolicitudes.post(
    '/:id/anular',
    permitir('MUCAMA', 'SUPERVISOR'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const u = usuario(res);
        const motivo = validar(z.object({ motivo: z.string().trim().max(300).optional() }), req.body ?? {}).motivo || null;
        const r = await transaccion(async c => {
            const s = await bloquearSolicitud(c, id);
            if (u.rol === 'MUCAMA' && s.id_empleado !== u.id_empleado) falla(403, 'Solo puedes anular tus propias solicitudes.');
            if (u.rol === 'MUCAMA' && s.estado !== 'SIN_ASIGNAR') falla(409, 'Ya fue asignada; pide al supervisor que la anule.');
            if (!puedePasar(s.estado, 'ANULADA') && !(u.rol === 'SUPERVISOR' && s.estado !== 'RESUELTA' && s.estado !== 'ANULADA'))
                falla(409, 'Esta solicitud ya no se puede anular.');
            await ejecutar("UPDATE solicitud SET estado = 'ANULADA' WHERE id_solicitud = ?", [id], c);
            if (s.id_asignacion)
                await ejecutar('UPDATE asignacion SET finalizada_en = COALESCE(finalizada_en, NOW()) WHERE id_asignacion = ?', [s.id_asignacion], c);
            await registrarEvento(c, id, 'ANULADA', u.id_empleado, motivo);
            await actualizarHabitacion(c, s.id_habitacion);
            return s;
        });
        avisar('solicitudes');
        avisar('habitaciones');
        if (r.id_tecnico) void enviarPush([r.id_tecnico], 'Solicitud anulada', `Hab. ${r.numero} ya no requiere atención.`);
        res.json({ ok: true });
    })
);
