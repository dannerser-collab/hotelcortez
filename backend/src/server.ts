import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

import {
  getHabitacionesMucama,
  reportarFallaMucama,
  getSolicitudesParaTecnico,
  atenderSolicitudTecnico,
  finalizarTareaTecnico,
  getDashboardSupervisor
} from './controllers/hotel_v2.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de verificación de salud
app.get('/api/salud', async (_req: Request, res: Response) => {
  try {
    const [test]: any = await pool.query('SELECT NOW() AS hora_bd');
    const [habs]: any = await pool.query('SELECT COUNT(*) AS total FROM habitacion');
    res.json({
      status: 'success',
      mensaje: 'Servidor Hotel Cortéz V2 en línea y conectado a MySQL 🏨',
      hora_bd: test[0].hora_bd,
      total_habitaciones: habs[0].total
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// =======================================================
// RUTAS SEGÚN LA JERARQUÍA DEL HOTEL CORTÉZ
// =======================================================

// 1. MUCAMAS (Realizan solicitudes, se les asignan habitaciones)
app.get('/api/mucama/habitaciones', getHabitacionesMucama);
app.post('/api/mucama/reportar', reportarFallaMucama);

// 2. TÉCNICOS (Reciben solicitudes, generan asignaciones, determinan atributos e info de materiales)
app.get('/api/tecnico/solicitudes', getSolicitudesParaTecnico);
app.post('/api/tecnico/atender', atenderSolicitudTecnico);
app.patch('/api/tecnico/finalizar', finalizarTareaTecnico);

// 3. SUPERVISOR (Acceso general a incidentes, solicitudes y asignaciones)
app.get('/api/supervisor/dashboard', getDashboardSupervisor);

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🏨 API REST Hotel Cortéz (Modelo V2) ACTIVA`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`🧹 Mucama: http://localhost:${PORT}/api/mucama/habitaciones`);
  console.log(`🔧 Técnico: http://localhost:${PORT}/api/tecnico/solicitudes`);
  console.log(`👔 Supervisor: http://localhost:${PORT}/api/supervisor/dashboard`);
  console.log('==================================================');
});
