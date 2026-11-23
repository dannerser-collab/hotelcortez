import type { PoolConnection } from 'mysql2/promise';

export async function tablaExiste(c: PoolConnection, tabla: string) {
    const [r]: any = await c.query('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tabla]);
    return r.length > 0;
}

export async function columnaExiste(c: PoolConnection, tabla: string, columna: string) {
    const [r]: any = await c.query('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [
        tabla,
        columna
    ]);
    return r.length > 0;
}
