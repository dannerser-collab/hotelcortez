import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { fila, ejecutar } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { falla, ruta, validar, texto } from '../../lib/http.js';
import { codigoEmpleado, idDesdeCodigo, type Rol } from '../../domain/reglas.js';
import { avisar } from '../../lib/tiempoReal.js';

export type Usuario = {
    id_empleado: number;
    codigo: string;
    nombre: string;
    apellido: string;
    rol: Rol;
    turno: string | null;
};

const HASH_FALSO = bcrypt.hashSync('sin-cuenta', 10);
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

const SQL_USUARIO = `SELECT e.id_empleado, e.nombre, e.apellido, e.rol, t.codigo AS turno
    FROM empleado e LEFT JOIN turno t USING (id_turno)`;

function aUsuario(f: any): Usuario {
    return { ...f, codigo: codigoEmpleado(f.id_empleado) };
}

/** Obtiene el usuario de una petición (cabecera Authorization: Bearer <token>). */
export async function usuarioDeToken(token: string): Promise<Usuario | null> {
    if (!token) return null;
    const f = await fila(
        `${SQL_USUARIO} JOIN sesion s USING (id_empleado)
         WHERE s.token_hash = ? AND s.expira_en > NOW() AND e.id_estado_empleado = 1`,
        [hash(token)]
    );
    return f ? aUsuario(f) : null;
}

export function tokenDe(req: Request) {
    return (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

/** Middleware: exige sesión válida y deja el usuario en res.locals.usuario. */
export function autenticar(req: Request, res: Response, next: NextFunction) {
    usuarioDeToken(tokenDe(req))
        .then(u => {
            if (!u) return res.status(401).json({ mensaje: 'Inicia sesión para continuar.' });
            res.locals.usuario = u;
            next();
        })
        .catch(next);
}

/** Middleware: restringe la ruta a ciertos roles. */
export const permitir =
    (...roles: Rol[]) =>
    (_req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(res.locals.usuario?.rol)) return next(Object.assign(new Error('Tu rol no tiene permiso para esta operación.'), { status: 403 }));
        next();
    };

export const usuario = (res: Response): Usuario => res.locals.usuario;

// ---------------------------------------------------------------------------
export const rutasAuth = Router();

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});

const esquemaLogin = z.object({
    codigo: z.union([z.string(), z.number()]).transform(v => String(v)),
    password: z.string().min(1, 'Ingresa tu contraseña.').max(100)
});

rutasAuth.post('/login', limiteLogin, ruta(async (req, res) => {
    const { codigo, password } = validar(esquemaLogin, req.body);
    const id = idDesdeCodigo(codigo);
    const f: any = id ? await fila(`${SQL_USUARIO.replace('SELECT', 'SELECT e.password_hash, e.id_estado_empleado,')} WHERE e.id_empleado = ?`, [id]) : null;
    // Se compara siempre para no revelar si el código existe
    const ok = await bcrypt.compare(password, f?.password_hash || HASH_FALSO);
    if (!f || !ok) falla(401, 'Código de empleado o contraseña incorrectos.');
    if (f.id_estado_empleado === 4) falla(403, 'Tu solicitud de acceso aún no fue aprobada por el supervisor.');
    if (f.id_estado_empleado !== 1) falla(403, 'Tu cuenta no está activa. Consulta con el supervisor.');
    const token = randomBytes(32).toString('hex');
    await ejecutar('DELETE FROM sesion WHERE expira_en <= NOW()');
    await ejecutar('INSERT INTO sesion (token_hash, id_empleado, expira_en) VALUES (?, ?, NOW() + INTERVAL ? HOUR)', [hash(token), f.id_empleado, env.sesionHoras]);
    const { password_hash, id_estado_empleado, ...datos } = f;
    res.json({ token, usuario: aUsuario(datos) });
}));

const esquemaRegistro = z.object({
    nombre: texto(60, 'el nombre'),
    apellido: texto(60, 'el apellido'),
    telefono: z.string().trim().regex(/^\+?\d{6,15}$/, 'Teléfono inválido.'),
    ci: z.string().trim().regex(/^[0-9A-Za-z-]{5,15}$/, 'CI inválido.'),
    rol: z.enum(['MUCAMA', 'TECNICO', 'SUPERVISOR'], { message: 'Elige un cargo.' }),
    turno: z.enum(['MANANA', 'TARDE', 'NOCHE'], { message: 'Elige un turno.' }),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').max(100)
});

/** Solicitud de acceso: crea la cuenta en estado "Pendiente de aprobación". */
rutasAuth.post('/registro', limiteLogin, ruta(async (req, res) => {
    const d = validar(esquemaRegistro, req.body);
    if (await fila('SELECT 1 FROM empleado WHERE ci = ?', [d.ci])) falla(409, 'Ya existe una cuenta con ese CI.');
    const area = d.rol === 'MUCAMA' ? 1 : d.rol === 'TECNICO' ? 2 : 3;
    const r = await ejecutar(
        `INSERT INTO empleado (id_area, id_estado_empleado, nombre, apellido, telefono, ci, rol, id_turno, password_hash)
         SELECT ?, 4, ?, ?, ?, ?, ?, id_turno, ? FROM turno WHERE codigo = ?`,
        [area, d.nombre, d.apellido, d.telefono, d.ci, d.rol, await bcrypt.hash(d.password, 10), d.turno]
    );
    avisar('personal');
    res.status(201).json({ codigo: codigoEmpleado(r.insertId), mensaje: 'Solicitud enviada. El supervisor debe aprobar tu acceso.' });
}));

rutasAuth.use(autenticar);

rutasAuth.get('/yo', (_req, res) => {
    res.json({ usuario: usuario(res) });
});

rutasAuth.post('/logout', ruta(async (req, res) => {
    await ejecutar('DELETE FROM sesion WHERE token_hash = ?', [hash(tokenDe(req))]);
    res.json({ ok: true });
}));

rutasAuth.post('/clave', ruta(async (req, res) => {
    const d = validar(z.object({ actual: z.string().min(1, 'Ingresa tu contraseña actual.'), nueva: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres.').max(100) }), req.body);
    const f = await fila<{ password_hash: string }>('SELECT password_hash FROM empleado WHERE id_empleado = ?', [usuario(res).id_empleado]);
    if (!f || !(await bcrypt.compare(d.actual, f.password_hash))) falla(400, 'La contraseña actual no es correcta.');
    await ejecutar('UPDATE empleado SET password_hash = ? WHERE id_empleado = ?', [await bcrypt.hash(d.nueva, 10), usuario(res).id_empleado]);
    // Cierra las demás sesiones
    await ejecutar('DELETE FROM sesion WHERE id_empleado = ? AND token_hash <> ?', [usuario(res).id_empleado, hash(tokenDe(req))]);
    res.json({ ok: true });
}));
