// Ejecutor de migraciones versionadas.
// Cada archivo de src/db/migrations exporta { id, descripcion, up }.
// Las migraciones aplicadas quedan registradas en schema_version y nunca se repiten.
// REGLA: no edites una migración ya aplicada; crea una nueva con el siguiente número.
import type { PoolConnection } from 'mysql2/promise';
import { pool } from './pool.js';
import { migraciones } from './migrations/index.js';

export { tablaExiste, columnaExiste } from './esquema.js';

export type Migracion = {
    id: string;
    descripcion: string;
    up: (c: PoolConnection) => Promise<void>;
};

export async function migrar(log: (m: string) => void = console.log) {
    const c = await pool.getConnection();
    try {
        await c.query(`CREATE TABLE IF NOT EXISTS schema_version (
            id VARCHAR(80) PRIMARY KEY,
            descripcion VARCHAR(200) NOT NULL,
            aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        const [hechas]: any = await c.query('SELECT id FROM schema_version');
        const aplicadas = new Set(hechas.map((h: any) => h.id));
        let n = 0;
        for (const m of migraciones) {
            if (aplicadas.has(m.id)) continue;
            log(`→ Aplicando ${m.id}: ${m.descripcion}`);
            await m.up(c);
            await c.query('INSERT INTO schema_version (id, descripcion) VALUES (?, ?)', [m.id, m.descripcion]);
            n++;
        }
        log(n ? `Migraciones aplicadas: ${n}.` : 'La base de datos ya está al día.');
        return n;
    } finally {
        c.release();
    }
}

export async function migracionesPendientes() {
    const [r]: any = await pool.query('SELECT id FROM schema_version').catch(() => [[]]);
    const aplicadas = new Set(r.map((x: any) => x.id));
    return migraciones.filter(m => !aplicadas.has(m.id)).map(m => m.id);
}
