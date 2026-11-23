// Consultas compartidas sobre solicitudes/incidentes.
// Toda la información de un incidente sale de VISTA_SOLICITUD: si se agrega un campo,
// se agrega aquí y queda disponible para todos los roles.
import type { PoolConnection } from 'mysql2/promise';
import { filas, fila, ejecutar, type Conexion } from '../../db/pool.js';
import { falla } from '../../lib/http.js';
import { codigoIncidente, ESTADOS_ABIERTOS, type EstadoSolicitud } from '../../domain/reglas.js';
import type { Usuario } from '../auth/auth.js';

export const VISTA_SOLICITUD = `
SELECT s.id_solicitud, s.problema, s.ocupacion, s.nivel_prioridad, s.estado, s.creada_en, s.actualizada_en, s.foto,
       h.id_habitacion, h.numero, h.piso, b.bloque, th.nombre AS tipo_habitacion,
       s.id_empleado AS id_mucama, CONCAT(m.nombre, ' ', m.apellido) AS mucama, tm.codigo AS turno_mucama,
       a.id_asignacion, a.id_tecnico, CONCAT(t.nombre, ' ', t.apellido) AS tecnico,
       a.asignado_por, CONCAT(sp.nombre, ' ', sp.apellido) AS asignado_por_nombre,
       a.asignada_en, a.iniciada_en, a.finalizada_en, a.diagnostico,
       a.id_dificultad, d.nombre AS dificultad, a.id_especialidad, es.nombre_especialidad AS especialidad,
       ur.id_reporte AS id_ultimo_reporte, ur.resultado AS ultimo_resultado, ur.observacion AS ultima_observacion,
       ur.motivo_pendiente, ur.creado_en AS ultimo_reporte_en,
       (SELECT GROUP_CONCAT(CONCAT(mt.nombre_mat, ' ×', TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM rm.cantidad))) SEPARATOR ', ')
          FROM reporte r2 JOIN reporte_material rm USING (id_reporte) JOIN material mt USING (id_material)
          WHERE r2.id_asignacion = a.id_asignacion) AS materiales
FROM solicitud s
JOIN habitacion h ON h.id_habitacion = s.id_habitacion
JOIN bloque b ON b.id_bloque = h.id_bloque
LEFT JOIN tipo_habitacion th ON th.id_tipo_hab = h.id_tipo_hab
JOIN empleado m ON m.id_empleado = s.id_empleado
LEFT JOIN turno tm ON tm.id_turno = m.id_turno
LEFT JOIN asignacion a ON a.id_solicitud = s.id_solicitud
LEFT JOIN empleado t ON t.id_empleado = a.id_tecnico
LEFT JOIN empleado sp ON sp.id_empleado = a.asignado_por
LEFT JOIN dificultad d ON d.id_dificultad = a.id_dificultad
LEFT JOIN especialidad es ON es.id_especialidad = a.id_especialidad
LEFT JOIN reporte ur ON ur.id_reporte = (SELECT MAX(r.id_reporte) FROM reporte r WHERE r.id_asignacion = a.id_asignacion)`;

export type FiltrosSolicitud = {
    estado?: string;
    bloque?: number;
    texto?: string;
    historial?: boolean;
    limite?: number;
};

/** Qué puede ver cada rol. */
function alcance(u: Usuario): { where: string; params: unknown[] } {
    if (u.rol === 'MUCAMA') return { where: 's.id_empleado = ?', params: [u.id_empleado] };
    if (u.rol === 'TECNICO')
        return { where: "(a.id_tecnico = ? OR (s.estado = 'SIN_ASIGNAR' AND s.nivel_prioridad >= 2))", params: [u.id_empleado] };
    return { where: '1 = 1', params: [] };
}

function presentar(f: any) {
    return { ...f, codigo: codigoIncidente(f.id_solicitud), tiene_foto: Boolean(f.foto) };
}

export async function listarSolicitudes(u: Usuario, f: FiltrosSolicitud = {}) {
    const { where, params } = alcance(u);
    const cond = [where];
    const p: unknown[] = [...params];
    if (f.estado) {
        cond.push('s.estado = ?');
        p.push(f.estado);
    } else if (!f.historial) {
        // Por defecto: abiertas + cerradas de las últimas 48 h (lista liviana)
        cond.push(`(s.estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')}) OR s.actualizada_en >= NOW() - INTERVAL 48 HOUR OR s.creada_en >= NOW() - INTERVAL 48 HOUR)`);
        p.push(...ESTADOS_ABIERTOS);
    }
    if (f.bloque) {
        cond.push('b.bloque = ?');
        p.push(f.bloque);
    }
    if (f.texto) {
        cond.push("CONCAT_WS(' ', h.numero, s.problema, m.nombre, m.apellido, t.nombre, t.apellido) LIKE ?");
        p.push('%' + f.texto + '%');
    }
    const limite = Math.min(Math.max(f.limite || 300, 1), 1000);
    const r = await filas(
        `${VISTA_SOLICITUD} WHERE ${cond.join(' AND ')}
         ORDER BY FIELD(s.estado, 'SIN_ASIGNAR','PENDIENTE','ASIGNADA','EN_PROCESO','RESUELTA','ANULADA'), s.nivel_prioridad, s.creada_en DESC
         LIMIT ${limite}`,
        p
    );
    return r.map(presentar);
}

