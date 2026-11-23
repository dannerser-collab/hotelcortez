import { env } from './config/env.js';
import { crearApp } from './app.js';
import { migracionesPendientes } from './db/migrar.js';

const app = crearApp();

app.listen(env.puerto, '0.0.0.0', async () => {
    console.log(`Hotel Cortéz API en el puerto ${env.puerto} (zona horaria ${env.zonaHoraria})`);
    try {
        const pendientes = await migracionesPendientes();
        if (pendientes.length) console.warn('⚠ Faltan migraciones:', pendientes.join(', '), '→ ejecuta "npm run migrar"');
    } catch (e: any) {
        console.error('⚠ No se pudo consultar MySQL:', e.code || e.message);
    }
});
