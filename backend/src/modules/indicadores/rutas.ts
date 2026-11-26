// Indicadores para supervisión y gerencia. Todos los tiempos en minutos.
// GET /indicadores → JSON para el tablero · GET /indicadores/excel → mismo periodo, todos los datos en .xlsx
import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { filas, fila } from '../../db/pool.js';
import { ruta, validar } from '../../lib/http.js';
import { codigoEmpleado, codigoIncidente } from '../../domain/reglas.js';
import { permitir } from '../auth/auth.js';

export const rutasIndicadores = Router();

const esquemaPeriodo = z.object({ dias: z.coerce.number().int().min(1).max(365).default(30) });
const desde = 's.creada_en >= NOW() - INTERVAL ? DAY';

async function calcularIndicadores(dias: number) {
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
         WHERE ${desde} AND s.estado <> 'ANULADA' GROUP BY h.id_habitacion ORDER BY cantidad DESC, h.numero`,
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
         WHERE r.creado_en >= NOW() - INTERVAL ? DAY GROUP BY m.id_material ORDER BY cantidad DESC`,
        [dias]
    );
    const porDia = await filas(
        `SELECT DATE_FORMAT(s.creada_en, '%Y-%m-%d') AS dia, COUNT(*) AS reportadas, SUM(s.estado = 'RESUELTA') AS resueltas
         FROM solicitud s WHERE ${desde} AND s.estado <> 'ANULADA' GROUP BY dia ORDER BY dia`,
        [dias]
    );
    const stockBajo = await filas('SELECT nombre_mat AS nombre, unidad, stock FROM material WHERE activo AND stock IS NOT NULL AND stock <= 3 ORDER BY stock');
    return { dias, resumen, porEspecialidad, habitaciones, tecnicos, porTurno, materiales, porDia, stockBajo };
}

rutasIndicadores.get(
    '/',
    permitir('SUPERVISOR'),
    ruta(async (req, res) => {
        const { dias } = validar(esquemaPeriodo, req.query);
        const r = await calcularIndicadores(dias);
        // El tablero muestra solo los 10 primeros
        res.json({ ...r, habitaciones: r.habitaciones.slice(0, 10), materiales: r.materiales.slice(0, 10) });
    })
);

// ---------------------------------------------------------------------------
// Exportación a Excel
// ---------------------------------------------------------------------------
const PRIORIDAD = ['Urgente', 'Alta', 'Media', 'Baja'];
const ESTADO: Record<string, string> = {
    SIN_ASIGNAR: 'Sin asignar',
    ASIGNADA: 'Asignada',
    EN_PROCESO: 'En proceso',
    PENDIENTE: 'Pendiente',
    RESUELTA: 'Resuelta',
    ANULADA: 'Anulada'
};
const OCUPACION: Record<string, string> = { LIBRE: 'Libre', OCUPADA: 'Ocupada', RESERVADA: 'Reservada' };
const ROL: Record<string, string> = { MUCAMA: 'Mucama', TECNICO: 'Técnico', SUPERVISOR: 'Supervisor' };

type Columna = { titulo: string; clave: string; ancho?: number; formato?: string };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Excel no guarda zona horaria y ExcelJS escribe en UTC: se corre la fecha para que muestre la hora del hotel. */
const local = (v: unknown) => (v instanceof Date ? new Date(v.getTime() - v.getTimezoneOffset() * 60_000) : (v ?? null));

/** Hoja con encabezado fijo, filtros y anchos legibles. */
function hoja(libro: ExcelJS.Workbook, nombre: string, columnas: Columna[], datos: Record<string, unknown>[]) {
    const h = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
    h.columns = columnas.map(c => ({
        header: c.titulo,
        key: c.clave,
        width: c.ancho ?? Math.max(12, c.titulo.length + 2),
        style: c.formato ? { numFmt: c.formato } : {}
    }));
    h.addRows(datos);
    const enc = h.getRow(1);
    enc.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    enc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E46' } };
    enc.alignment = { vertical: 'middle', wrapText: true };
    if (datos.length) h.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
    return h;
}

const FECHA = 'dd/mm/yyyy hh:mm';

