// Salud, tiempo real (SSE), fotos protegidas y suscripción a notificaciones push.
import { Router } from 'express';
import { z } from 'zod';
import { pool, ejecutar } from '../../db/pool.js';
import { migracionesPendientes } from '../../db/migrar.js';
import { ruta, validar } from '../../lib/http.js';
import { conectar } from '../../lib/tiempoReal.js';
import { rutaFoto } from '../../lib/fotos.js';
import { usuario } from '../auth/auth.js';

export const rutasPublicasSistema = Router();
export const rutasSistema = Router();

rutasPublicasSistema.get('/salud', ruta(async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        const pendientes = await migracionesPendientes();
        res.status(pendientes.length ? 503 : 200).json({
            mysql: true,
            migraciones_pendientes: pendientes,
            mensaje: pendientes.length ? 'Faltan migraciones: ejecuta "npm run migrar" en backend.' : 'OK'
        });
    } catch {
        res.status(503).json({ mysql: false, mensaje: 'No se pudo conectar con MySQL.' });
    }
}));

rutasSistema.get('/eventos', (_req, res) => conectar(res, usuario(res)));

rutasSistema.get('/fotos/:archivo', (req, res, next) => {
    try {
        res.set('Cache-Control', 'private, max-age=86400');
        res.sendFile(rutaFoto(req.params.archivo), err => err && next(Object.assign(new Error('Foto no encontrada.'), { status: 404 })));
    } catch (e) {
        next(e);
    }
});

const esquemaPush = z.object({
    endpoint: z.string().url().max(500),
    keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) })
});

rutasSistema.post('/push/suscribir', ruta(async (req, res) => {
    const s = validar(esquemaPush, req.body);
    await ejecutar(
        `INSERT INTO push_suscripcion (id_empleado, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id_empleado = VALUES(id_empleado), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
        [usuario(res).id_empleado, s.endpoint, s.keys.p256dh, s.keys.auth]
    );
    res.status(201).json({ ok: true });
}));

rutasSistema.post('/push/cancelar', ruta(async (req, res) => {
    const { endpoint } = validar(z.object({ endpoint: z.string().max(500) }), req.body);
    await ejecutar('DELETE FROM push_suscripcion WHERE endpoint = ? AND id_empleado = ?', [endpoint, usuario(res).id_empleado]);
    res.json({ ok: true });
}));
