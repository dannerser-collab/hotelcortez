// Solicitudes de la mucama: crear, ver, modificar mientras no esté asignada y anular.
import { Router } from 'express';
import { z } from 'zod';
import { transaccion, fila, filas, ejecutar, type Conexion } from '../../db/pool.js';
import { falla, ruta, validar, idValido, texto, fotoBase64 } from '../../lib/http.js';
import { guardarFoto, borrarFoto } from '../../lib/fotos.js';
import { avisar } from '../../lib/tiempoReal.js';
import { enviarPush, pushSupervisores } from '../../lib/push.js';
import {
    OCUPACIONES,
    prioridadPorOcupacion,
    requiereSupervisor,
    puedePasar,
    codigoIncidente,
    ubicacionHabitacion,
    habitacionEnRango,
    prioridadAlReiterar,
    ESTADOS_ABIERTOS,
    TIPOS_HABITACION
} from '../../domain/reglas.js';
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

/** Incidentes abiertos en una habitación (de cualquier mucama), para no duplicar reportes. */
async function abiertasEnHabitacion(numero: string, idEmpleado: number, c?: Conexion) {
    const r = await filas<any>(
        `SELECT s.id_solicitud, s.problema, s.estado, s.nivel_prioridad, s.ocupacion, s.creada_en,
                CONCAT(m.nombre, ' ', m.apellido) AS mucama, tm.codigo AS turno_mucama, s.id_empleado = ? AS es_mia,
                (SELECT COUNT(*) FROM solicitud_evento ev WHERE ev.id_solicitud = s.id_solicitud AND ev.tipo = 'REITERADA') AS veces_reiterada,
                EXISTS (SELECT 1 FROM solicitud_evento ev WHERE ev.id_solicitud = s.id_solicitud AND ev.tipo = 'REITERADA' AND ev.id_empleado = ?) AS ya_reiterada
         FROM solicitud s JOIN habitacion h USING (id_habitacion) JOIN empleado m ON m.id_empleado = s.id_empleado
         LEFT JOIN turno tm ON tm.id_turno = m.id_turno
         WHERE h.numero = ? AND s.estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')})
         ORDER BY s.creada_en DESC`,
        [idEmpleado, idEmpleado, numero, ...ESTADOS_ABIERTOS],
        c
    );
    return r.map(x => ({ ...x, codigo: codigoIncidente(x.id_solicitud), es_mia: Boolean(x.es_mia), ya_reiterada: Boolean(x.ya_reiterada) }));
}

rutasSolicitudes.get(
    '/abiertas/:numero',
    permitir('MUCAMA', 'SUPERVISOR'),
    ruta(async (req, res) => {
        const numero = validar(
            z
                .string()
                .trim()
                .regex(/^\d{3}$/, 'Número de habitación inválido.'),
            req.params.numero
        );
        res.json(await abiertasEnHabitacion(numero, usuario(res).id_empleado));
    })
);

rutasSolicitudes.get(
    '/:id',
    ruta(async (req, res) => {
        res.json(await obtenerSolicitud(usuario(res), validar(idValido, req.params.id)));
    })
);