rutasIndicadores.get(
    '/excel',
    permitir('SUPERVISOR'),
    ruta(async (req, res) => {
        const { dias } = validar(esquemaPeriodo, req.query);
        const ind = await calcularIndicadores(dias);

        const incidentes = await filas(
            `SELECT s.id_solicitud, s.creada_en, h.numero, b.bloque, h.piso, th.nombre AS tipo_habitacion, s.problema, s.ocupacion,
                    s.nivel_prioridad, s.estado, CONCAT(m.nombre, ' ', m.apellido) AS mucama, tm.nombre AS turno_mucama,
                    CONCAT(t.nombre, ' ', t.apellido) AS tecnico, es.nombre_especialidad AS especialidad, d.nombre AS dificultad,
                    a.asignada_en, a.iniciada_en, a.finalizada_en,
                    TIMESTAMPDIFF(MINUTE, s.creada_en, a.asignada_en) AS min_asignar,
                    IF(s.estado = 'RESUELTA', TIMESTAMPDIFF(MINUTE, s.creada_en, a.finalizada_en), NULL) AS min_resolver,
                    IF(s.estado = 'RESUELTA', TIMESTAMPDIFF(MINUTE, COALESCE(a.iniciada_en, a.asignada_en), a.finalizada_en), NULL) AS min_reparacion,
                    (SELECT COUNT(*) FROM solicitud_evento ev WHERE ev.id_solicitud = s.id_solicitud AND ev.tipo = 'REITERADA') AS veces_reiterada,
                    ur.resultado AS ultimo_resultado, ur.observacion AS ultima_observacion, ur.motivo_pendiente
             FROM solicitud s
             JOIN habitacion h ON h.id_habitacion = s.id_habitacion JOIN bloque b ON b.id_bloque = h.id_bloque
             LEFT JOIN tipo_habitacion th ON th.id_tipo_hab = h.id_tipo_hab
             JOIN empleado m ON m.id_empleado = s.id_empleado LEFT JOIN turno tm ON tm.id_turno = m.id_turno
             LEFT JOIN asignacion a ON a.id_solicitud = s.id_solicitud
             LEFT JOIN empleado t ON t.id_empleado = a.id_tecnico
             LEFT JOIN especialidad es ON es.id_especialidad = a.id_especialidad
             LEFT JOIN dificultad d ON d.id_dificultad = a.id_dificultad
             LEFT JOIN reporte ur ON ur.id_reporte = (SELECT MAX(r.id_reporte) FROM reporte r WHERE r.id_asignacion = a.id_asignacion)
             WHERE ${desde} ORDER BY s.creada_en DESC`,
            [dias]
        );
        const usoMateriales = await filas(
            `SELECT a.id_solicitud, r.creado_en, CONCAT(e.nombre, ' ', e.apellido) AS autor, h.numero, mt.nombre_mat, rm.cantidad, mt.unidad
             FROM reporte_material rm JOIN reporte r USING (id_reporte) JOIN asignacion a USING (id_asignacion)
             JOIN solicitud s ON s.id_solicitud = a.id_solicitud JOIN habitacion h ON h.id_habitacion = s.id_habitacion
             JOIN material mt ON mt.id_material = rm.id_material JOIN empleado e ON e.id_empleado = r.id_autor
             WHERE r.creado_en >= NOW() - INTERVAL ? DAY ORDER BY r.creado_en DESC`,
            [dias]
        );
        const inventario = await filas('SELECT nombre_mat, unidad, stock, activo FROM material ORDER BY nombre_mat');
        const personal = await filas(
            `SELECT e.id_empleado, e.nombre, e.apellido, e.ci, e.telefono, e.rol, ee.nombre_estado AS estado, t.nombre AS turno,
                    TIME_FORMAT(COALESCE(e.hora_entrada, t.hora_inicio), '%H:%i') AS entrada,
                    TIME_FORMAT(COALESCE(e.hora_salida, t.hora_fin), '%H:%i') AS salida,
                    (SELECT GROUP_CONCAT(es.nombre_especialidad ORDER BY es.nombre_especialidad SEPARATOR ', ')
                       FROM tecnico_especialidad te JOIN especialidad es USING (id_especialidad) WHERE te.id_empleado = e.id_empleado) AS especialidades
             FROM empleado e JOIN estado_empleado ee USING (id_estado_empleado) LEFT JOIN turno t USING (id_turno)
             ORDER BY e.rol, e.nombre`
        );

        const libro = new ExcelJS.Workbook();
        libro.creator = 'Hotel Cortez · Mantenimiento';
        libro.created = new Date();

        const r = ind.resumen || {};
        const resumen = hoja(
            libro,
            'Resumen',
            [
                { titulo: 'Indicador', clave: 'k', ancho: 44 },
                { titulo: 'Valor', clave: 'v', ancho: 18 }
            ],
            [
                { k: 'Periodo', v: `Últimos ${dias} días` },
                { k: 'Generado', v: local(new Date()) },
                { k: 'Incidentes reportados (sin anulados)', v: num(r.total) ?? 0 },
                { k: 'Resueltos', v: num(r.resueltas) ?? 0 },
                { k: 'Abiertos', v: num(r.abiertas) ?? 0 },
                { k: 'Pendientes', v: num(r.pendientes) ?? 0 },
                { k: 'Prioritarios (Urgente/Alta)', v: num(r.prioritarias) ?? 0 },
                { k: 'Minutos promedio hasta asignar', v: num(r.min_hasta_asignar) },
                { k: 'Minutos promedio hasta iniciar', v: num(r.min_hasta_iniciar) },
                { k: 'Minutos promedio hasta resolver', v: num(r.min_hasta_resolver) },
                { k: 'MTTR: minutos promedio de reparación', v: num(r.mttr) },
                ...ind.porTurno.map(t => ({ k: `Incidentes en turno ${t.turno}`, v: num(t.cantidad) }))
            ]
        );
        resumen.getCell('B3').numFmt = FECHA;

        hoja(
            libro,
            'Incidentes',
            [
                { titulo: 'Código', clave: 'codigo', ancho: 10 },
                { titulo: 'Fecha', clave: 'creada_en', ancho: 17, formato: FECHA },
                { titulo: 'Habitación', clave: 'numero' },
                { titulo: 'Bloque', clave: 'bloque', ancho: 9 },
                { titulo: 'Piso', clave: 'piso', ancho: 7 },
                { titulo: 'Tipo de habitación', clave: 'tipo_habitacion', ancho: 22 },
                { titulo: 'Problema', clave: 'problema', ancho: 45 },
                { titulo: 'Ocupación', clave: 'ocupacion' },
                { titulo: 'Prioridad', clave: 'prioridad' },
                { titulo: 'Estado', clave: 'estado' },
                { titulo: 'Reportada de nuevo (veces)', clave: 'veces_reiterada' },
                { titulo: 'Mucama', clave: 'mucama', ancho: 24 },
                { titulo: 'Turno mucama', clave: 'turno_mucama' },
                { titulo: 'Técnico', clave: 'tecnico', ancho: 24 },
                { titulo: 'Especialidad', clave: 'especialidad', ancho: 20 },
                { titulo: 'Dificultad', clave: 'dificultad' },
                { titulo: 'Asignada', clave: 'asignada_en', ancho: 17, formato: FECHA },
                { titulo: 'Iniciada', clave: 'iniciada_en', ancho: 17, formato: FECHA },
                { titulo: 'Finalizada', clave: 'finalizada_en', ancho: 17, formato: FECHA },
                { titulo: 'Min. hasta asignar', clave: 'min_asignar' },
                { titulo: 'Min. hasta resolver', clave: 'min_resolver' },
                { titulo: 'Min. de reparación', clave: 'min_reparacion' },
                { titulo: 'Último resultado', clave: 'ultimo_resultado' },
                { titulo: 'Observación', clave: 'ultima_observacion', ancho: 40 },
                { titulo: 'Motivo pendiente', clave: 'motivo_pendiente', ancho: 30 }
            ],
            incidentes.map(i => ({
                ...i,
                codigo: codigoIncidente(i.id_solicitud),
                creada_en: local(i.creada_en),
                asignada_en: local(i.asignada_en),
                iniciada_en: local(i.iniciada_en),
                finalizada_en: local(i.finalizada_en),
                ocupacion: OCUPACION[i.ocupacion] ?? i.ocupacion,
                prioridad: PRIORIDAD[i.nivel_prioridad] ?? i.nivel_prioridad,
                estado: ESTADO[i.estado] ?? i.estado,
                veces_reiterada: num(i.veces_reiterada),
                ultimo_resultado: i.ultimo_resultado === 'HECHO' ? 'Hecho' : i.ultimo_resultado === 'PENDIENTE' ? 'Pendiente' : null
            }))
        );

        hoja(
            libro,
            'Materiales usados',
            [
                { titulo: 'Incidente', clave: 'codigo', ancho: 10 },
                { titulo: 'Fecha del reporte', clave: 'creado_en', ancho: 17, formato: FECHA },
                { titulo: 'Habitación', clave: 'numero' },
                { titulo: 'Reportado por', clave: 'autor', ancho: 24 },
                { titulo: 'Material', clave: 'nombre_mat', ancho: 32 },
                { titulo: 'Cantidad', clave: 'cantidad' },
                { titulo: 'Unidad', clave: 'unidad' }
            ],
            usoMateriales.map(m => ({ ...m, codigo: codigoIncidente(m.id_solicitud), creado_en: local(m.creado_en), cantidad: num(m.cantidad) }))
        );

        hoja(
            libro,
            'Técnicos',
            [
                { titulo: 'Técnico', clave: 'nombre', ancho: 26 },
                { titulo: 'Turno', clave: 'turno' },
                { titulo: 'Resueltas', clave: 'resueltas' },
                { titulo: 'Activas', clave: 'activas' },
                { titulo: 'MTTR (min)', clave: 'mttr' }
            ],
            ind.tecnicos.map(t => ({ ...t, resueltas: num(t.resueltas), activas: num(t.activas), mttr: num(t.mttr) }))
        );

        hoja(
            libro,
            'Por especialidad',
            [
                { titulo: 'Especialidad', clave: 'nombre', ancho: 26 },
                { titulo: 'Incidentes', clave: 'cantidad' },
                { titulo: 'MTTR (min)', clave: 'mttr' }
            ],
            ind.porEspecialidad.map(e => ({ ...e, cantidad: num(e.cantidad), mttr: num(e.mttr) }))
        );

        hoja(
            libro,
            'Habitaciones',
            [
                { titulo: 'Habitación', clave: 'numero' },
                { titulo: 'Bloque', clave: 'bloque' },
                { titulo: 'Incidentes', clave: 'cantidad' }
            ],
            ind.habitaciones.map(h => ({ ...h, cantidad: num(h.cantidad) }))
        );

        hoja(
            libro,
            'Por día',
            [
                { titulo: 'Día', clave: 'dia', ancho: 12 },
                { titulo: 'Reportadas', clave: 'reportadas' },
                { titulo: 'Resueltas', clave: 'resueltas' }
            ],
            ind.porDia.map(d => ({ ...d, reportadas: num(d.reportadas), resueltas: num(d.resueltas) }))
        );

        hoja(
            libro,
            'Inventario',
            [
                { titulo: 'Material', clave: 'nombre_mat', ancho: 32 },
                { titulo: 'Unidad', clave: 'unidad' },
                { titulo: 'Stock actual', clave: 'stock' },
                { titulo: `Usado en ${dias} días`, clave: 'usado' },
                { titulo: 'Estado', clave: 'estado', ancho: 16 }
            ],
            inventario.map(m => {
                const stock = num(m.stock);
                return {
                    ...m,
                    stock: stock ?? 'Sin control',
                    usado: num(ind.materiales.find(x => x.nombre === m.nombre_mat)?.cantidad) ?? 0,
                    estado: !m.activo ? 'Inactivo' : stock !== null && stock <= 3 ? 'Stock bajo' : 'Normal'
                };
            })
        );

        hoja(
            libro,
            'Personal',
            [
                { titulo: 'Código', clave: 'codigo', ancho: 10 },
                { titulo: 'Nombre', clave: 'nombre_completo', ancho: 26 },
                { titulo: 'CI', clave: 'ci' },
                { titulo: 'Teléfono', clave: 'telefono' },
                { titulo: 'Cargo', clave: 'cargo' },
                { titulo: 'Estado', clave: 'estado', ancho: 22 },
                { titulo: 'Turno', clave: 'turno' },
                { titulo: 'Entrada', clave: 'entrada', ancho: 9 },
                { titulo: 'Salida', clave: 'salida', ancho: 9 },
                { titulo: 'Especialidades', clave: 'especialidades', ancho: 36 }
            ],
            personal.map(p => ({ ...p, codigo: codigoEmpleado(p.id_empleado), nombre_completo: `${p.nombre} ${p.apellido}`, cargo: ROL[p.rol] ?? p.rol }))
        );

        const archivo = `indicadores-hotel-cortez-${dias}d-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
        res.send(Buffer.from(await libro.xlsx.writeBuffer()));
    })
);
