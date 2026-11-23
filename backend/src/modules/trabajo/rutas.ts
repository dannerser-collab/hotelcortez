// Trabajo técnico: asignar (supervisor), tomar (técnico), iniciar, reportar Hecho/Pendiente,
// editar reportes (supervisor) y solicitudes de modificación de reportes.
import { Router } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { transaccion, fila, filas, ejecutar, pool } from '../../db/pool.js';
import { falla, ruta, validar, idValido, texto } from '../../lib/http.js';
import { avisar } from '../../lib/tiempoReal.js';
import { enviarPush, pushSupervisores } from '../../lib/push.js';
import { requiereSupervisor, puedePasar, estadoTrasReporte, normalizarMaterial, codigoIncidente } from '../../domain/reglas.js';
import { permitir, usuario } from '../auth/auth.js';
import { bloquearSolicitud, registrarEvento, actualizarHabitacion } from '../solicitudes/consultas.js';

export const rutasTrabajo = Router();

const idOpcional = z.coerce.number().int().positive().optional().nullable();

// ---------------------------------------------------------------------------
// Asignación
// ---------------------------------------------------------------------------
rutasTrabajo.post(
    '/solicitudes/:id/asignar',
    permitir('SUPERVISOR'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(z.object({ id_tecnico: idValido, id_dificultad: idOpcional, id_especialidad: idOpcional }), req.body);
        const u = usuario(res);
        const r = await transaccion(async c => {
            const s = await bloquearSolicitud(c, id);
            if (!['SIN_ASIGNAR', 'ASIGNADA', 'PENDIENTE'].includes(s.estado))
                falla(409, 'Solo se puede asignar o reasignar una solicitud sin asignar, asignada o pendiente.');
            const t = await fila("SELECT id_empleado FROM empleado WHERE id_empleado = ? AND rol = 'TECNICO' AND id_estado_empleado = 1", [d.id_tecnico], c);
            if (!t) falla(400, 'Selecciona un técnico activo.');
            if (s.id_asignacion) {
                await ejecutar(
                    `UPDATE asignacion SET id_tecnico = ?, asignado_por = ?, id_dificultad = COALESCE(?, id_dificultad),
                 id_especialidad = COALESCE(?, id_especialidad), asignada_en = NOW(),
                 iniciada_en = IF(id_tecnico = ?, iniciada_en, NULL) WHERE id_asignacion = ?`,
                    [d.id_tecnico, u.id_empleado, d.id_dificultad ?? null, d.id_especialidad ?? null, d.id_tecnico, s.id_asignacion],
                    c
                );
            } else {
                await ejecutar(
                    'INSERT INTO asignacion (id_solicitud, id_tecnico, asignado_por, id_dificultad, id_especialidad, asignada_en) VALUES (?, ?, ?, ?, ?, NOW())',
                    [id, d.id_tecnico, u.id_empleado, d.id_dificultad ?? null, d.id_especialidad ?? null],
                    c
                );
            }
            if (s.estado === 'SIN_ASIGNAR') await ejecutar("UPDATE solicitud SET estado = 'ASIGNADA' WHERE id_solicitud = ?", [id], c);
            await registrarEvento(c, id, s.id_asignacion ? 'REASIGNADA' : 'ASIGNADA', u.id_empleado, `Técnico #${d.id_tecnico}`);
            return s;
        });
        avisar('solicitudes');
        void enviarPush([d.id_tecnico], 'Nueva asignación', `Hab. ${r.numero} · ${codigoIncidente(id)}`, '/');
        res.json({ ok: true });
    })
);

/** El técnico toma una solicitud de prioridad Media o Baja que nadie atiende. */
rutasTrabajo.post(
    '/solicitudes/:id/tomar',
    permitir('TECNICO'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const u = usuario(res);
        await transaccion(async c => {
            const s = await bloquearSolicitud(c, id);
            if (s.estado !== 'SIN_ASIGNAR' || s.id_asignacion) falla(409, 'Otro técnico ya tomó esta solicitud. Actualiza la lista.');
            if (requiereSupervisor(s.nivel_prioridad)) falla(403, 'Las solicitudes urgentes y de prioridad alta las asigna el supervisor.');
            await ejecutar('INSERT INTO asignacion (id_solicitud, id_tecnico, asignada_en, iniciada_en) VALUES (?, ?, NOW(), NOW())', [id, u.id_empleado], c);
            await ejecutar("UPDATE solicitud SET estado = 'EN_PROCESO' WHERE id_solicitud = ?", [id], c);
            await registrarEvento(c, id, 'TOMADA', u.id_empleado);
            await registrarEvento(c, id, 'INICIADA', u.id_empleado);
        });
        avisar('solicitudes');
        res.json({ ok: true });
    })
);

