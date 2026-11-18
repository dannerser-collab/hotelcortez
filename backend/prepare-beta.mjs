import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
dotenv.config({ quiet: true });

const c = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_cortez',
  charset: 'utf8mb4',
  connectTimeout: 5000
});

try {
  const migration = await readFile(new URL('../database/03_beta.sql', import.meta.url), 'utf8');
  for (const statement of migration.split(';').filter(s => s.trim())) {
    await c.query(statement);
  }

  // Corregir codificación UTF-8 en catálogos y registros iniciales (evita caracteres extraños como Mar├â┬¡a)
  await c.query(`UPDATE empleado SET nombre = 'María Fernanda', apellido = 'López' WHERE id_empleado = 1`);
  await c.query(`UPDATE area SET nombre_area = 'Mantenimiento (Técnicos)' WHERE id_area = 2`);
  await c.query(`UPDATE area SET nombre_area = 'Supervisión y Control' WHERE id_area = 3`);
  await c.query(`UPDATE especialidad SET nombre_especialidad = 'Plomería y Grifería' WHERE id_especialidad = 1`);
  await c.query(`UPDATE especialidad SET nombre_especialidad = 'Electricidad e Iluminación' WHERE id_especialidad = 2`);
  await c.query(`UPDATE especialidad SET nombre_especialidad = 'Cerrajería y Carpintería' WHERE id_especialidad = 4`);
  await c.query(`UPDATE tipo_incidente SET descripcion = 'Fuga de agua en inodoro o lavamanos' WHERE id_tipo_incidente = 1`);
  await c.query(`UPDATE tipo_incidente SET descripcion = 'Baja presión de agua o sin agua caliente' WHERE id_tipo_incidente = 2`);
  await c.query(`UPDATE tipo_incidente SET descripcion = 'Luminaria o foco quemado / parpadeando' WHERE id_tipo_incidente = 3`);
  await c.query(`UPDATE tipo_incidente SET descripcion = 'Tomacorriente sin energía eléctrica o en corto' WHERE id_tipo_incidente = 4`);
  await c.query(`UPDATE tipo_incidente SET descripcion = 'Aire acondicionado no enfría o gotea agua' WHERE id_tipo_incidente = 5`);
  await c.query(`UPDATE tipo_incidente SET descripcion = 'Cerradura electrónica no abre o sin batería' WHERE id_tipo_incidente = 6`);
  await c.query(`UPDATE material SET nombre_mat = 'Foco LED 12W luz cálida E27' WHERE id_material = 2`);
  await c.query(`UPDATE solicitud SET problema = 'El A/C hace ruido fuerte y no enfría. Gotea agua junto a la ventana. Huésped reportó a las 09:30.' WHERE id_solicitud = 1`);
  await c.query(`UPDATE solicitud SET problema = 'Fuga de agua constante en el inodoro del baño principal' WHERE id_solicitud = 2`);
  await c.query(`UPDATE incidente SET observacion = 'Alta — Bloquea Check-in de las 15:00. Habitación con reserva.' WHERE id_incidente = 1`);

  // Assign only rooms without an owner, using the first active housekeeper for the beta.
  await c.query(`INSERT INTO beta_habitacion_mucama(id_habitacion, id_empleado)
    SELECT h.id_habitacion, e.id_empleado FROM habitacion h
    JOIN (SELECT MIN(id_empleado) AS id_empleado FROM empleado WHERE rol='MUCAMA' AND id_estado_empleado=1) e
    WHERE e.id_empleado IS NOT NULL AND NOT EXISTS (SELECT 1 FROM beta_habitacion_mucama b WHERE b.id_habitacion=h.id_habitacion)`);

  console.log('Migración beta y corrección de tildes UTF-8 listas; registros existentes conservados.');
} finally {
  await c.end();
}
