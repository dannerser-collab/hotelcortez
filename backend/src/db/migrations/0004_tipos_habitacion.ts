// Tipos de habitación que la mucama elige al registrar un incidente.
import type { Migracion } from '../migrar.js';
import { TIPOS_HABITACION } from '../../domain/reglas.js';

export const m0004: Migracion = {
    id: '0004_tipos_habitacion',
    descripcion: 'Agregar tipos Habitación ejecutiva, Habitación doble y Suite ejecutiva',
    async up(c) {
        for (const t of TIPOS_HABITACION) await c.query('INSERT IGNORE INTO tipo_habitacion (nombre) VALUES (?)', [t]);
    }
};