/** Marca el inicio del trabajo (para medir tiempos). */
rutasTrabajo.post(
    '/solicitudes/:id/iniciar',
    permitir('TECNICO'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(z.object({ diagnostico: z.string().trim().max(2000).optional() }), req.body ?? {});
        const u = usuario(res);
        await transaccion(async c => {
            const s = await bloquearSolicitud(c, id);
            if (s.id_tecnico !== u.id_empleado) falla(403, 'Esta solicitud no está asignada a ti.');
            if (!puedePasar(s.estado, 'EN_PROCESO')) falla(409, 'El trabajo ya fue iniciado o cerrado.');
            await ejecutar(
                'UPDATE asignacion SET iniciada_en = COALESCE(iniciada_en, NOW()), diagnostico = COALESCE(?, diagnostico) WHERE id_asignacion = ?',
                [d.diagnostico || null, s.id_asignacion],
                c
            );
            await ejecutar("UPDATE solicitud SET estado = 'EN_PROCESO' WHERE id_solicitud = ?", [id], c);
            await registrarEvento(c, id, s.estado === 'PENDIENTE' ? 'REANUDADA' : 'INICIADA', u.id_empleado);
        });
        avisar('solicitudes');
        res.json({ ok: true });
    })
);

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------
const esquemaMaterial = z.object({
    id_material: z.coerce.number().int().positive().optional(),
    nombre: z.string().trim().max(80).optional(),
    cantidad: z.coerce.number({ message: 'Cantidad inválida.' }).positive('La cantidad debe ser mayor a 0.').max(9999)
});

const esquemaReporte = z
    .object({
        resultado: z.enum(['HECHO', 'PENDIENTE'], { message: 'Indica si quedó hecho o pendiente.' }),
        observacion: texto(4000, 'las observaciones'),
        motivo_pendiente: z.string().trim().max(2000).optional().nullable(),
        materiales: z.array(esquemaMaterial).max(50).default([]),
        id_dificultad: idOpcional,
        id_especialidad: idOpcional
    })
    .refine(r => r.resultado !== 'PENDIENTE' || (r.motivo_pendiente && r.motivo_pendiente.length > 0), {
        message: 'El motivo del pendiente es obligatorio.'
    });

type MaterialEntrada = z.infer<typeof esquemaMaterial>;

/** Resuelve nombres a materiales (creando los nuevos) y agrupa cantidades. */
async function resolverMateriales(c: PoolConnection, lista: MaterialEntrada[]) {
    const total = new Map<number, number>();
    for (const m of lista) {
        let id = m.id_material;
        if (!id) {
            const nombre = normalizarMaterial(m.nombre || '');
            if (!nombre) continue;
            const ex = await fila<{ id_material: number }>('SELECT id_material FROM material WHERE nombre_mat = ? FOR UPDATE', [nombre], c);
            id = ex?.id_material ?? (await ejecutar('INSERT INTO material (nombre_mat) VALUES (?)', [nombre], c)).insertId;
        } else if (!(await fila('SELECT 1 FROM material WHERE id_material = ?', [id], c))) falla(400, 'Material inválido.');
        total.set(id!, (total.get(id!) || 0) + m.cantidad);
    }
    return total;
}

async function guardarMaterialesReporte(c: PoolConnection, idReporte: number, mats: Map<number, number>) {
    // Devuelve al stock lo que tenía el reporte (si se está editando) y descuenta lo nuevo
    await ejecutar(
        `UPDATE material m JOIN reporte_material rm USING (id_material) SET m.stock = m.stock + rm.cantidad
         WHERE rm.id_reporte = ? AND m.stock IS NOT NULL`,
        [idReporte],
        c
    );
    await ejecutar('DELETE FROM reporte_material WHERE id_reporte = ?', [idReporte], c);
    for (const [id, cant] of mats) {
        await ejecutar('INSERT INTO reporte_material (id_reporte, id_material, cantidad) VALUES (?, ?, ?)', [idReporte, id, cant], c);
        await ejecutar('UPDATE material SET stock = stock - ? WHERE id_material = ? AND stock IS NOT NULL', [cant, id], c);
    }
}

