// Estado de partida (modelo V2 + tablas beta). Es idempotente: en una base
// existente no cambia nada; en una base vacía crea las tablas que 0002 transforma.
import type { Migracion } from '../migrar.js';

export const m0001: Migracion = {
    id: '0001_base_v2',
    descripcion: 'Modelo físico V2 y tablas beta (punto de partida)',
    async up(c) {
        const tablas = [
            `CREATE TABLE IF NOT EXISTS estado_empleado (
                id_estado_empleado INT AUTO_INCREMENT PRIMARY KEY,
                nombre_estado VARCHAR(30) NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS area (
                id_area INT AUTO_INCREMENT PRIMARY KEY,
                nombre_area VARCHAR(50) NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS empleado (
                id_empleado INT AUTO_INCREMENT PRIMARY KEY,
                id_area INT NOT NULL,
                id_estado_empleado INT NOT NULL,
                nombre VARCHAR(60) NOT NULL,
                apellido VARCHAR(60) NOT NULL,
                telefono INT NOT NULL,
                rol VARCHAR(30) DEFAULT 'OPERATIVO',
                CONSTRAINT fk_empleado_area FOREIGN KEY (id_area) REFERENCES area(id_area),
                CONSTRAINT fk_empleado_estado FOREIGN KEY (id_estado_empleado) REFERENCES estado_empleado(id_estado_empleado))`,
            `CREATE TABLE IF NOT EXISTS supervisor (
                id_supervisor INT AUTO_INCREMENT PRIMARY KEY,
                id_empleado INT NOT NULL UNIQUE,
                CONSTRAINT fk_supervisor_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado))`,
            `CREATE TABLE IF NOT EXISTS bloque (
                id_bloque INT AUTO_INCREMENT PRIMARY KEY,
                bloque INT NOT NULL UNIQUE)`,
            `CREATE TABLE IF NOT EXISTS habitacion (
                id_habitacion INT AUTO_INCREMENT PRIMARY KEY,
                id_bloque INT NOT NULL,
                numero VARCHAR(10) NOT NULL UNIQUE,
                piso INT NOT NULL,
                tipo_hab VARCHAR(30),
                estado BOOLEAN DEFAULT TRUE,
                CONSTRAINT fk_habitacion_bloque FOREIGN KEY (id_bloque) REFERENCES bloque(id_bloque))`,
            `CREATE TABLE IF NOT EXISTS especialidad (
                id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
                nombre_especialidad VARCHAR(30) NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS tipo_incidente (
                id_tipo_incidente INT AUTO_INCREMENT PRIMARY KEY,
                id_especialidad INT NOT NULL,
                descripcion TEXT,
                CONSTRAINT fk_tipo_especialidad FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad))`,
            `CREATE TABLE IF NOT EXISTS prioridad (
                id_prioridad INT AUTO_INCREMENT PRIMARY KEY,
                nivel_prioridad INT NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS estado_incidente (
                id_estado INT AUTO_INCREMENT PRIMARY KEY,
                estado BOOLEAN NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS material (
                id_material INT AUTO_INCREMENT PRIMARY KEY,
                nombre_mat VARCHAR(50) NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS solicitud (
                id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
                id_empleado INT NOT NULL,
                fecha DATE NOT NULL,
                hora_inicial TIME NOT NULL,
                problema TEXT,
                CONSTRAINT fk_solicitud_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado))`,
            `CREATE TABLE IF NOT EXISTS solicitud_habitacion (
                id_solicitud INT,
                id_habitacion INT,
                PRIMARY KEY (id_solicitud, id_habitacion),
                CONSTRAINT fk_solhab_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
                CONSTRAINT fk_solhab_habitacion FOREIGN KEY (id_habitacion) REFERENCES habitacion(id_habitacion))`,
            `CREATE TABLE IF NOT EXISTS asignacion (
                id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
                id_empleado INT NOT NULL,
                fecha_asignacion DATE NOT NULL,
                hora_asignacion TIME NOT NULL,
                fecha_fin DATE,
                hora_fin TIME,
                observaciones TEXT,
                CONSTRAINT fk_asignacion_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado))`,
            `CREATE TABLE IF NOT EXISTS asignacion_material (
                id_asignacion INT,
                id_material INT,
                cantidad INT NOT NULL,
                PRIMARY KEY (id_asignacion, id_material),
                CONSTRAINT fk_asigmat_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion(id_asignacion) ON DELETE CASCADE,
                CONSTRAINT fk_asigmat_material FOREIGN KEY (id_material) REFERENCES material(id_material))`,
            `CREATE TABLE IF NOT EXISTS incidente (
                id_incidente INT AUTO_INCREMENT PRIMARY KEY,
                id_tipo_incidente INT NOT NULL,
                id_asignacion INT,
                id_solicitud INT NOT NULL,
                id_supervisor INT NOT NULL,
                id_prioridad INT NOT NULL,
                id_estado INT NOT NULL,
                observacion TEXT,
                CONSTRAINT fk_inc_tipo FOREIGN KEY (id_tipo_incidente) REFERENCES tipo_incidente(id_tipo_incidente),
                CONSTRAINT fk_inc_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion(id_asignacion) ON DELETE SET NULL,
                CONSTRAINT fk_inc_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
                CONSTRAINT fk_inc_supervisor FOREIGN KEY (id_supervisor) REFERENCES supervisor(id_supervisor),
                CONSTRAINT fk_inc_prioridad FOREIGN KEY (id_prioridad) REFERENCES prioridad(id_prioridad),
                CONSTRAINT fk_inc_estado FOREIGN KEY (id_estado) REFERENCES estado_incidente(id_estado))`,
            `CREATE TABLE IF NOT EXISTS beta_solicitud_foto (
                id_solicitud INT PRIMARY KEY,
                foto MEDIUMTEXT NOT NULL,
                CONSTRAINT fk_beta_foto_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE)`,
            `CREATE TABLE IF NOT EXISTS beta_habitacion_mucama (
                id_habitacion INT PRIMARY KEY,
                id_empleado INT NOT NULL,
                CONSTRAINT fk_beta_habitacion FOREIGN KEY (id_habitacion) REFERENCES habitacion(id_habitacion),
                CONSTRAINT fk_beta_mucama FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado))`
        ];
        for (const sql of tablas) await c.query(sql + ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    }
};
