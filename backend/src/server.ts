import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Endpoint de verificación de salud y prueba de conexión a MySQL
app.get('/api/salud', async (_req: Request, res: Response) => {
  try {
    // 1. Consulta SQL simple para probar el motor
    const [testRows]: any = await pool.query('SELECT 1 + 1 AS prueba, NOW() AS hora_bd');

    // 2. Consultas a las tablas reales del Hotel Cortéz
    const [ubicaciones]: any = await pool.query('SELECT COUNT(*) AS total FROM ubicacion');
    const [empleados]: any = await pool.query('SELECT COUNT(*) AS total FROM empleado');
    const [especialidades]: any = await pool.query('SELECT COUNT(*) AS total FROM especialidad');

    res.json({
      status: 'success',
      mensaje: 'Servidor del Hotel Cortéz en línea y conectado a MySQL 🏨',
      servidor: {
        puerto: PORT,
        hora_bd: testRows[0].hora_bd
      },
      datos_hotel: {
        total_ubicaciones_cargadas: ubicaciones[0].total,
        total_empleados_activos: empleados[0].total,
        total_especialidades: especialidades[0].total
      }
    });
  } catch (error: any) {
    console.error('Error de conexión con MySQL:', error);
    res.status(500).json({
      status: 'error',
      mensaje: 'Error conectando con la base de datos MySQL',
      error: error.message
    });
  }
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🏨 Servidor Backend del Hotel Cortéz ACTIVO`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`📡 Comprobación: http://localhost:${PORT}/api/salud`);
  console.log('==================================================');
});
