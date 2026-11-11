import { Request, Response } from 'express';
import pool from '../config/db.js';

// GET /api/solicitudes/formulario-camarera - Catálogos necesarios para armar la vista móvil
export async function getFormularioCamarera(_req: Request, res: Response) {
  try {
    // 1. Obtener Habitaciones disponibles para reportar
    const [habitaciones]: any = await pool.query(`
      SELECT 
        id_ubicacion, 
        identificador AS numero, 
        piso, 
        descripcion, 
        estado_operativo,
        CASE 
          WHEN piso = 1 THEN 'Bloque 100'
          WHEN piso = 2 THEN 'Bloque 200'
          WHEN piso = 4 THEN 'Bloque 400'
          ELSE 'Otros Bloques'
        END AS bloque
      FROM ubicacion
      WHERE tipo = 'HABITACION'
      ORDER BY piso ASC, identificador ASC;
    `);

    // 2. Obtener Especialidades / Categorías (con mapeo de iconos para la UI)
    const [especialidades]: any = await pool.query(`
      SELECT id_especialidad, nombre_especialidad FROM especialidad;
    `);

    // 3. Obtener Prioridades
    const [prioridades]: any = await pool.query(`
      SELECT id_prioridad, nombre, nivel_prioridad, tiempo_objetivo_horas
      FROM prioridad
      ORDER BY nivel_prioridad ASC;
    `);

    res.json({
      status: 'success',
      bloques_disponibles: ['Bloque 100', 'Bloque 400', 'Bloque 500', 'Cowork'],
      habitaciones,
      categorias: especialidades.map((e: any) => ({
        id: e.id_especialidad,
        nombre: e.nombre_especialidad,
        icono: e.id_especialidad === 1 ? 'droplet' :
               e.id_especialidad === 3 ? 'snowflake' :
               e.id_especialidad === 2 ? 'zap' : 'more-horizontal'
      })),
      prioridades: prioridades.map((p: any) => ({
        id: p.id_prioridad,
        nombre: p.nombre,
        nivel: p.nivel_prioridad,
        tiempo_sla_horas: p.tiempo_objetivo_horas,
        bloquea_checkin: p.nivel_prioridad === 1
      }))
    });
  } catch (error: any) {
    console.error('Error al cargar formulario de camarera:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  }
}

// POST /api/solicitudes/reportar - Botón "Enviar Reporte" de la camarera
export async function crearReporteCamarera(req: Request, res: Response) {
  const connection = await pool.getConnection();
  try {
    const { 
      id_empleado_solicitante = 3, // Por defecto María Fernanda
      id_ubicacion, 
      id_especialidad, 
      problema_reportado, 
      id_prioridad = 1,
      foto_url = null 
    } = req.body;

    if (!id_ubicacion || !problema_reportado) {
      return res.status(400).json({ status: 'error', mensaje: 'Faltan datos requeridos (habitación o problema)' });
    }

    // Iniciar transacción SQL para garantizar que solicitud e incidente se creen juntos
    await connection.beginTransaction();

    // 1. Insertar Solicitud
    const [solicitudResult]: any = await connection.query(`
      INSERT INTO solicitud (id_empleado_solicitante, id_ubicacion, canal_reporte, problema_reportado, foto_evidencia_url)
      VALUES (?, ?, 'APP_MOVIL', ?, ?);
    `, [id_empleado_solicitante, id_ubicacion, problema_reportado, foto_url]);

    const idSolicitud = solicitudResult.insertId;

    // 2. Determinar tipo de incidente por especialidad o genérico
    const [tipoRows]: any = await connection.query(`
      SELECT id_tipo_incidente FROM tipo_incidente WHERE id_especialidad = ? LIMIT 1;
    `, [id_especialidad || 3]);

    const idTipo = tipoRows.length > 0 ? tipoRows[0].id_tipo_incidente : 1;

    // 3. Insertar Incidente Técnico
    const [incidenteResult]: any = await connection.query(`
      INSERT INTO incidente (id_solicitud, id_tipo_incidente, id_prioridad, id_estado, id_supervisor, observacion)
      VALUES (?, ?, ?, 1, 2, 'Reportado vía App Móvil Gobernanza');
    `, [idSolicitud, idTipo, id_prioridad]);

    // 4. Si la prioridad es Alta/Emergencia (nivel 1), cambiar estado de habitación a BLOQUEADA_MANTENIMIENTO
    if (Number(id_prioridad) === 1) {
      await connection.query(`
        UPDATE ubicacion SET estado_operativo = 'BLOQUEADA_MANTENIMIENTO' WHERE id_ubicacion = ?;
      `, [id_ubicacion]);
    }

    await connection.commit();

    res.json({
      status: 'success',
      mensaje: 'Reporte registrado y enviado a Supervisión sin WhatsApp ✅',
      ticket: {
        id_solicitud: idSolicitud,
        id_incidente: incidenteResult.insertId,
        codigo_ticket: `#TK-${incidenteResult.insertId}`
      }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error al registrar reporte:', error);
    res.status(500).json({ status: 'error', mensaje: error.message });
  } finally {
    connection.release();
  }
}

