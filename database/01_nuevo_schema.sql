-- ========================================================================
-- NUEVO MODELO FÍSICO DE BASE DE DATOS - HOTEL CORTÉZ
-- Archivo: 01_nuevo_schema.sql
-- ========================================================================

CREATE DATABASE IF NOT EXISTS hotel_cortez
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hotel_cortez;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS incidente;
DROP TABLE IF EXISTS asignacion_material;
DROP TABLE IF EXISTS asignacion;
DROP TABLE IF EXISTS solicitud_habitacion;
DROP TABLE IF EXISTS solicitud;
DROP TABLE IF EXISTS material;
DROP TABLE IF EXISTS estado_incidente;
DROP TABLE IF EXISTS prioridad;
DROP TABLE IF EXISTS tipo_incidente;
DROP TABLE IF EXISTS especialidad;
DROP TABLE IF EXISTS habitacion;
DROP TABLE IF EXISTS bloque;
DROP TABLE IF EXISTS supervisor;
DROP TABLE IF EXISTS empleado;
DROP TABLE IF EXISTS area;
DROP TABLE IF EXISTS estado_empleado;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tablas Organizacionales
CREATE TABLE estado_empleado (
    id_estado_empleado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_estado VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE area (
    id_area INT AUTO_INCREMENT PRIMARY KEY,
    nombre_area VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE empleado (
    id_empleado INT AUTO_INCREMENT PRIMARY KEY,
    id_area INT NOT NULL,
    id_estado_empleado INT NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    apellido VARCHAR(60) NOT NULL,
    telefono INT NOT NULL,
    rol VARCHAR(30) DEFAULT 'OPERATIVO',
    CONSTRAINT fk_empleado_area FOREIGN KEY (id_area) REFERENCES area(id_area),
    CONSTRAINT fk_empleado_estado FOREIGN KEY (id_estado_empleado) REFERENCES estado_empleado(id_estado_empleado)
) ENGINE=InnoDB;

CREATE TABLE supervisor (
    id_supervisor INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado INT NOT NULL UNIQUE,
    CONSTRAINT fk_supervisor_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
) ENGINE=InnoDB;

-- 2. Infraestructura (Bloques y Habitaciones)
CREATE TABLE bloque (
    id_bloque INT AUTO_INCREMENT PRIMARY KEY,
    bloque INT NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE habitacion (
    id_habitacion INT AUTO_INCREMENT PRIMARY KEY,
    id_bloque INT NOT NULL,
    numero VARCHAR(10) NOT NULL UNIQUE,
    piso INT NOT NULL,
    tipo_hab VARCHAR(30),
    estado BOOLEAN DEFAULT TRUE, -- TRUE = Operativa/Disponible, FALSE = Con Avería/Mantenimiento
    CONSTRAINT fk_habitacion_bloque FOREIGN KEY (id_bloque) REFERENCES bloque(id_bloque)
) ENGINE=InnoDB;

-- 3. Catálogos Técnicos
CREATE TABLE especialidad (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre_especialidad VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tipo_incidente (
    id_tipo_incidente INT AUTO_INCREMENT PRIMARY KEY,
    id_especialidad INT NOT NULL,
    descripcion TEXT,
    CONSTRAINT fk_tipo_especialidad FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad)
) ENGINE=InnoDB;

CREATE TABLE prioridad (
    id_prioridad INT AUTO_INCREMENT PRIMARY KEY,
    nivel_prioridad INT NOT NULL -- 1: Alta/Emergencia, 2: Media, 3: Baja
) ENGINE=InnoDB;

CREATE TABLE estado_incidente (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    estado BOOLEAN NOT NULL -- FALSE: En proceso / Pendiente, TRUE: Resuelto
) ENGINE=InnoDB;

CREATE TABLE material (
    id_material INT AUTO_INCREMENT PRIMARY KEY,
    nombre_mat VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- 4. Solicitudes de Mucamas
CREATE TABLE solicitud (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicial TIME NOT NULL,
    problema TEXT,
    CONSTRAINT fk_solicitud_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
) ENGINE=InnoDB;

CREATE TABLE solicitud_habitacion (
    id_solicitud INT,
    id_habitacion INT,
    PRIMARY KEY (id_solicitud, id_habitacion),
    CONSTRAINT fk_solhab_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    CONSTRAINT fk_solhab_habitacion FOREIGN KEY (id_habitacion) REFERENCES habitacion(id_habitacion)
) ENGINE=InnoDB;

-- 5. Asignaciones y Atención Técnica
CREATE TABLE asignacion (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado INT NOT NULL,
    fecha_asignacion DATE NOT NULL,
    hora_asignacion TIME NOT NULL,
    fecha_fin DATE,
    hora_fin TIME,
    observaciones TEXT,
    CONSTRAINT fk_asignacion_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
) ENGINE=InnoDB;

CREATE TABLE asignacion_material (
    id_asignacion INT,
    id_material INT,
    cantidad INT NOT NULL,
    PRIMARY KEY (id_asignacion, id_material),
    CONSTRAINT fk_asigmat_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion(id_asignacion) ON DELETE CASCADE,
    CONSTRAINT fk_asigmat_material FOREIGN KEY (id_material) REFERENCES material(id_material)
) ENGINE=InnoDB;

-- 6. Incidente Centralizador
CREATE TABLE incidente (
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
    CONSTRAINT fk_inc_estado FOREIGN KEY (id_estado) REFERENCES estado_incidente(id_estado)
) ENGINE=InnoDB;