const esquemaNueva = z.object({
    numero_habitacion: z.string().trim().refine(habitacionEnRango, 'Habitación inexistente. Los números válidos van del 100 al 499.'),
    tipo_habitacion: z.enum(TIPOS_HABITACION, { message: 'Elige el tipo de habitación.' }),
    problema: texto(2000, 'el detalle del problema'),
    ocupacion: z.enum(OCUPACIONES, { message: 'Indica si la habitación está libre, ocupada o reservada.' }),
    prioridad: z.coerce.number().int().min(1).max(3).optional(),
    foto: fotoBase64.optional().nullable(),
    // La mucama confirmó que es un problema distinto al que ya está abierto en la habitación
    es_otro_problema: z.boolean().optional()
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
                let h = await fila<{ id_habitacion: number; id_mucama: number | null }>(
                    'SELECT id_habitacion, id_mucama FROM habitacion WHERE numero = ? FOR UPDATE',
                    [d.numero_habitacion],
                    c
                );
                if (!h) {
                    // Habitación nueva: el bloque y el piso salen del número (124 → bloque 100, piso 1)
                    const { bloque, piso } = ubicacionHabitacion(d.numero_habitacion);
                    await ejecutar('INSERT IGNORE INTO bloque (bloque) VALUES (?)', [bloque], c);
                    const insH = await ejecutar(
                        'INSERT INTO habitacion (id_bloque, numero, piso, id_mucama, estado) SELECT id_bloque, ?, ?, ?, TRUE FROM bloque WHERE bloque = ?',
                        [d.numero_habitacion, piso, u.id_empleado, bloque],
                        c
                    );
                    h = { id_habitacion: insH.insertId, id_mucama: u.id_empleado };
                } else if (h.id_mucama === null) {
                    await ejecutar('UPDATE habitacion SET id_mucama = ? WHERE id_habitacion = ?', [u.id_empleado, h.id_habitacion], c);
                    h.id_mucama = u.id_empleado;
                }
                // Cualquier mucama puede reportar cualquier habitación (los turnos se relevan).
                // Si ya hay un incidente abierto, debe decidir antes si es el mismo o uno distinto.
                if (!d.es_otro_problema && (await abiertasEnHabitacion(d.numero_habitacion, u.id_empleado, c)).length)
                    falla(409, `Ya hay un incidente abierto en la habitación ${d.numero_habitacion}. Indica si es el mismo problema o uno distinto.`);
                // Tipo elegido por la mucama: se guarda en la habitación
                await ejecutar('INSERT IGNORE INTO tipo_habitacion (nombre) VALUES (?)', [d.tipo_habitacion], c);
                await ejecutar(
                    'UPDATE habitacion SET id_tipo_hab = (SELECT id_tipo_hab FROM tipo_habitacion WHERE nombre = ?) WHERE id_habitacion = ?',
                    [d.tipo_habitacion, h.id_habitacion],
                    c
                );
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
            avisar('catalogos');
            if (requiereSupervisor(nivel)) void pushSupervisores('Nueva solicitud prioritaria', `Hab. ${d.numero_habitacion}: ${d.problema.slice(0, 80)}`);
            res.status(201).json(r);
        } catch (e) {
            await borrarFoto(foto);
            throw e;
        }
    })
);

/** Otra mucama (u otro turno) confirma que el problema sigue: sube la prioridad y avisa al supervisor. */
rutasSolicitudes.post(
    '/:id/reiterar',
    permitir('MUCAMA'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(z.object({ comentario: z.string().trim().max(300).optional(), ocupacion: z.enum(OCUPACIONES).optional() }), req.body ?? {});
        const u = usuario(res);
        const r = await transaccion(async c => {
            const s = await bloquearSolicitud(c, id);
            if (!ESTADOS_ABIERTOS.includes(s.estado)) falla(409, 'Este incidente ya fue cerrado. Si el problema volvió, registra uno nuevo.');
            if (await fila("SELECT 1 FROM solicitud_evento WHERE id_solicitud = ? AND tipo = 'REITERADA' AND id_empleado = ?", [id, u.id_empleado], c))
                falla(409, 'Ya volviste a reportar este incidente. El supervisor ya fue avisado.');
            const nivel = prioridadAlReiterar(s.nivel_prioridad, d.ocupacion);
            await ejecutar(
                'UPDATE solicitud SET nivel_prioridad = ?, ocupacion = COALESCE(?, ocupacion) WHERE id_solicitud = ?',
                [nivel, d.ocupacion ?? null, id],
                c
            );
            await registrarEvento(c, id, 'REITERADA', u.id_empleado, d.comentario || null);
            return { s, nivel };
        });
        avisar('solicitudes');
        const subio = r.nivel < r.s.nivel_prioridad;
        void pushSupervisores(
            'Incidente reportado de nuevo',
            `Hab. ${r.s.numero} · ${codigoIncidente(id)} sigue sin resolverse${subio ? ' (prioridad aumentada)' : ''}.`
        );
        if (r.s.id_tecnico) void enviarPush([r.s.id_tecnico], 'Incidente reportado de nuevo', `Hab. ${r.s.numero} · ${codigoIncidente(id)}`, '/');
        res.json({ codigo: codigoIncidente(id), nivel_prioridad: r.nivel, prioridad_subio: subio });
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
