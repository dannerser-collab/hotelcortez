import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import pool from './config/db.js';

export const betaRouter = Router();

type Usuario = {
    id_empleado: number;
    nombre: string;
    apellido: string;
    rol: string;
};

// Limpieza preventiva por si algún texto en la BD quedó con codificación CP850/Latin1 de consola
function fixEncoding(val: any): any {
    if (typeof val === 'string') {
        return val
            .replace(/Mar├â┬¡a/g, 'María')
            .replace(/L├â┬│pez/g, 'López')
            .replace(/├â┬¡/g, 'í')
            .replace(/├â┬│/g, 'ó')
            .replace(/├â┬á/g, 'á')
            .replace(/├â┬©/g, 'é')
            .replace(/├â┬║/g, 'ú')
            .replace(/├â┬±/g, 'ñ')
            .replace(/├óÔé¼ÔÇØ/g, '—')
            .replace(/Ã­/g, 'í')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã±/g, 'ñ');
    }
    if (Array.isArray(val)) return val.map(fixEncoding);
    if (val && typeof val === 'object' && !(val instanceof Date)) {
        const out: any = {};
        for (const [k, v] of Object.entries(val)) out[k] = fixEncoding(v);
        return out;
    }
    return val;
}

// ---------------------------------------------------------------------------
// Migración aditiva automática (equivalente a database/04_turnos_prioridad.sql)
// ---------------------------------------------------------------------------
export async function ensureSchema() {
    await pool.query('INSERT INTO prioridad (nivel_prioridad) SELECT 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM prioridad WHERE nivel_prioridad = 0)');
    await pool.query(`CREATE TABLE IF NOT EXISTS beta_empleado_turno (
        id_empleado INT PRIMARY KEY,
        turno ENUM('MANANA','TARDE','NOCHE') NOT NULL DEFAULT 'MANANA',
        CONSTRAINT fk_beta_turno_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS beta_solicitud_ocupacion (
        id_solicitud INT PRIMARY KEY,
        ocupacion ENUM('VACIA','OCUPADA','RESERVADA') NULL,
        nivel_prioridad INT NOT NULL DEFAULT 2,
        tecnico_asignado INT NULL,
        asignado_por INT NULL,
        fecha_asignado DATETIME NULL,
        CONSTRAINT fk_beta_ocup_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
        CONSTRAINT fk_beta_ocup_tecnico FOREIGN KEY (tecnico_asignado) REFERENCES empleado(id_empleado),
        CONSTRAINT fk_beta_ocup_asignador FOREIGN KEY (asignado_por) REFERENCES empleado(id_empleado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`INSERT IGNORE INTO beta_empleado_turno (id_empleado, turno)
        SELECT id_empleado, CASE id_empleado WHEN 2 THEN 'MANANA' WHEN 3 THEN 'TARDE' WHEN 4 THEN 'NOCHE' ELSE 'MANANA' END
        FROM empleado WHERE rol = 'TECNICO'`);
}

const TURNOS = ['MANANA', 'TARDE', 'NOCHE'];

// Mañana 06:00-13:59, Tarde 14:00-21:59, Noche 22:00-05:59 (hora local del servidor)
function turnoActual(date = new Date()) {
    const h = date.getHours();
    if (h >= 6 && h < 14) return 'MANANA';
    if (h >= 14 && h < 22) return 'TARDE';
    return 'NOCHE';
}

// Estado de la habitación -> prioridad. 0 Urgente, 1 Alta, 2 Media, 3 Baja
function prioridadPorOcupacion(ocupacion: string, nivelVacia: any) {
    if (ocupacion === 'OCUPADA') return 0;
    if (ocupacion === 'RESERVADA') return 1;
    const n = Number(nivelVacia);
    return n === 3 ? 3 : 2;
}

const sessions = new Map<string, {
    user: Usuario;
    expires: number;
}>();

const wrap = (fn: (req: Request, res: Response) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
};

function fail(status: number, message: string): never {
    throw Object.assign(new Error(message), { status });
}

function roles(...allowed: string[]) {
    return (_req: Request, res: Response, next: NextFunction) => {
        if (!allowed.includes(res.locals.user.rol))
            return next(Object.assign(new Error('Tu rol no tiene permiso para esta operación.'), { status: 403 }));
        next();
    };
}

const id = (value: any) => {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1)
        fail(400, 'Identificador inválido.');
    return n;
};

betaRouter.post('/auth/login', wrap(async (req, res) => {
    const password = String(req.body.password || '');
    const expected = process.env.BETA_PASSWORD || 'admin123';
    if (password.length > 100 || Buffer.byteLength(password) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(password), Buffer.from(expected)))
        fail(401, 'ID o contraseña incorrectos.');
    const [rows]: any = await pool.query('SELECT id_empleado, nombre, apellido, rol FROM empleado WHERE id_empleado = ? AND id_estado_empleado = 1', [id(req.body.id)]);
    const user = fixEncoding(rows[0]);
    if (!user || !['MUCAMA', 'TECNICO', 'SUPERVISOR'].includes(user.rol))
        fail(401, 'ID o contraseña incorrectos.');
    for (const [key, s] of sessions)
        if (s.expires <= Date.now())
            sessions.delete(key);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { user, expires: Date.now() + 28800000 });
    res.json({ token, user });
}));

betaRouter.use((req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '') || '';
    const s = sessions.get(token);
    if (!s || s.expires < Date.now()) {
        sessions.delete(token);
        res.status(401).json({ mensaje: 'Inicia sesión para continuar.' });
        return;
    }
    pool.query('SELECT id_empleado,nombre,apellido,rol FROM empleado WHERE id_empleado=? AND id_estado_empleado=1', [s.user.id_empleado]).then(([rows]: any) => {
        if (!rows.length) {
            res.status(401).json({ mensaje: 'Cuenta inactiva.' });
            return;
        }
        res.locals.user = fixEncoding(rows[0]);
        res.locals.token = token;
        next();
    }).catch(next);
});

betaRouter.get('/auth/me', (_req, res) => {
    res.json({ user: res.locals.user });
});

betaRouter.post('/auth/logout', (_req, res) => {
    sessions.delete(res.locals.token);
    res.json({ ok: true });
});

betaRouter.get('/datos', wrap(async (_req, res) => {
    const user: Usuario = res.locals.user;
    const [habitaciones]: any = await pool.query(`SELECT h.*, b.bloque, bm.id_empleado AS mucama_id FROM habitacion h JOIN bloque b USING(id_bloque) LEFT JOIN beta_habitacion_mucama bm USING(id_habitacion) ${user.rol === 'MUCAMA' ? 'WHERE bm.id_empleado=?' : ''} ORDER BY b.bloque, h.numero`, user.rol === 'MUCAMA' ? [user.id_empleado] : []);
    const [solicitudes]: any = await pool.query(`SELECT s.*, f.foto, h.numero, h.piso, b.bloque, h.id_habitacion, CONCAT(e.nombre,' ',e.apellido) AS reportado_por,
 o.ocupacion, COALESCE(p.nivel_prioridad, o.nivel_prioridad, 2) AS nivel_solicitud, o.tecnico_asignado, o.fecha_asignado,
 CONCAT(ta.nombre,' ',ta.apellido) AS tecnico_asignado_nombre, CONCAT(ap.nombre,' ',ap.apellido) AS asignado_por_nombre,
 i.id_incidente, i.observacion, i.id_prioridad, p.nivel_prioridad, ei.estado AS resuelto, a.id_asignacion, a.id_empleado AS tecnico_id, a.fecha_fin, a.hora_fin, a.fecha_asignacion, a.hora_asignacion,
 CONCAT(t.nombre,' ',t.apellido) AS tecnico, ti.descripcion AS tipo_averia,
 (SELECT GROUP_CONCAT(CONCAT(m.nombre_mat,' (x',am.cantidad,')') SEPARATOR ', ') FROM asignacion_material am JOIN material m USING(id_material) WHERE am.id_asignacion=a.id_asignacion) AS materiales
 FROM solicitud s LEFT JOIN beta_solicitud_foto f USING(id_solicitud) JOIN empleado e ON e.id_empleado=s.id_empleado JOIN solicitud_habitacion sh USING(id_solicitud)
 LEFT JOIN beta_solicitud_ocupacion o ON o.id_solicitud=s.id_solicitud LEFT JOIN empleado ta ON ta.id_empleado=o.tecnico_asignado LEFT JOIN empleado ap ON ap.id_empleado=o.asignado_por
 JOIN habitacion h USING(id_habitacion) JOIN bloque b USING(id_bloque)
 LEFT JOIN incidente i USING(id_solicitud) LEFT JOIN prioridad p ON p.id_prioridad=i.id_prioridad LEFT JOIN estado_incidente ei ON ei.id_estado=i.id_estado
 LEFT JOIN asignacion a ON a.id_asignacion=i.id_asignacion LEFT JOIN empleado t ON t.id_empleado=a.id_empleado
 LEFT JOIN tipo_incidente ti ON ti.id_tipo_incidente=i.id_tipo_incidente
 ${user.rol === 'MUCAMA' ? 'WHERE s.id_empleado=?' : ''} ORDER BY s.id_solicitud DESC`, user.rol === 'MUCAMA' ? [user.id_empleado] : []);
    const [tipos] = await pool.query('SELECT * FROM tipo_incidente');
    const [materiales] = await pool.query('SELECT * FROM material ORDER BY nombre_mat');
    const [mucamas] = user.rol === 'SUPERVISOR' ? await pool.query("SELECT id_empleado,nombre,apellido FROM empleado WHERE rol='MUCAMA' AND id_estado_empleado=1") : [[]];
    const [tecnicos] = user.rol !== 'MUCAMA'
        ? await pool.query(`SELECT e.id_empleado, e.nombre, e.apellido, COALESCE(t.turno,'MANANA') AS turno,
            (SELECT COUNT(*) FROM incidente i JOIN asignacion a USING(id_asignacion) JOIN estado_incidente ei USING(id_estado) WHERE a.id_empleado=e.id_empleado AND ei.estado=FALSE) AS activos
            FROM empleado e LEFT JOIN beta_empleado_turno t USING(id_empleado) WHERE e.rol='TECNICO' AND e.id_estado_empleado=1 ORDER BY e.nombre`)
        : [[]];
    res.json(fixEncoding({ habitaciones, solicitudes, tipos, materiales, mucamas, tecnicos, turno_actual: turnoActual() }));
}));

async function transaction(fn: (c: any) => Promise<any>) {
    const c = await pool.getConnection();
    try {
        await c.beginTransaction();
        const result = await fn(c);
        await c.commit();
        return result;
    } catch (e) {
        await c.rollback();
        throw e;
    } finally {
        c.release();
    }
}

betaRouter.post('/mucama/reportar', roles('MUCAMA'), wrap(async (req, res) => {
    const numero = String(req.body.numero_habitacion || '').trim();
    const problema = String(req.body.problema || '').trim();
    const foto = String(req.body.foto || '');
    const ocupacion = String(req.body.ocupacion || '').toUpperCase();
    if (!['VACIA', 'OCUPADA', 'RESERVADA'].includes(ocupacion))
        fail(400, 'Indica si la habitación está vacía, ocupada o reservada.');
    const nivel = prioridadPorOcupacion(ocupacion, req.body.nivel_vacia);
    if (foto && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(foto) || foto.length > 2800000))
        fail(400, 'Foto inválida o mayor a 2 MB.');
    if (!numero || !problema || problema.length > 8000)
        fail(400, 'Ingresa el número de habitación y describe el problema (máximo 8000 caracteres).');
    const result = await transaction(async (c) => {
        let [h]: any = await c.query('SELECT id_habitacion, id_bloque, piso FROM habitacion WHERE numero=? FOR UPDATE', [numero]);
        if (!h.length) {
            if (!/^[1-9]\d{2}$/.test(numero))
                fail(404, 'La habitación no existe.');
            const piso = Number(numero[0]);
            const bloqueNum = piso * 100;
            const [b]: any = await c.query('SELECT id_bloque FROM bloque WHERE bloque=? FOR UPDATE', [bloqueNum]);
            let idBloque = b[0]?.id_bloque;
            if (!idBloque) {
                const [insB]: any = await c.query('INSERT INTO bloque(bloque) VALUES(?)', [bloqueNum]);
                idBloque = insB.insertId;
            }
            const [insH]: any = await c.query('INSERT INTO habitacion(id_bloque,numero,piso,tipo_hab,estado) VALUES(?,?,?,?,FALSE)', [idBloque, numero, piso, 'Standard']);
            await c.query('INSERT INTO beta_habitacion_mucama(id_habitacion,id_empleado) VALUES(?,?) ON DUPLICATE KEY UPDATE id_empleado=VALUES(id_empleado)', [insH.insertId, res.locals.user.id_empleado]);
            h = [{ id_habitacion: insH.insertId, id_bloque: idBloque, piso }];
        } else {
            const [owner]: any = await c.query('SELECT id_empleado FROM beta_habitacion_mucama WHERE id_habitacion=? FOR UPDATE', [h[0].id_habitacion]);
            if (owner.length && owner[0].id_empleado !== res.locals.user.id_empleado)
                fail(403, 'La habitación no está asignada a tu usuario.');
            if (!owner.length)
                await c.query('INSERT INTO beta_habitacion_mucama(id_habitacion,id_empleado) VALUES(?,?)', [h[0].id_habitacion, res.locals.user.id_empleado]);
        }
        const [s] = await c.query('INSERT INTO solicitud(id_empleado,fecha,hora_inicial,problema) VALUES(?,CURDATE(),CURTIME(),?)', [res.locals.user.id_empleado, problema]);
        if (foto)
            await c.query('INSERT INTO beta_solicitud_foto(id_solicitud,foto) VALUES(?,?)', [s.insertId, foto]);
        await c.query('INSERT INTO solicitud_habitacion VALUES(?,?)', [s.insertId, h[0].id_habitacion]);
        await c.query('INSERT INTO beta_solicitud_ocupacion(id_solicitud,ocupacion,nivel_prioridad) VALUES(?,?,?)', [s.insertId, ocupacion, nivel]);
        await c.query('UPDATE habitacion SET estado=FALSE WHERE id_habitacion=?', [h[0].id_habitacion]);
        const piso = h[0].piso || Number(numero[0]) || 1;
        return { id_solicitud: s.insertId, numero, piso, bloque: piso * 100, nivel_prioridad: nivel };
    });
    res.status(201).json(result);
}));

betaRouter.post('/tecnico/atender', roles('TECNICO'), wrap(async (req, res) => {
    const solicitud = id(req.body.id_solicitud), tipo = id(req.body.id_tipo_incidente), prioridad = Number(req.body.nivel_prioridad);
    if (![0, 1, 2, 3].includes(prioridad))
        fail(400, 'Prioridad inválida.');
    const observacion = String(req.body.observaciones_tecnico || '').trim();
    if (!observacion || observacion.length > 8000)
        fail(400, 'Completa el diagnóstico (máximo 8000 caracteres).');
    const materiales = req.body.materiales || [];
    if (!Array.isArray(materiales) || materiales.length > 100)
        fail(400, 'Materiales inválidos.');
    const seen = new Set<string>();
    for (const m of materiales) {
        const cant = Number(m.cantidad);
        if (!Number.isInteger(cant) || cant < 1 || cant > 999)
            fail(400, 'La cantidad de cada material debe ser un número entero entre 1 y 999.');
        if (m.nombre !== undefined) {
            const nombre = String(m.nombre || '').trim();
            if (!nombre || nombre.length > 50)
                fail(400, 'Ingresa el nombre del material (máximo 50 caracteres).');
        } else {
            const key = 'id:' + id(m.id_material);
            if (seen.has(key))
                fail(400, 'Revisa los materiales y sus cantidades.');
            seen.add(key);
        }
    }
    const result = await transaction(async (c) => {
        const [s] = await c.query('SELECT id_solicitud FROM solicitud WHERE id_solicitud=? FOR UPDATE', [solicitud]);
        if (!s.length)
            fail(404, 'Solicitud no encontrada.');
        const [existing] = await c.query('SELECT id_incidente FROM incidente WHERE id_solicitud=?', [solicitud]);
        if (existing.length)
            fail(409, 'Otro técnico ya atendió esta solicitud. Actualiza la lista.');
        const [ocup]: any = await c.query('SELECT * FROM beta_solicitud_ocupacion WHERE id_solicitud=? FOR UPDATE', [solicitud]);
        const regla = ocup[0];
        const nivelSolicitud = regla ? Number(regla.nivel_prioridad) : null;
        const yo = res.locals.user.id_empleado;
        if (regla?.tecnico_asignado && regla.tecnico_asignado !== yo)
            fail(409, 'El jefe de mantenimiento asignó esta solicitud a otro técnico.');
        if (nivelSolicitud !== null && nivelSolicitud <= 1 && regla.tecnico_asignado !== yo)
            fail(403, 'Las solicitudes URGENTES y de prioridad ALTA las asigna el jefe de mantenimiento.');
        // Urgente/Alta: se respeta la prioridad definida por el estado de la habitación.
        // Media/Baja: el técnico puede ajustar entre Media y Baja.
        let prioridadFinal = prioridad;
        if (nivelSolicitud !== null && nivelSolicitud <= 1) prioridadFinal = nivelSolicitud;
        else if (![2, 3].includes(prioridad)) prioridadFinal = nivelSolicitud ?? 2;
        const [p] = await c.query('SELECT id_prioridad FROM prioridad WHERE nivel_prioridad=?', [prioridadFinal]);
        if (!p.length)
            fail(400, 'Prioridad inválida.');
        const [t] = await c.query('SELECT id_tipo_incidente FROM tipo_incidente WHERE id_tipo_incidente=?', [tipo]);
        if (!t.length)
            fail(400, 'Tipo inválido.');
        const [supervisor] = regla?.asignado_por
            ? await c.query('SELECT id_supervisor FROM supervisor WHERE id_empleado=?', [regla.asignado_por])
            : await c.query('SELECT s.id_supervisor FROM supervisor s JOIN empleado e USING(id_empleado) WHERE e.id_estado_empleado=1 ORDER BY s.id_supervisor LIMIT 1');
        if (!supervisor.length)
            fail(409, 'No hay supervisor activo.');
        const [a] = await c.query('INSERT INTO asignacion(id_empleado,fecha_asignacion,hora_asignacion,observaciones) VALUES(?,CURDATE(),CURTIME(),?)', [res.locals.user.id_empleado, observacion]);
        for (const m of materiales) {
            const cant = Number(m.cantidad);
            let matId: number;
            if (m.nombre !== undefined) {
                const nombre = String(m.nombre).trim();
                const [existingMat]: any = await c.query('SELECT id_material FROM material WHERE LOWER(nombre_mat) = LOWER(?) LIMIT 1 FOR UPDATE', [nombre]);
                if (existingMat.length) {
                    matId = existingMat[0].id_material;
                } else {
                    const [insMat]: any = await c.query('INSERT INTO material(nombre_mat) VALUES(?)', [nombre]);
                    matId = insMat.insertId;
                }
            } else {
                matId = id(m.id_material);
            }
            await c.query('INSERT INTO asignacion_material(id_asignacion,id_material,cantidad) VALUES(?,?,?) ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)', [a.insertId, matId, cant]);
        }
        const [i] = await c.query('INSERT INTO incidente(id_tipo_incidente,id_asignacion,id_solicitud,id_supervisor,id_prioridad,id_estado,observacion) VALUES(?,?,?,?,?,(SELECT id_estado FROM estado_incidente WHERE estado=FALSE LIMIT 1),?)', [tipo, a.insertId, solicitud, supervisor[0].id_supervisor, p[0].id_prioridad, observacion]);
        return { id_incidente: i.insertId };
    });
    res.status(201).json(result);
}));

betaRouter.patch('/tecnico/finalizar', roles('TECNICO'), wrap(async (req, res) => {
    await transaction(async (c) => {
        const [rows] = await c.query(`SELECT i.*,a.id_empleado,sh.id_habitacion,ei.estado FROM incidente i JOIN asignacion a USING(id_asignacion) JOIN solicitud_habitacion sh USING(id_solicitud) JOIN estado_incidente ei USING(id_estado) WHERE i.id_incidente=? FOR UPDATE`, [id(req.body.id_incidente)]);
        if (!rows.length)
            fail(404, 'Incidente no encontrado.');
        const i = rows[0];
        if (i.id_empleado !== res.locals.user.id_empleado)
            fail(403, 'Solo el técnico asignado puede finalizarlo.');
        if (i.estado)
            fail(409, 'El incidente ya fue resuelto.');
        await c.query('SELECT id_habitacion FROM habitacion WHERE id_habitacion=? FOR UPDATE', [i.id_habitacion]);
        await c.query('UPDATE incidente SET id_estado=(SELECT id_estado FROM estado_incidente WHERE estado=TRUE LIMIT 1) WHERE id_incidente=?', [i.id_incidente]);
        await c.query('UPDATE asignacion SET fecha_fin=CURDATE(),hora_fin=CURTIME() WHERE id_asignacion=?', [i.id_asignacion]);
        const [pending] = await c.query(`SELECT COUNT(*) AS n FROM solicitud_habitacion sh LEFT JOIN incidente i USING(id_solicitud) LEFT JOIN estado_incidente e USING(id_estado) WHERE sh.id_habitacion=? AND (i.id_incidente IS NULL OR e.estado=FALSE)`, [i.id_habitacion]);
        await c.query('UPDATE habitacion SET estado=? WHERE id_habitacion=?', [pending[0].n === 0, i.id_habitacion]);
    });
    res.json({ ok: true });
}));

betaRouter.post('/supervisor/asignar-habitacion', roles('SUPERVISOR'), wrap(async (req, res) => {
    const room = id(req.body.id_habitacion), employee = id(req.body.id_empleado);
    await transaction(async c => {
        const [h] = await c.query('SELECT id_habitacion FROM habitacion WHERE id_habitacion=? FOR UPDATE', [room]);
        if (!h.length) fail(404, 'Habitación no encontrada.');
        const [e] = await c.query("SELECT id_empleado FROM empleado WHERE id_empleado=? AND rol='MUCAMA' AND id_estado_empleado=1", [employee]);
        if (!e.length) fail(400, 'Selecciona una mucama activa.');
        await c.query('INSERT INTO beta_habitacion_mucama(id_habitacion,id_empleado) VALUES(?,?) ON DUPLICATE KEY UPDATE id_empleado=?', [room, employee, employee]);
    });
    res.json({ ok: true });
}));

// Jefe de mantenimiento: asigna una solicitud al técnico (normalmente al de turno)
betaRouter.post('/supervisor/asignar-tecnico', roles('SUPERVISOR'), wrap(async (req, res) => {
    const solicitud = id(req.body.id_solicitud), tecnico = id(req.body.id_empleado);
    await transaction(async c => {
        const [s] = await c.query('SELECT id_solicitud FROM solicitud WHERE id_solicitud=? FOR UPDATE', [solicitud]);
        if (!s.length) fail(404, 'Solicitud no encontrada.');
        const [inc] = await c.query('SELECT id_incidente FROM incidente WHERE id_solicitud=?', [solicitud]);
        if (inc.length) fail(409, 'Esta solicitud ya está siendo atendida por un técnico.');
        const [t] = await c.query("SELECT id_empleado FROM empleado WHERE id_empleado=? AND rol='TECNICO' AND id_estado_empleado=1", [tecnico]);
        if (!t.length) fail(400, 'Selecciona un técnico activo.');
        await c.query(`INSERT INTO beta_solicitud_ocupacion(id_solicitud,nivel_prioridad,tecnico_asignado,asignado_por,fecha_asignado) VALUES(?,2,?,?,NOW())
            ON DUPLICATE KEY UPDATE tecnico_asignado=VALUES(tecnico_asignado), asignado_por=VALUES(asignado_por), fecha_asignado=NOW()`,
            [solicitud, tecnico, res.locals.user.id_empleado]);
    });
    res.json({ ok: true });
}));

// Jefe de mantenimiento: define el turno (mañana / tarde / noche) de cada técnico
betaRouter.post('/supervisor/turno', roles('SUPERVISOR'), wrap(async (req, res) => {
    const tecnico = id(req.body.id_empleado);
    const turno = String(req.body.turno || '').toUpperCase();
    if (!TURNOS.includes(turno)) fail(400, 'Turno inválido.');
    const [t]: any = await pool.query("SELECT id_empleado FROM empleado WHERE id_empleado=? AND rol='TECNICO'", [tecnico]);
    if (!t.length) fail(400, 'Selecciona un técnico.');
    await pool.query('INSERT INTO beta_empleado_turno(id_empleado,turno) VALUES(?,?) ON DUPLICATE KEY UPDATE turno=VALUES(turno)', [tecnico, turno]);
    res.json({ ok: true });
}));
