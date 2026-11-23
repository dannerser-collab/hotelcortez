import express from 'express';
import cors from 'cors';
import pool from './config/db.js';
import { betaRouter, ensureSchema } from './beta.js';
const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.get('/api/salud', async (_req, res) => {
    try {
        const [rows]: any = await pool.query('SELECT COUNT(*) AS habitaciones FROM habitacion');
        res.json({ status: 'success', mysql: true, ...rows[0] });
    }
    catch {
        res.status(503).json({ mensaje: 'No se pudo conectar con MySQL.' });
    }
});
app.use('/api', betaRouter);
app.use((_req, res) => { res.status(404).json({ mensaje: 'Ruta no encontrada.' }); });
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error.code || error.message);
    res.status(error.status || 500).json({ mensaje: error.status ? error.message : 'Error del servidor. Comprueba la conexión y los datos de MySQL.' });
});
app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
    console.log('Hotel Cortéz API: puerto ' + (process.env.PORT || 3000));
    ensureSchema()
        .then(() => console.log('Migración de turnos y prioridades verificada.'))
        .catch(e => console.error('No se pudo aplicar la migración automática:', e.code || e.message));
});
