// Uso:
//   npm run migrar                  → aplica migraciones pendientes
//   npm run semilla                 → catálogos + datos demo (solo lo que falta)
//   npm run clave -- <id> <clave>   → asigna una contraseña a un empleado
import '../config/env.js';
import bcrypt from 'bcryptjs';
import { migrar } from './migrar.js';
import { sembrar } from './semilla.js';
import { pool } from './pool.js';

const [accion, ...args] = process.argv.slice(2);

try {
    if (accion === 'migrar') await migrar();
    else if (accion === 'semilla') {
        await migrar();
        await sembrar({ demo: !args.includes('--sin-demo') });
        console.log('Datos iniciales verificados. Credenciales de prueba: docs/ACCESO.md');
    } else if (accion === 'clave') {
        const [id, clave] = args;
        if (!id || !clave || clave.length < 6) throw new Error('Uso: npm run clave -- <id_empleado> <clave de 6+ caracteres>');
        const [r]: any = await pool.query('UPDATE empleado SET password_hash = ? WHERE id_empleado = ?', [await bcrypt.hash(clave, 10), Number(id)]);
        if (!r.affectedRows) throw new Error('No existe el empleado ' + id);
        await pool.query('DELETE FROM sesion WHERE id_empleado = ?', [Number(id)]);
        console.log('Contraseña actualizada para el empleado ' + id);
    } else {
        console.log('Acciones: migrar | semilla [--sin-demo] | clave <id> <clave>');
    }
} catch (e: any) {
    console.error('Error:', e.code || '', e.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
