// Respaldo de la base de datos: backups/hotel_cortez_AAAA-MM-DD_HHMM.sql
// Uso: npm run respaldo   (ruta de mysqldump en MYSQLDUMP del .env)
// Para respaldo diario en Windows: Programador de tareas → ejecutar "npm run respaldo" en F:\hotelcortez\backend.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const carpeta = path.resolve(import.meta.dirname, '..', '..', 'backups');
mkdirSync(carpeta, { recursive: true });
const ahora = new Date();
const marca = ahora.toISOString().slice(0, 10) + '_' + String(ahora.getHours()).padStart(2, '0') + String(ahora.getMinutes()).padStart(2, '0');
const destino = path.join(carpeta, `${process.env.DB_NAME || 'hotel_cortez'}_${marca}.sql`);
const bin = process.env.MYSQLDUMP || 'mysqldump';

const p = spawn(
    bin,
    [
        '-h',
        process.env.DB_HOST || 'localhost',
        '-P',
        process.env.DB_PORT || '3306',
        '-u',
        process.env.DB_USER || 'root',
        '--default-character-set=utf8mb4',
        '--single-transaction',
        '--routines',
        process.env.DB_NAME || 'hotel_cortez'
    ],
    { env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' } }
);
p.stdout.pipe(createWriteStream(destino));
p.stderr.on('data', d => process.stderr.write(d));
p.on('error', e => {
    rmSync(destino, { force: true });
    console.error('No se pudo ejecutar mysqldump:', e.message, '→ revisa MYSQLDUMP en .env');
    process.exitCode = 1;
});
p.on('close', code => {
    if (code !== 0) {
        rmSync(destino, { force: true });
        console.error('El respaldo falló.');
        process.exitCode = 1;
        return;
    }
    // Conserva solo los 30 respaldos más recientes
    const archivos = readdirSync(carpeta)
        .filter(f => f.endsWith('.sql'))
        .map(f => path.join(carpeta, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    for (const viejo of archivos.slice(30)) unlinkSync(viejo);
    console.log('Respaldo guardado en', destino);
});