/** Reporte del técnico asignado, o del supervisor al "resolver o actualizar" un incidente. */
rutasTrabajo.post(
    '/solicitudes/:id/reportes',
    permitir('TECNICO', 'SUPERVISOR'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(esquemaReporte, req.body);
        const u = usuario(res);
        const r = await transaccion(async c => {
            const s = await bloquearSolicitud(c, id);
            if (!s.id_asignacion) falla(409, 'La solicitud aún no tiene técnico asignado.');
            if (u.rol === 'TECNICO' && s.id_tecnico !== u.id_empleado) falla(403, 'Solo el técnico asignado puede reportar este trabajo.');
            const nuevo = estadoTrasReporte(d.resultado);
            if (!puedePasar(s.estado, nuevo)) falla(409, 'Este incidente ya está cerrado.');
            const mats = await resolverMateriales(c, d.materiales);
            const ins = await ejecutar(
                'INSERT INTO reporte (id_asignacion, id_autor, resultado, observacion, motivo_pendiente) VALUES (?, ?, ?, ?, ?)',
                [s.id_asignacion, u.id_empleado, d.resultado, d.observacion, d.resultado === 'PENDIENTE' ? d.motivo_pendiente : null],
                c
            );
            await guardarMaterialesReporte(c, ins.insertId, mats);
            await ejecutar(
                `UPDATE asignacion SET iniciada_en = COALESCE(iniciada_en, NOW()), finalizada_en = ?,
             id_dificultad = COALESCE(?, id_dificultad), id_especialidad = COALESCE(?, id_especialidad) WHERE id_asignacion = ?`,
                [
                    d.resultado === 'HECHO' ? new Date() : null,
                    u.rol === 'SUPERVISOR' ? (d.id_dificultad ?? null) : null,
                    d.id_especialidad ?? null,
                    s.id_asignacion
                ],
                c
            );
            await ejecutar('UPDATE solicitud SET estado = ? WHERE id_solicitud = ?', [nuevo, id], c);
            await registrarEvento(c, id, d.resultado === 'HECHO' ? 'RESUELTA' : 'PENDIENTE', u.id_empleado, d.motivo_pendiente || null);
            await actualizarHabitacion(c, s.id_habitacion);
            return { s, id_reporte: ins.insertId };
        });
        avisar('solicitudes');
        avisar('habitaciones');
        avisar('catalogos');
        if (d.resultado === 'PENDIENTE' && u.rol === 'TECNICO')
            void pushSupervisores('Reporte pendiente', `Hab. ${r.s.numero}: ${d.motivo_pendiente?.slice(0, 80)}`);
        res.status(201).json({ id_reporte: r.id_reporte });
    })
);

/** Solo el supervisor modifica un reporte ya enviado. */
rutasTrabajo.patch(
    '/reportes/:id',
    permitir('SUPERVISOR'),
    ruta(async (req, res) => {
        const idReporte = validar(idValido, req.params.id);
        const d = validar(
            z.object({
                observacion: texto(4000, 'las observaciones').optional(),
                motivo_pendiente: z.string().trim().max(2000).optional().nullable(),
                materiales: z.array(esquemaMaterial).max(50).optional()
            }),
            req.body
        );
        const u = usuario(res);
        await transaccion(async c => {
            const rep = await fila<{ id_solicitud: number; resultado: string }>(
                'SELECT a.id_solicitud, r.resultado FROM reporte r JOIN asignacion a USING (id_asignacion) WHERE r.id_reporte = ? FOR UPDATE',
                [idReporte],
                c
            );
            if (!rep) falla(404, 'Reporte no encontrado.');
            await bloquearSolicitud(c, rep!.id_solicitud);
            await ejecutar(
                `UPDATE reporte SET observacion = COALESCE(?, observacion),
             motivo_pendiente = IF(resultado = 'PENDIENTE', COALESCE(?, motivo_pendiente), NULL), actualizado_en = NOW()
             WHERE id_reporte = ?`,
                [d.observacion ?? null, d.motivo_pendiente ?? null, idReporte],
                c
            );
            if (d.materiales) await guardarMaterialesReporte(c, idReporte, await resolverMateriales(c, d.materiales));
            await registrarEvento(c, rep!.id_solicitud, 'REPORTE_EDITADO', u.id_empleado, `Reporte #${idReporte}`);
        });
        avisar('solicitudes');
        avisar('catalogos');
        res.json({ ok: true });
    })
);

