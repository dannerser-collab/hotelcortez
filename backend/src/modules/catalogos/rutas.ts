// Catálogos que la interfaz necesita (se cargan una vez y se refrescan solo cuando cambian).
import { Router } from 'express';
import { filas } from '../../db/pool.js';
import { ruta } from '../../lib/http.js';
import { env } from '../../config/env.js';
import { pushActivo } from '../../lib/push.js';
import { enTurno, turnoActual, codigoEmpleado } from '../../domain/reglas.js';
import { usuario } from '../auth/auth.js';

export const rutasCatalogos = Router();

const hora = (t: string) => String(t).slice(0, 5);

rutasCatalogos.get('/', ruta(async (_req, res) => {
    const u = usuario(res);
    const turnos = (await filas('SELECT id_turno, codigo, nombre, hora_inicio, hora_fin FROM turno ORDER BY id_turno')).map(t => ({
        ...t,
        hora_inicio: hora(t.hora_inicio),
        hora_fin: hora(t.hora_fin)
    }));
    const actual = turnoActual(turnos);
    const habitaciones = await filas(
        `SELECT h.id_habitacion, h.numero, h.piso, b.bloque, h.estado AS operativa, h.id_tipo_hab, th.nombre AS tipo_habitacion,
                h.id_mucama, CONCAT(m.nombre, ' ', m.apellido) AS mucama,
                (SELECT COUNT(*) FROM solicitud s WHERE s.id_habitacion = h.id_habitacion AND s.estado IN ('SIN_ASIGNAR','ASIGNADA','EN_PROCESO','PENDIENTE')) AS abiertas
         FROM habitacion h JOIN bloque b USING (id_bloque) LEFT JOIN tipo_habitacion th USING (id_tipo_hab)
         LEFT JOIN empleado m ON m.id_empleado = h.id_mucama
         ${u.rol === 'MUCAMA' ? 'WHERE h.id_mucama = ?' : ''} ORDER BY b.bloque, h.numero`,
        u.rol === 'MUCAMA' ? [u.id_empleado] : []
    );
    const tecnicos =
        u.rol === 'MUCAMA'
            ? []
            : (
                  await filas(
                      `SELECT e.id_empleado, e.nombre, e.apellido, t.codigo AS turno, t.hora_inicio, t.hora_fin,
                        (SELECT COUNT(*) FROM asignacion a JOIN solicitud s USING (id_solicitud)
                         WHERE a.id_tecnico = e.id_empleado AND s.estado IN ('ASIGNADA','EN_PROCESO','PENDIENTE')) AS activos
                       FROM empleado e LEFT JOIN turno t USING (id_turno)
                       WHERE e.rol = 'TECNICO' AND e.id_estado_empleado = 1 ORDER BY t.id_turno, e.nombre`
                  )
              ).map(t => ({
                  ...t,
                  codigo: codigoEmpleado(t.id_empleado),
                  de_turno: t.hora_inicio ? enTurno({ hora_inicio: hora(t.hora_inicio), hora_fin: hora(t.hora_fin) }) : false,
                  hora_inicio: undefined,
                  hora_fin: undefined
              }));
    const mucamas =
        u.rol === 'SUPERVISOR'
            ? await filas(
                  `SELECT e.id_empleado, e.nombre, e.apellido, t.codigo AS turno FROM empleado e LEFT JOIN turno t USING (id_turno)
                   WHERE e.rol = 'MUCAMA' AND e.id_estado_empleado = 1 ORDER BY e.nombre`
              )
            : [];
    res.json({
        turnos,
        turno_actual: actual?.codigo ?? null,
        habitaciones,
        bloques: (await filas('SELECT bloque FROM bloque ORDER BY bloque')).map(b => b.bloque),
        tipos_habitacion: await filas('SELECT id_tipo_hab, nombre FROM tipo_habitacion ORDER BY nombre'),
        especialidades: await filas('SELECT id_especialidad, nombre_especialidad AS nombre FROM especialidad ORDER BY nombre_especialidad'),
        dificultades: await filas('SELECT id_dificultad, nombre FROM dificultad ORDER BY orden'),
        materiales: u.rol === 'MUCAMA' ? [] : await filas('SELECT id_material, nombre_mat AS nombre, unidad, stock, activo FROM material ORDER BY nombre_mat'),
        tecnicos,
        mucamas,
        push: pushActivo ? env.vapid.publica : null
    });
}));
