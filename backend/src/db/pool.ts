import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export type Conexion = mysql.PoolConnection | mysql.Pool;

export function crearPool(database = env.db.database) {
    const pool = mysql.createPool({
        ...env.db,
        database,
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: 5000,
        timezone: env.desfaseMysql,
        dateStrings: false,
        decimalNumbers: true
    });
    // Misma zona horaria en cada conexión: NOW() y CURDATE() coinciden con Node
    pool.on('connection', c => {
        c.query(`SET time_zone = '${env.desfaseMysql}'`);
    });
    return pool;
}

export let pool = crearPool();

/** Solo para pruebas: apunta la aplicación a otra base. */
export async function usarBase(database: string) {
    await pool.end().catch(() => undefined);
    pool = crearPool(database);
    return pool;
}

export async function transaccion<T>(fn: (c: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const c = await pool.getConnection();
    try {
        await c.beginTransaction();
        const r = await fn(c);
        await c.commit();
        return r;
    } catch (e) {
        await c.rollback();
        throw e;
    } finally {
        c.release();
    }
}

/** Consulta tipada que devuelve filas. */
export async function filas<T = any>(sql: string, params: unknown[] = [], c: Conexion = pool): Promise<T[]> {
    const [r] = await c.query(sql, params);
    return r as T[];
}

export async function fila<T = any>(sql: string, params: unknown[] = [], c: Conexion = pool): Promise<T | undefined> {
    return (await filas<T>(sql, params, c))[0];
}

export async function ejecutar(sql: string, params: unknown[] = [], c: Conexion = pool) {
    const [r] = await c.query(sql, params);
    return r as mysql.ResultSetHeader;
}