// ---------------------------------------------------------------------------
// Solicitudes de modificación de reportes
// ---------------------------------------------------------------------------
rutasTrabajo.post(
    '/reportes/:id/modificaciones',
    permitir('TECNICO'),
    ruta(async (req, res) => {
        const idReporte = validar(idValido, req.params.id);
        const d = validar(z.object({ detalle: texto(1000, 'qué hay que modificar') }), req.body);
        const u = usuario(res);
        const rep = await fila<{ id_autor: number; id_solicitud: number }>(
            'SELECT r.id_autor, a.id_solicitud FROM reporte r JOIN asignacion a USING (id_asignacion) WHERE r.id_reporte = ?',
            [idReporte]
        );
        if (!rep) falla(404, 'Reporte no encontrado.');
        if (rep!.id_autor !== u.id_empleado) falla(403, 'Solo puedes pedir cambios sobre tus propios reportes.');
        if (await fila("SELECT 1 FROM solicitud_modificacion WHERE id_reporte = ? AND estado = 'PENDIENTE'", [idReporte]))
            falla(409, 'Ya hay una solicitud de modificación pendiente para este reporte.');
        await ejecutar('INSERT INTO solicitud_modificacion (id_reporte, id_solicitante, detalle) VALUES (?, ?, ?)', [idReporte, u.id_empleado, d.detalle]);
        await registrarEvento(pool, rep!.id_solicitud, 'MODIF_SOLICITADA', u.id_empleado, d.detalle);
        avisar('modificaciones');
        void pushSupervisores('Solicitud de modificación', d.detalle.slice(0, 100));
        res.status(201).json({ ok: true });
    })
);

rutasTrabajo.get(
    '/modificaciones',
    permitir('TECNICO', 'SUPERVISOR'),
    ruta(async (_req, res) => {
        const u = usuario(res);
        res.json(
            await filas(
                `SELECT sm.*, CONCAT(e.nombre, ' ', e.apellido) AS solicitante, a.id_solicitud, h.numero, b.bloque,
                    r.resultado, r.observacion, r.creado_en AS reporte_en
             FROM solicitud_modificacion sm
             JOIN reporte r USING (id_reporte) JOIN asignacion a USING (id_asignacion)
             JOIN solicitud s ON s.id_solicitud = a.id_solicitud JOIN habitacion h USING (id_habitacion) JOIN bloque b USING (id_bloque)
             JOIN empleado e ON e.id_empleado = sm.id_solicitante
             WHERE ${u.rol === 'TECNICO' ? 'sm.id_solicitante = ?' : '1 = 1'}
               AND (sm.estado = 'PENDIENTE' OR sm.atendida_en >= NOW() - INTERVAL 15 DAY)
             ORDER BY sm.estado = 'HECHA', sm.creada_en DESC LIMIT 200`,
                u.rol === 'TECNICO' ? [u.id_empleado] : []
            )
        );
    })
);

rutasTrabajo.post(
    '/modificaciones/:id/hecha',
    permitir('SUPERVISOR'),
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const u = usuario(res);
        const m = await fila<{ id_solicitante: number; id_solicitud: number }>(
            `SELECT sm.id_solicitante, a.id_solicitud FROM solicitud_modificacion sm JOIN reporte r USING (id_reporte)
         JOIN asignacion a USING (id_asignacion) WHERE sm.id_modificacion = ? AND sm.estado = 'PENDIENTE'`,
            [id]
        );
        if (!m) falla(404, 'La solicitud de modificación no existe o ya fue atendida.');
        await ejecutar("UPDATE solicitud_modificacion SET estado = 'HECHA', atendida_por = ?, atendida_en = NOW() WHERE id_modificacion = ?", [
            u.id_empleado,
            id
        ]);
        await registrarEvento(pool, m!.id_solicitud, 'MODIF_HECHA', u.id_empleado);
        avisar('modificaciones');
        void enviarPush([m!.id_solicitante], 'Modificación aplicada', 'El supervisor actualizó tu reporte.');
        res.json({ ok: true });
    })
);
