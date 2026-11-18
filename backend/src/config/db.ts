import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones a MySQL para alto rendimiento
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_cortez',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000,
  queueLimit: 0,
  timezone: '-04:00'
});

export default pool;
