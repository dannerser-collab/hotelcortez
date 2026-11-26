// Retira tablas del prototipo inicial que ningún código usa y repara textos
// guardados con doble codificación (UTF-8 leído como latin1 al cargar el seed por consola).
import type { Migracion } from '../migrar.js';

const TEXTOS: [string, string, string][] = [
    ['empleado', 'id_empleado', 'nombre'],
    ['empleado', 'id_empleado', 'apellido'],
    ['area', 'id_area', 'nombre_area'],
    ['especialidad', 'id_especialidad', 'nombre_especialidad'],
    ['material', 'id_material', 'nombre_mat'],
    ['solicitud', 'id_solicitud', 'problema'],
    ['reporte', 'id_reporte', 'observacion'],
    ['asignacion', 'id_asignacion', 'diagnostico'],
    ['tipo_habitacion', 'id_tipo_hab', 'nombre']
];

export const m0003: Migracion = {
    id: '0003_limpieza',
    descripcion: 'Quitar tablas del prototipo y reparar tildes mal codificadas',
    async up(c) {
        await c.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const t of ['detalle_material', 'atencion_incidente', 'ubicacion', 'cargo']) await c.query('DROP TABLE IF EXISTS `' + t + '`');
        await c.query('SET FOREIGN_KEY_CHECKS = 1');

        // 'Ã' y 'Â' solo aparecen en español cuando el texto está doblemente codificado
        for (const [tabla, id, col] of TEXTOS) {
            const [r]: any = await c.query(
                `SELECT ${id} AS id, CONVERT(CAST(CONVERT(${col} USING latin1) AS BINARY) USING utf8mb4) AS reparado
                 FROM ${tabla} WHERE ${col} COLLATE utf8mb4_bin LIKE '%Ã%' OR ${col} COLLATE utf8mb4_bin LIKE '%Â%'`
            );
            for (const f of r) if (f.reparado && !/Ã|Â|�/.test(f.reparado)) await c.query(`UPDATE ${tabla} SET ${col} = ? WHERE ${id} = ?`, [f.reparado, f.id]);
        }
    }
};
