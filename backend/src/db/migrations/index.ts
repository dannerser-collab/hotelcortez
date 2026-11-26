// Lista ordenada de migraciones. Para cambiar la base de datos:
//   1. Crea src/db/migrations/NNNN_descripcion.ts (siguiente número).
//   2. Agrégala al final de esta lista.
//   3. Ejecuta `npm run migrar`.
// Nunca modifiques una migración que ya se aplicó en otra máquina.
import { m0001 } from './0001_base_v2.js';
import { m0002 } from './0002_modelo_v3.js';
import { m0003 } from './0003_limpieza.js';
import { m0004 } from './0004_tipos_habitacion.js';
import { m0005 } from './0005_personal.js';

export const migraciones = [m0001, m0002, m0003, m0004, m0005];
