import { Request, Response } from 'express';
import pool from '../config/db.js';

// ========================================================================
// 1. ENDPOINTS PARA LA MUCAMA (Gobernanza)
// Jerarquía: Realizan las solicitudes, se les asignan habitaciones
// ========================================================================

// GET /api/mucama/habitaciones - Lista habitaciones y su estado
export async function getHabitacionesMucama(_req: Request, res: Response) {
  try {
    const [habitaciones]: any = await pool.query(`
      SELECT 
        h.id_habitacion,
        h.numero,
        h.piso,
        h.tipo_hab,
        h.estado,
        b.bloque
      FROM habitacion h
      JOIN bloque b ON h.id_bloque = b.id_bloque
      ORDER BY b.bloque ASC, h.numero ASC;
    `);

    res.json({ status: 'success', habitaciones });
  } catch (error: any) {
    res.status(500).json({ status: 'error', mensaje: error.message });
  }
}

// POST /api/mucama/reportar - La mucama registra el problema indicando la habitación
// El sistema deduce automáticamente el bloque y piso (ej: Hab 354 -> Bloque 300, Piso 3)
export async function reportarFallaMucama(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    const { numero_habitacion, problema, id_empleado = 1 } = req.body;

    if (!numero_habitacion || !problema) {
      return res.status(400).json({ status: 'error', mensaje: 'Debes indicar el número de habitación y el problema.' });
    }

    await connection.beginTransaction();

    // 1. Calcular piso y bloque automáticamente a partir del número de habitación
    // Ej: "354" -> primer dígito es 3 -> piso 3, bloque 300
    const numLimpio = numero_habitacion.toString().replace(/\D/g, '');
    const primerDigito = parseInt(numLimpio.charAt(0), 10) || 1;
    const bloqueCalculado = primerDigito * 100;
    const pisoCalculado = primerDigito;

    // 2. Buscar o crear el bloque en la base de datos
    let [bloqueRows]: any = await connection.query(`SELECT id_bloque FROM bloque WHERE bloque = ? LIMIT 1`, [bloqueCalculado]);
    let idBloque: number;
    if (bloqueRows.length === 0) {
      const [newBloque]: any = await connection.query(`INSERT INTO bloque (bloque) VALUES (?)`, [bloqueCalculado]);
      idBloque = newBloque.insertId;
    } else {
      idBloque = bloqueRows[0].id_bloque;
    }

    // 3. Buscar o crear la habitación
    let [habRows]: any = await connection.query(`SELECT id_habitacion FROM habitacion WHERE numero = ? LIMIT 1`, [numero_habitacion]);
    let idHabitacion: number;
    if (habRows.length === 0) {
      const [newHab]: any = await connection.query(
        `INSERT INTO habitacion (id_bloque, numero, piso, tipo_hab, estado) VALUES (?, ?, ?, 'Standard', FALSE)`,
        [idBloque, numero_habitacion, pisoCalculado]
      );
      idHabitacion = newHab.insertId;
    } else {
      idHabitacion = habRows[0].id_habitacion;
      // Actualizar estado de la habitación a FALSE (con falla / mantenimiento)
      await connection.query(`UPDATE habitacion SET estado = FALSE WHERE id_habitacion = ?`, [idHabitacion]);
    }

    // 4. Crear la Solicitud
    const [solicitudResult]: any = await connection.query(`
      INSERT INTO solicitud (id_empleado, fecha, hora_inicial, problema)
      VALUES (?, CURDATE(), CURTIME(), ?);
    `, [id_empleado, problema]);

    const idSolicitud = solicitudResult.insertId;

    // 5. Vincular Solicitud con Habitación en solicitud_habitacion
    await connection.query(`
      INSERT INTO solicitud_habitacion (id_solicitud, id_habitacion)
      VALUES (?, ?);
    `, [idSolicitud, idHabitacion]);

    await connection.commit();

    res.json({
      status: 'success',
      mensaje: `Solicitud registrada exitosamente para la Habitación ${numero_habitacion} (Bloque ${bloqueCalculado}, Piso ${pisoCalculado})`,
      id_solicitud: idSolicitud,
      habitacion: {
        id_habitacion: idHabitacion,
        numero: numero_habitacion,
        bloque: bloqueCalculado,
        piso: pisoCalculado
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al registrar solicitud de mucama:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  } finally {
    connection.release();
  }
}

// ========================================================================
// 2. ENDPOINTS PARA EL TÉCNICO
// Jerarquía: Reciben solicitudes de las mucamas, generan asignaciones (reportes),
// determinan atributos del incidente y materiales usados.
// ========================================================================

// GET /api/tecnico/solicitudes-pendientes - Solicitudes de mucamas esperando atención
export async function getSolicitudesParaTecnico(_req: Request, res: Response) {
  try {
    const [solicitudes]: any = await pool.query(`
      SELECT 
        s.id_solicitud,
        s.fecha,
        s.hora_inicial,
        s.problema,
        h.id_habitacion,
        h.numero AS numero_habitacion,
        h.piso,
        b.bloque,
        h.tipo_hab,
        emp.nombre AS mucama_nombre,
        emp.apellido AS mucama_apellido,
        i.id_incidente,
        i.id_prioridad,
        ei.estado AS incidente_resuelto,
        a.id_asignacion
      FROM solicitud s
      JOIN empleado emp ON s.id_empleado = emp.id_empleado
      JOIN solicitud_habitacion sh ON s.id_solicitud = sh.id_solicitud
      JOIN habitacion h ON sh.id_habitacion = h.id_habitacion
      JOIN bloque b ON h.id_bloque = b.id_bloque
      LEFT JOIN incidente i ON s.id_solicitud = i.id_solicitud
      LEFT JOIN estado_incidente ei ON i.id_estado = ei.id_estado
      LEFT JOIN asignacion a ON i.id_asignacion = a.id_asignacion
      ORDER BY s.id_solicitud DESC;
    `);

    // Catálogo de materiales y tipos de incidente para el formulario del técnico
    const [materiales]: any = await pool.query(`SELECT id_material, nombre_mat FROM material ORDER BY nombre_mat ASC;`);
    const [tipos]: any = await pool.query(`
      SELECT ti.id_tipo_incidente, ti.descripcion, e.nombre_especialidad 
      FROM tipo_incidente ti
      JOIN especialidad e ON ti.id_especialidad = e.id_especialidad;
    `);

    res.json({
      status: 'success',
      solicitudes,
      catalogo_materiales: materiales,
      catalogo_tipos_incidente: tipos
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', mensaje: error.message });
  }
}

// POST /api/tecnico/atender-solicitud - El técnico toma la solicitud, define atributos del incidente y materiales
export async function atenderSolicitudTecnico(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    const {
      id_solicitud,
      id_empleado_tecnico = 2, // Jorge Paredes por defecto
      id_tipo_incidente = 5,   // Tipo de avería
      nivel_prioridad = 1,     // 1: Alta, 2: Media, 3: Baja
      observaciones_tecnico,
      materiales = []          // Array: [{ id_material, cantidad }]
    } = req.body;

    if (!id_solicitud) {
      return res.status(400).json({ status: 'error', mensaje: 'Se requiere id_solicitud' });
    }

    await connection.beginTransaction();

    // 1. Crear Asignación para el técnico
    const [asigResult]: any = await connection.query(`
      INSERT INTO asignacion (id_empleado, fecha_asignacion, hora_asignacion, observaciones)
      VALUES (?, CURDATE(), CURTIME(), ?);
    `, [id_empleado_tecnico, observaciones_tecnico || 'Atendido por técnico de turno']);

    const idAsignacion = asigResult.insertId;

    // 2. Registrar materiales utilizados (si especificó alguno)
    if (Array.isArray(materiales) && materiales.length > 0) {
      for (const m of materiales) {
        if (m.id_material && m.cantidad > 0) {
          await connection.query(`
            INSERT INTO asignacion_material (id_asignacion, id_material, cantidad)
            VALUES (?, ?, ?);
          `, [idAsignacion, m.id_material, m.cantidad]);
        }
      }
    }

    // 3. Crear o actualizar el Incidente
    // id_supervisor = 1, id_estado = 1 (En proceso / FALSE)
    const [incResult]: any = await connection.query(`
      INSERT INTO incidente (id_tipo_incidente, id_asignacion, id_solicitud, id_supervisor, id_prioridad, id_estado, observacion)
      VALUES (?, ?, ?, 1, ?, 1, ?);
    `, [id_tipo_incidente, idAsignacion, id_solicitud, nivel_prioridad, observaciones_tecnico || 'Reporte técnico en proceso']);

    await connection.commit();

    res.json({
      status: 'success',
      mensaje: 'Asignación e incidente creados con éxito por el técnico 🔧',
      id_asignacion: idAsignacion,
      id_incidente: incResult.insertId
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al atender solicitud:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  } finally {
    connection.release();
  }
}

// PATCH /api/tecnico/finalizar-tarea - El técnico da por concluida la reparación
export async function finalizarTareaTecnico(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    const { id_asignacion, id_incidente, id_habitacion } = req.body;

    await connection.beginTransaction();

    // 1. Registrar fecha_fin y hora_fin en la asignación
    if (id_asignacion) {
      await connection.query(`
        UPDATE asignacion 
        SET fecha_fin = CURDATE(), hora_fin = CURTIME()
        WHERE id_asignacion = ?;
      `, [id_asignacion]);
    }

    // 2. Cambiar estado_incidente a Resuelto (id_estado = 2)
    if (id_incidente) {
      await connection.query(`
        UPDATE incidente 
        SET id_estado = 2
        WHERE id_incidente = ?;
      `, [id_incidente]);
    }

    // 3. Restaurar habitación a Operativa (estado = TRUE)
    if (id_habitacion) {
      await connection.query(`
        UPDATE habitacion 
        SET estado = TRUE 
        WHERE id_habitacion = ?;
      `, [id_habitacion]);
    }

    await connection.commit();

    res.json({
      status: 'success',
      mensaje: 'Reparación finalizada. Habitación liberada y marcada como operativa ✅'
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ status: 'error', mensaje: error.message });
  } finally {
    connection.release();
  }
}

// ========================================================================
// 3. ENDPOINTS PARA EL SUPERVISOR (Acceso Global y Rack)
// Jerarquía: Tiene acceso a incidentes (resumen general), solicitudes y asignaciones
// ========================================================================

export async function getDashboardSupervisor(_req: Request, res: Response) {
  try {
    // 1. Resumen de habitaciones (Operativas vs En Mantenimiento)
    const [habStats]: any = await pool.query(`
      SELECT 
        COUNT(*) AS total_habitaciones,
        SUM(CASE WHEN estado = TRUE THEN 1 ELSE 0 END) AS operativas,
        SUM(CASE WHEN estado = FALSE THEN 1 ELSE 0 END) AS en_mantenimiento
      FROM habitacion;
    `);

    // 2. Rack de Habitaciones completo agrupado por bloques y pisos
    const [habitaciones]: any = await pool.query(`
      SELECT 
        h.id_habitacion,
        h.numero,
        h.piso,
        h.tipo_hab,
        h.estado,
        b.bloque,
        s.id_solicitud,
        s.problema,
        s.fecha AS fecha_solicitud,
        s.hora_inicial,
        i.id_incidente,
        i.observacion AS incidente_observacion,
        p.nivel_prioridad,
        ei.estado AS incidente_resuelto,
        ti.descripcion AS tipo_incidente_desc,
        esp.nombre_especialidad,
        emp_tec.nombre AS tecnico_nombre,
        emp_tec.apellido AS tecnico_apellido,
        a.id_asignacion
      FROM habitacion h
      JOIN bloque b ON h.id_bloque = b.id_bloque
      LEFT JOIN solicitud_habitacion sh ON h.id_habitacion = sh.id_habitacion
      LEFT JOIN solicitud s ON sh.id_solicitud = s.id_solicitud
      LEFT JOIN incidente i ON s.id_solicitud = i.id_solicitud
      LEFT JOIN tipo_incidente ti ON i.id_tipo_incidente = ti.id_tipo_incidente
      LEFT JOIN especialidad esp ON ti.id_especialidad = esp.id_especialidad
      LEFT JOIN prioridad p ON i.id_prioridad = p.id_prioridad
      LEFT JOIN estado_incidente ei ON i.id_estado = ei.id_estado
      LEFT JOIN asignacion a ON i.id_asignacion = a.id_asignacion
      LEFT JOIN empleado emp_tec ON a.id_empleado = emp_tec.id_empleado
      ORDER BY b.bloque DESC, h.numero ASC;
    `);

    // 3. Resumen general de incidentes (con materiales usados)
    const [incidentes]: any = await pool.query(`
      SELECT 
        i.id_incidente,
        i.observacion,
        p.nivel_prioridad,
        ei.estado AS resuelto,
        ti.descripcion AS tipo_averia,
        esp.nombre_especialidad,
        s.id_solicitud,
        s.problema,
        s.fecha,
        s.hora_inicial,
        h.numero AS habitacion,
        b.bloque,
        emp_muc.nombre AS mucama_nombre,
        emp_tec.nombre AS tecnico_nombre,
        a.id_asignacion,
        a.fecha_asignacion,
        a.fecha_fin,
        (
          SELECT GROUP_CONCAT(CONCAT(m.nombre_mat, ' (x', am.cantidad, ')') SEPARATOR ', ')
          FROM asignacion_material am
          JOIN material m ON am.id_material = m.id_material
          WHERE am.id_asignacion = a.id_asignacion
        ) AS materiales_utilizados
      FROM incidente i
      JOIN solicitud s ON i.id_solicitud = s.id_solicitud
      JOIN empleado emp_muc ON s.id_empleado = emp_muc.id_empleado
      JOIN solicitud_habitacion sh ON s.id_solicitud = sh.id_solicitud
      JOIN habitacion h ON sh.id_habitacion = h.id_habitacion
      JOIN bloque b ON h.id_bloque = b.id_bloque
      JOIN tipo_incidente ti ON i.id_tipo_incidente = ti.id_tipo_incidente
      JOIN especialidad esp ON ti.id_especialidad = esp.id_especialidad
      JOIN prioridad p ON i.id_prioridad = p.id_prioridad
      JOIN estado_incidente ei ON i.id_estado = ei.id_estado
      LEFT JOIN asignacion a ON i.id_asignacion = a.id_asignacion
      LEFT JOIN empleado emp_tec ON a.id_empleado = emp_tec.id_empleado
      ORDER BY i.id_incidente DESC;
    `);

    // 4. Lista de Solicitudes puras
    const [solicitudes]: any = await pool.query(`
      SELECT 
        s.id_solicitud,
        s.fecha,
        s.hora_inicial,
        s.problema,
        emp.nombre AS reportado_por,
        h.numero AS habitacion,
        b.bloque
      FROM solicitud s
      JOIN empleado emp ON s.id_empleado = emp.id_empleado
      JOIN solicitud_habitacion sh ON s.id_solicitud = sh.id_solicitud
      JOIN habitacion h ON sh.id_habitacion = h.id_habitacion
      JOIN bloque b ON h.id_bloque = b.id_bloque
      ORDER BY s.id_solicitud DESC;
    `);

    // 5. Lista de Asignaciones puras
    const [asignaciones]: any = await pool.query(`
      SELECT 
        a.id_asignacion,
        a.fecha_asignacion,
        a.hora_asignacion,
        a.fecha_fin,
        a.hora_fin,
        a.observaciones,
        emp.nombre AS tecnico_nombre,
        emp.apellido AS tecnico_apellido
      FROM asignacion a
      JOIN empleado emp ON a.id_empleado = emp.id_empleado
      ORDER BY a.id_asignacion DESC;
    `);

    res.json({
      status: 'success',
      kpis: {
        total: habStats[0].total_habitaciones,
        operativas: habStats[0].operativas,
        mantenimiento: habStats[0].en_mantenimiento,
        porcentaje_ocupacion: 78
      },
      habitaciones,
      incidentes,
      solicitudes,
      asignaciones
    });
  } catch (error: any) {
    console.error('Error en dashboard supervisor:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  }
}
