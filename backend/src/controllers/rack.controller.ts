import { Request, Response } from 'express';
import pool from '../config/db.js';

// GET /api/rack - Devuelve las habitaciones agrupadas y el resumen para la pantalla de PC
export async function getRackHabitaciones(_req: Request, res: Response) {
  try {
    // 1. Resumen de estados para la barra superior
    const [stats]: any = await pool.query(`
      SELECT 
        COUNT(*) AS total_habitaciones,
        SUM(CASE WHEN estado_operativo = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativas,
        SUM(CASE WHEN estado_operativo = 'BLOQUEADA_MANTENIMIENTO' THEN 1 ELSE 0 END) AS mantenimiento
      FROM ubicacion
      WHERE tipo = 'HABITACION';
    `);

    // 2. Total con solicitud pendiente
    const [pendientesCount]: any = await pool.query(`
      SELECT COUNT(DISTINCT i.id_incidente) AS pendientes
      FROM incidente i
      JOIN estado_incidente ei ON i.id_estado = ei.id_estado
      WHERE ei.nombre_estado IN ('Pendiente', 'Asignado');
    `);

    // 3. Consultar todas las habitaciones con su posible incidente activo
    const [habitaciones]: any = await pool.query(`
      SELECT 
        u.id_ubicacion,
        u.identificador AS numero_hab,
        u.piso,
        u.descripcion,
        u.estado_operativo,
        i.id_incidente,
        i.id_tipo_incidente,
        ti.nombre_tipo AS tipo_averia,
        ti.codigo AS codigo_averia,
        e.nombre_especialidad AS especialidad,
        p.nombre AS prioridad_nombre,
        p.nivel_prioridad,
        ei.nombre_estado AS estado_incidente,
        s.problema_reportado,
        emp.nombre AS reportado_por,
        s.fecha_reporte
      FROM ubicacion u
      LEFT JOIN solicitud s ON u.id_ubicacion = s.id_ubicacion
      LEFT JOIN incidente i ON s.id_solicitud = i.id_solicitud
      LEFT JOIN tipo_incidente ti ON i.id_tipo_incidente = ti.id_tipo_incidente
      LEFT JOIN especialidad e ON ti.id_especialidad = e.id_especialidad
      LEFT JOIN prioridad p ON i.id_prioridad = p.id_prioridad
      LEFT JOIN estado_incidente ei ON i.id_estado = ei.id_estado
      LEFT JOIN empleado emp ON s.id_empleado_solicitante = emp.id_empleado
      WHERE u.tipo = 'HABITACION'
      ORDER BY u.piso DESC, u.identificador ASC;
    `);

    // Agrupar habitaciones por piso para el Rack
    const pisosAgrupados: { [key: number]: any[] } = {};
    for (const hab of habitaciones) {
      const pisoNum = hab.piso || 1;
      if (!pisosAgrupados[pisoNum]) {
        pisosAgrupados[pisoNum] = [];
      }
      pisosAgrupados[pisoNum].push({
        id: hab.id_ubicacion,
        numero: hab.numero_hab,
        piso: hab.piso,
        descripcion: hab.descripcion,
        estado_operativo: hab.estado_operativo,
        incidente: hab.id_incidente ? {
          id: hab.id_incidente,
          codigo: `#TK-${hab.id_incidente}`,
          codigo_averia: hab.codigo_averia,
          tipo_averia: hab.tipo_averia,
          especialidad: hab.especialidad,
          prioridad: hab.prioridad_nombre,
          nivel_prioridad: hab.nivel_prioridad,
          estado: hab.estado_incidente,
          detalle: hab.problema_reportado,
          reportado_por: hab.reportado_por,
          fecha: hab.fecha_reporte
        } : null
      });
    }

    res.json({
      status: 'success',
      resumen_kpis: {
        total_habitaciones: stats[0].total_habitaciones,
        operativas: stats[0].operativas,
        pendientes: pendientesCount[0].pendientes || 0,
        mantenimiento: stats[0].mantenimiento,
        porcentaje_ocupacion: 78
      },
      pisos: pisosAgrupados
    });
  } catch (error: any) {
    console.error('Error al obtener rack de habitaciones:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  }
}

