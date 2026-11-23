// Configuración central. Debe importarse antes que cualquier otro módulo:
// fija la zona horaria del proceso para que Node y MySQL usen la misma hora.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config({ quiet: true });

process.env.TZ = process.env.APP_TZ || 'America/La_Paz';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function numero(valor: string | undefined, porDefecto: number) {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

export const env = {
    produccion: process.env.NODE_ENV === 'production',
    puerto: numero(process.env.PORT, 3000),
    zonaHoraria: process.env.TZ,
    // Desfase fijo usado por MySQL (Bolivia no tiene horario de verano)
    desfaseMysql: process.env.DB_TZ_OFFSET || '-04:00',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: numero(process.env.DB_PORT, 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hotel_cortez'
    },
    // Orígenes permitidos para CORS (separados por coma). Vacío = solo mismo origen.
    origenes: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
    sesionHoras: numero(process.env.SESION_HORAS, 12),
    carpetaFotos: path.resolve(raiz, process.env.UPLOADS_DIR || 'uploads'),
    carpetaFrontend: path.resolve(raiz, '..', 'frontend', 'dist'),
    vapid: {
        publica: process.env.VAPID_PUBLIC_KEY || '',
        privada: process.env.VAPID_PRIVATE_KEY || '',
        contacto: process.env.VAPID_SUBJECT || 'mailto:mantenimiento@hotelcortez.local'
    }
};