export async function obtenerSolicitud(u: Usuario, id: number) {
    const { where, params } = alcance(u);
    const s = await fila(`${VISTA_SOLICITUD} WHERE s.id_solicitud = ? AND ${where}`, [id, ...params]);
    if (!s) falla(404, 'Solicitud no encontrada.');
    const reportes = await filas(
        `SELECT r.*, CONCAT(e.nombre, ' ', e.apellido) AS autor, e.rol AS rol_autor
         FROM reporte r JOIN asignacion a USING (id_asignacion) JOIN empleado e ON e.id_empleado = r.id_autor
         WHERE a.id_solicitud = ? ORDER BY r.id_reporte`,
        [id]
    );
    const materiales = reportes.length
        ? await filas(
              `SELECT rm.id_reporte, rm.id_material, m.nombre_mat, m.unidad, rm.cantidad
               FROM reporte_material rm JOIN material m USING (id_material) WHERE rm.id_reporte IN (?)`,
              [reportes.map(r => r.id_reporte)]
          )
        : [];
    const modificaciones = reportes.length
        ? await filas(
              `SELECT sm.*, CONCAT(e.nombre, ' ', e.apellido) AS solicitante, CONCAT(x.nombre, ' ', x.apellido) AS atendida_por_nombre
               FROM solicitud_modificacion sm JOIN empleado e ON e.id_empleado = sm.id_solicitante
               LEFT JOIN empleado x ON x.id_empleado = sm.atendida_por
               WHERE sm.id_reporte IN (?) ORDER BY sm.id_modificacion`,
              [reportes.map(r => r.id_reporte)]
          )
        : [];
    const eventos = await filas(
        `SELECT ev.tipo, ev.detalle, ev.creado_en, CONCAT(e.nombre, ' ', e.apellido) AS empleado
         FROM solicitud_evento ev LEFT JOIN empleado e ON e.id_empleado = ev.id_empleado
         WHERE ev.id_solicitud = ? ORDER BY ev.id_evento`,
        [id]
    );
    return {
        ...presentar(s),
        reportes: reportes.map(r => ({ ...r, materiales: materiales.filter(m => m.id_reporte === r.id_reporte) })),
        modificaciones,
        eventos
    };
}

/** Bloquea la solicitud (FOR UPDATE) y devuelve sus datos básicos + asignación. */
export async function bloquearSolicitud(c: PoolConnection, id: number) {
    const s = await fila<{
        id_solicitud: number;
        id_empleado: number;
        id_habitacion: number;
        estado: EstadoSolicitud;
        nivel_prioridad: number;
        foto: string | null;
        id_asignacion: number | null;
        id_tecnico: number | null;
        iniciada_en: Date | null;
        numero: string;
    }>(
        `SELECT s.id_solicitud, s.id_empleado, s.id_habitacion, s.estado, s.nivel_prioridad, s.foto,
                a.id_asignacion, a.id_tecnico, a.iniciada_en, h.numero
         FROM solicitud s JOIN habitacion h USING (id_habitacion)
         LEFT JOIN asignacion a ON a.id_solicitud = s.id_solicitud
         WHERE s.id_solicitud = ? FOR UPDATE`,
        [id],
        c
    );
    if (!s) falla(404, 'Solicitud no encontrada.');
    return s!;
}

export async function registrarEvento(c: Conexion, idSolicitud: number, tipo: string, idEmpleado: number | null, detalle: string | null = null) {
    await ejecutar('INSERT INTO solicitud_evento (id_solicitud, tipo, id_empleado, detalle) VALUES (?, ?, ?, ?)', [idSolicitud, tipo, idEmpleado, detalle?.slice(0, 500) ?? null], c);
}

/** La habitación queda operativa solo si no le quedan solicitudes abiertas. */
export async function actualizarHabitacion(c: Conexion, idHabitacion: number) {
    await ejecutar(
        `UPDATE habitacion SET estado = NOT EXISTS (
            SELECT 1 FROM solicitud WHERE id_habitacion = ? AND estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')}))
         WHERE id_habitacion = ?`,
        [idHabitacion, ...ESTADOS_ABIERTOS, idHabitacion],
        c
    );
}
