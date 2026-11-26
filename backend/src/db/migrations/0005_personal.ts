// Alta de personal desde el supervisor: horario propio por empleado y especialidades del técnico.
import type { Migracion } from '../migrar.js';

export const m0005: Migracion = {
    id: '0005_personal',
    descripcion: 'Horario de entrada/salida por empleado y especialidades de cada técnico',
    async up(c) {
        // Si están vacías, rige el horario del turno
        await c.query('ALTER TABLE empleado ADD COLUMN hora_entrada TIME NULL AFTER id_turno, ADD COLUMN hora_salida TIME NULL AFTER hora_entrada');
        await c.query(
            `CREATE TABLE tecnico_especialidad (
                id_empleado INT NOT NULL,
                id_especialidad INT NOT NULL,
                PRIMARY KEY (id_empleado, id_especialidad),
                CONSTRAINT fk_tecesp_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE CASCADE,
                CONSTRAINT fk_tecesp_especialidad FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
        );
    }
};
