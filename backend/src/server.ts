import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

// Controladores para las vistas de PC y Móvil
import { getRackHabitaciones } from './controllers/rack.controller.js';
import { getFormularioCamarera, crearReporteCamarera } from './controllers/solicitudes.controller.js';
import { getTecnicosSugeridos, asignarTecnicoAHabitacion } from './controllers/tecnicos.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// 1. Endpoint de verificación del servidor
app.get('/api/salud', async (_req: Request, res: Response) => {
  try {
    const [testRows]: any = await pool.query('SELECT NOW() AS hora_bd');
    res.json({
      status: 'success',
      mensaje: 'Servidor del Hotel Cortéz en línea y conectado a MySQL 🏨',
      hora_bd: testRows[0].hora_bd
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// 2. ENDPOINTS PARA LA PANTALLA DE PC (Rack y Monitor de Habitaciones)
app.get('/api/rack', getRackHabitaciones);
app.get('/api/tecnicos/sugeridos', getTecnicosSugeridos);
app.post('/api/tecnicos/asignar', asignarTecnicoAHabitacion);

// 3. ENDPOINTS PARA LA PANTALLA MÓVIL (Gobernanza / Mucamas)
app.get('/api/solicitudes/formulario-camarera', getFormularioCamarera);
app.post('/api/solicitudes/reportar', crearReporteCamarera);

// Arrancar servidor
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🏨 API REST Hotel Cortéz (CMMS) ACTIVA`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`💻 Rack Habitaciones PC: http://localhost:${PORT}/api/rack`);
  console.log(`📱 Formulario Camarera Móvil: http://localhost:${PORT}/api/solicitudes/formulario-camarera`);
  console.log('==================================================');
});
