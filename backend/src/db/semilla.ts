// Datos iniciales. Seguro de ejecutar varias veces: solo inserta lo que falta
// y solo asigna contraseña a empleados que aún no tienen una.
// Las contraseñas de prueba están en docs/ACCESO.md.
import bcrypt from 'bcryptjs';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from './pool.js';

export const CLAVES_DEMO: Record<string, string> = {
    MUCAMA: 'Mucama2026!',
    TECNICO: 'Tecnico2026!',
    SUPERVISOR: 'Super2026!'
};

const EMPLEADOS = [
    // id, area, nombre, apellido, telefono, rol, turno, ci
    [1, 1, 'María Fernanda', 'López', '78912345', 'MUCAMA', 1, '6123451'],
    [2, 2, 'Jorge', 'Paredes', '71234567', 'TECNICO', 1, '6123452'],
    [3, 2, 'Carlos', 'Ruiz', '72345678', 'TECNICO', 2, '6123453'],
    [4, 2, 'Luis', 'Torres', '73456789', 'TECNICO', 3, '6123454'],
    [5, 3, 'Roberto', 'Paz', '70123456', 'SUPERVISOR', 1, '6123455'],
    [6, 1, 'Rosa', 'Quispe', '76543210', 'MUCAMA', 2, '6123456']
] as const;

const HABITACIONES = [
    // numero, piso, tipo
    ['101', 1, 'Doble'],
    ['102', 1, 'Doble'],
    ['105', 1, 'Matrimonial'],
    ['108', 1, 'Suite'],
    ['201', 2, 'Doble'],
    ['204', 2, 'Suite'],
    ['301', 3, 'Matrimonial'],
    ['354', 3, 'Suite'],
    ['431', 4, 'Doble'],
    ['434', 4, 'Suite'],
    ['437', 4, 'Suite'],
    ['439', 4, 'Matrimonial'],
    ['501', 5, 'Doble'],
    ['508', 5, 'Simple'],
    ['601', 6, 'Suite']
] as const;

async function vacia(c: PoolConnection, tabla: string) {
    const [r]: any = await c.query(`SELECT COUNT(*) n FROM ${tabla}`);
    return Number(r[0].n) === 0;
}

export async function sembrar({ demo = true }: { demo?: boolean } = {}) {
    const c = await pool.getConnection();
    try {
        // Catálogos con id fijo: el código depende de estos valores
        await c.query(`INSERT IGNORE INTO estado_empleado (id_estado_empleado, nombre_estado) VALUES
            (1,'Activo'), (2,'De vacaciones'), (3,'De baja'), (4,'Pendiente de aprobación')`);
        await c.query(`INSERT IGNORE INTO area (id_area, nombre_area) VALUES
            (1,'Gobernanza (Mucamas)'), (2,'Mantenimiento (Técnicos)'), (3,'Supervisión y Control')`);
        if (await vacia(c, 'especialidad'))
            await c.query(`INSERT INTO especialidad (nombre_especialidad) VALUES
                ('Plomería'), ('Electricidad'), ('Aire acondicionado'), ('Cerrajería y carpintería'), ('Mantenimiento general')`);
        if (await vacia(c, 'material'))
            await c.query(`INSERT INTO material (nombre_mat, unidad, stock) VALUES
                ('Empaque de goma 1/2 pulgada','unidad',20), ('Foco LED 12W luz cálida E27','unidad',30),
                ('Filtro lavable para Split A/C','unidad',10), ('Pilas alcalinas AA (pack 4)','pack',15),
                ('Cinta aislante negra','rollo',8), ('Cartucho de silicona antihongos','unidad',6),
                ('Cable eléctrico 2.5 mm','metro',100), ('Válvula de paso 1/2','unidad',5)`);

        if (demo) {
            if (await vacia(c, 'bloque')) await c.query('INSERT INTO bloque (bloque) VALUES (100),(200),(300),(400),(500),(600)');
            for (const e of EMPLEADOS)
                await c.query(
                    `INSERT INTO empleado (id_empleado, id_area, id_estado_empleado, nombre, apellido, telefono, rol, id_turno, ci)
                    VALUES (?,?,1,?,?,?,?,?,NULL) ON DUPLICATE KEY UPDATE id_empleado = id_empleado`,
                    [e[0], e[1], e[2], e[3], e[4], e[5], e[6]]
                );
            if (await vacia(c, 'habitacion'))
                for (const [numero, piso, tipo] of HABITACIONES) {
                    await c.query('INSERT IGNORE INTO tipo_habitacion (nombre) VALUES (?)', [tipo]);
                    await c.query(
                        `INSERT INTO habitacion (id_bloque, numero, piso, id_tipo_hab, estado, id_mucama)
                        SELECT b.id_bloque, ?, ?, t.id_tipo_hab, TRUE, IF(? <= 3, 1, 6)
                        FROM bloque b, tipo_habitacion t WHERE b.bloque = ? AND t.nombre = ?`,
                        [numero, piso, piso, Number(numero[0]) * 100, tipo]
                    );
                }
            // Completa CI de los empleados demo que no lo tengan
            for (const e of EMPLEADOS)
                await c.query(
                    'UPDATE empleado SET ci = ? WHERE id_empleado = ? AND ci IS NULL AND NOT EXISTS (SELECT 1 FROM (SELECT ci FROM empleado) x WHERE x.ci = ?)',
                    [e[7], e[0], e[7]]
                );
            // Contraseña de prueba solo para quien no tiene ninguna
            const [sin]: any = await c.query('SELECT id_empleado, rol FROM empleado WHERE password_hash IS NULL AND id_estado_empleado = 1');
            for (const s of sin)
                await c.query('UPDATE empleado SET password_hash = ? WHERE id_empleado = ?', [await bcrypt.hash(CLAVES_DEMO[s.rol], 10), s.id_empleado]);
            // Habitaciones sin mucama: a la primera mucama activa
            await c.query(`UPDATE habitacion SET id_mucama = (SELECT MIN(id_empleado) FROM empleado WHERE rol = 'MUCAMA' AND id_estado_empleado = 1)
                WHERE id_mucama IS NULL`);
        }
    } finally {
        c.release();
    }
}
