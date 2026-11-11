import { Request, Response } from 'express';
import pool from '../config/db.js';

// GET /api/tecnicos/sugeridos - Devuelve los técnicos para el panel lateral de asignación de PC
export async function getTecnicosSugeridos(req: Request, res: Response) {
  try {
    const { especialidad_id } = req.query;

    // Consulta de técnicos con conteo de tareas activas
    const [tecnicos]: any = await pool.query(`
      SELECT 
        e.id_empleado,
        e.nombre,
        c.nombre_cargo,
        COALESCE(esp.nombre_especialidad, 'General') AS especialidad_nombre,
        COALESCE(esp.id_especialidad, 0) AS id_especialidad,
        (
          SELECT COUNT(*)
          FROM asignacion a
          JOIN incidente inc ON a.id_incidente = inc.id_incidente
          WHERE a.id_tecnico = e.id_empleado AND inc.id_estado IN (2, 3)
        ) AS tareas_activas
      FROM empleado e
      JOIN cargo c ON e.id_cargo = c.id_cargo
      LEFT JOIN especialidad esp ON c.nombre_cargo LIKE CONCAT('%', esp.nombre_especialidad, '%')
      WHERE e.rol_sistema = 'TECNICO'
      ORDER BY tareas_activas ASC, e.nombre ASC;
    `);

    // Mapear si es sugerido según la especialidad de la avería
    const formateados = tecnicos.map((t: any) => ({
      id: t.id_empleado,
      nombre: t.nombre,
      cargo: t.nombre_cargo,
      tareas_activas: t.tareas_activas,
      turno: 'Turno Mañana',
      sugerido: especialidad_id ? Number(t.id_especialidad) === Number(especialidad_id) : t.tareas_activas === 0
    }));

    res.json({
      status: 'success',
      tecnicos: formateados
    });
  } catch (error: any) {
    console.error('Error al obtener técnicos sugeridos:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  }
}

// POST /api/tecnicos/asignar - Asigna técnico a la habitación desde el panel de PC
export async function asignarTecnicoAHabitacion(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    const { id_incidente, id_tecnico, observaciones } = req.body;

    if (!id_incidente || !id_tecnico) {
      return res.status(400).json({ status: 'error', mensaje: 'Faltan parámetros requeridos' });
    }

    await connection.beginTransaction();

    // 1. Crear asignación
    const [asigResult]: any = await connection.query(`
      INSERT INTO asignacion (id_incidente, id_tecnico, observaciones)
      VALUES (?, ?, ?);
    `, [id_incidente, id_tecnico, observaciones || 'Asignado desde panel de supervisión']);

    // 2. Cambiar estado del incidente a 'Asignado' (id_estado = 2)
    await connection.query(`
      UPDATE incidente SET id_estado = 2 WHERE id_incidente = ?;
    `, [id_incidente]);

    await connection.commit();

    res.json({
      status: 'success',
      mensaje: 'Técnico asignado exitosamente a la habitación 🛠️',
      id_asignacion: asigResult.insertId
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al asignar técnico:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  } finally {
    connection.release();
  }
}

