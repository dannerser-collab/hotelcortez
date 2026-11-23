import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { env } from './config/env.js';
import { api } from './modules/index.js';
import { HttpError } from './lib/http.js';

export function crearApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 'loopback');
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'blob:'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    connectSrc: ["'self'"],
                    upgradeInsecureRequests: null
                }
            },
            crossOriginEmbedderPolicy: false
        })
    );
    // Sin CORS_ORIGIN solo se acepta el mismo origen (el frontend se sirve desde aquí o vía proxy de Vite)
    if (env.origenes.length) app.use(cors({ origin: env.origenes }));
    app.use(express.json({ limit: '2mb' }));

    app.use('/api', api);
    app.use('/api', (_req, res) => {
        res.status(404).json({ mensaje: 'Ruta no encontrada.' });
    });

    // En producción, la misma API sirve el frontend compilado (un solo puerto)
    if (existsSync(path.join(env.carpetaFrontend, 'index.html'))) {
        app.use(express.static(env.carpetaFrontend, { index: false, maxAge: '1h' }));
        app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(env.carpetaFrontend, 'index.html')));
    }

    app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status = error instanceof HttpError ? error.status : Number(error.status) || 500;
        if (status >= 500) console.error(new Date().toISOString(), error.code || '', error.message);
        if (error.type === 'entity.too.large') return res.status(413).json({ mensaje: 'La información enviada es demasiado grande.' });
        res.status(status).json({
            mensaje: status < 500 ? error.message : error.code?.startsWith?.('ER_') || error.code === 'ECONNREFUSED'
                ? 'Error de base de datos. Verifica que MySQL esté activo y las migraciones aplicadas.'
                : 'Error del servidor.'
        });
    });
    return app;
}
