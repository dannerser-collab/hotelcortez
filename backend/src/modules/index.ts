// Registro de módulos de la API. Para agregar un módulo nuevo:
//   1. Crea src/modules/<nombre>/rutas.ts que exporte un Router.
//   2. Móntalo aquí con su prefijo. Las rutas montadas después de `autenticar` exigen sesión.
import { Router } from 'express';
import { rutasAuth, autenticar } from './auth/auth.js';
import { rutasPublicasSistema, rutasSistema } from './sistema/rutas.js';
import { rutasCatalogos } from './catalogos/rutas.js';
import { rutasSolicitudes } from './solicitudes/rutas.js';
import { rutasTrabajo } from './trabajo/rutas.js';
import { rutasAdmin } from './admin/rutas.js';
import { rutasIndicadores } from './indicadores/rutas.js';

export const api = Router();

// Públicas
api.use(rutasPublicasSistema);
api.use('/auth', rutasAuth);

// Con sesión
api.use(autenticar);
api.use(rutasSistema);
api.use('/catalogos', rutasCatalogos);
api.use('/solicitudes', rutasSolicitudes);
api.use('/indicadores', rutasIndicadores);
api.use(rutasTrabajo);
api.use(rutasAdmin);
