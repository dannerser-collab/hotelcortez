// Indicadores para supervisión y gerencia. Todos los tiempos en minutos.
import { Router } from 'express';
import { z } from 'zod';
import { filas, fila } from '../../db/pool.js';
import { ruta, validar } from '../../lib/http.js';
import { permitir } from '../auth/auth.js';

export const rutasIndicadores = Router();

rutasIndicadores.get('/', permitir('SUPERVISOR'), ruta(async (req, res) => {
    const { dias } = validar(z.object({ dias: z.coerce.number().int().min(1).max(365).default(30) }), req.query);
    const desde = 's.creada_en >= NOW() - INTERVAL ? DAY';

    const resumen = await fila(
        `SELECT COUNT(*) AS total,
            SUM(s.estado = 'RESUELTA') AS resueltas,
            SUM(s.estado IN ('SIN_ASIGNAR','ASIGNADA','EN_PROCESO','PENDIENTE')) AS abiertas,
            SUM(s.estado = 'PENDIENTE') AS pendientes,
            SUM(s.nivel_prioridad <= 1) AS prioritarias,
            ROUND(AVG(TIMESTAMPDIFF(MINUTE, s.creada_en, a.asignada_en))) AS min_hasta_asignar,
            ROUND(AVG(TIMESTAMPDIFF(MINUTE, s.creada_en, a.iniciada_en))) AS min_hasta_iniciar,
            ROUND(AVG(IF(s.estado = 'RESUELTA', TIMESTAMPDIFF(MINUTE, s.creada_en, a.finalizada_en), NULL))) AS min_hasta_resolver,
            ROUND(AVG(IF(s.estado = 'RESUELTA', TIMESTAMPDIFF(MINUTE, COALESCE(a.iniciada_en, a.asignada_en), a.finalizada_en), NULL))) AS mttr
         FROM solicitud s LEFT JOIN asignacion a USING (id_solicitud)
         WHERE ${desde} AND s.estado <> 'ANULADA'`,
        [dias]
    );
    const porEspecialidad = await filas(
        `SELECT COALESCE(e.nombre_especialidad, 'Sin especialidad') AS nombre, COUNT(*) AS cantidad,
            ROUND(AVG(IF(s.estado = 'RESUELTA', TIMESTAMPDIFF(MINUTE, COALESCE(a.iniciada_en, a.asignada_en), a.finalizada_en), NULL))) AS mttr
         FROM solicitud s JOIN asignacion a USING (id_solicitud) LEFT JOIN especialidad e USING (id_especialidad)
         WHERE ${desde} GROUP BY nombre ORDER BY cantidad DESC`,
        [dias]
    );
    const habitaciones = await filas(
        `SELECT h.numero, b.bloque, COUNT(*) AS cantidad FROM solicitud s JOIN habitacion h USING (id_habitacion) JOIN bloque b USING (id_bloque)
         WHERE ${desde} AND s.estado <> 'ANULADA' GROUP BY h.id_habitacion ORDER BY cantidad DESC, h.numero LIMIT 10`,
        [dias]
    );
    const tecnicos = await filas(
        `SELECT CONCAT(t.nombre, ' ', t.apellido) AS nombre, tu.nombre AS turno,
            SUM(s.estado = 'RESUELTA') AS resueltas,
            SUM(s.estado IN ('ASIGNADA','EN_PROCESO','PENDIENTE')) AS activas,
            ROUND(AVG(IF(s.estado = 'RESUELTA', TIMESTAMPDIFF(MINUTE, COALESCE(a.iniciada_en, a.asignada_en), a.finalizada_en), NULL))) AS mttr
         FROM asignacion a JOIN solicitud s USING (id_solicitud) JOIN empleado t ON t.id_empleado = a.id_tecnico
         LEFT JOIN turno tu ON tu.id_turno = t.id_turno
         WHERE ${desde} GROUP BY t.id_empleado ORDER BY resueltas DESC`,
        [dias]
    );
    const porTurno = await filas(
        `SELECT CASE WHEN HOUR(s.creada_en) >= 6 AND HOUR(s.creada_en) < 14 THEN 'Mañana'
                     WHEN HOUR(s.creada_en) >= 14 AND HOUR(s.creada_en) < 22 THEN 'Tarde' ELSE 'Noche' END AS turno,
            COUNT(*) AS cantidad
         FROM solicitud s WHERE ${desde} AND s.estado <> 'ANULADA' GROUP BY turno`,
        [dias]
    );
    const materiales = await filas(
        `SELECT m.nombre_mat AS nombre, m.unidad, SUM(rm.cantidad) AS cantidad, m.stock
         FROM reporte_material rm JOIN material m USING (id_material) JOIN reporte r USING (id_reporte)
         WHERE r.creado_en >= NOW() - INTERVAL ? DAY GROUP BY m.id_material ORDER BY cantidad DESC LIMIT 10`,
        [dias]
    );
    const porDia = await filas(
        `SELECT DATE_FORMAT(s.creada_en, '%Y-%m-%d') AS dia, COUNT(*) AS reportadas, SUM(s.estado = 'RESUELTA') AS resueltas
         FROM solicitud s WHERE ${desde} AND s.estado <> 'ANULADA' GROUP BY dia ORDER BY dia`,
        [dias]
    );
    const stockBajo = await filas('SELECT nombre_mat AS nombre, unidad, stock FROM material WHERE activo AND stock IS NOT NULL AND stock <= 3 ORDER BY stock');
    res.json({ dias, resumen, porEspecialidad, habitaciones, tecnicos, porTurno, materiales, porDia, stockBajo });
}));
