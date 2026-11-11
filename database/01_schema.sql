-- ========================================================================
-- SISTEMA DE GESTIÓN DE MANTENIMIENTO (CMMS) - HOTEL CORTÉZ
-- Archivo: 01_schema.sql
-- Motor: MySQL 8.0+ / InnoDB / UTF-8 mb4
-- ========================================================================

CREATE DATABASE IF NOT EXISTS hotel_cortez
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hotel_cortez;

-- Desactivar temporalmente revisión de foreign keys para limpieza
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS detalle_material;
DROP TABLE IF EXISTS material;
DROP TABLE IF EXISTS atencion_incidente;
DROP TABLE IF EXISTS asignacion;
DROP TABLE IF EXISTS incidente;
DROP TABLE IF EXISTS solicitud;
DROP TABLE IF EXISTS estado_incidente;
DROP TABLE IF EXISTS prioridad;
DROP TABLE IF EXISTS tipo_incidente;
DROP TABLE IF EXISTS especialidad;
DROP TABLE IF EXISTS ubicacion;
DROP TABLE IF EXISTS empleado;
DROP TABLE IF EXISTS estado_empleado;
DROP TABLE IF EXISTS cargo;
DROP TABLE IF EXISTS area;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================
-- 1. ESTRUCTURA ORGANIZACIONAL Y USUARIOS DEL SISTEMA
-- ========================================================================

CREATE TABLE area (
    id_area INT AUTO_INCREMENT PRIMARY KEY,
    nombre_area VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200) NULL,
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE cargo (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    id_area INT NOT NULL,
    nombre_cargo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200) NULL,
    CONSTRAINT fk_cargo_area FOREIGN KEY (id_area) REFERENCES area (id_area) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE estado_empleado (
    id_estado_empleado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_estado VARCHAR(30) NOT NULL -- 'Activo', 'Vacaciones', 'Con permiso', 'De baja'
) ENGINE=InnoDB;

CREATE TABLE empleado (
    id_empleado INT AUTO_INCREMENT PRIMARY KEY,
    id_area INT NOT NULL,
    id_cargo INT NOT NULL,
    id_estado_empleado INT NOT NULL,
    ci VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_sistema ENUM('ADMIN', 'SUPERVISOR', 'TECNICO', 'OPERATIVO') NOT NULL DEFAULT 'OPERATIVO',
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_empleado_area FOREIGN KEY (id_area) REFERENCES area (id_area) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_empleado_cargo FOREIGN KEY (id_cargo) REFERENCES cargo (id_cargo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_empleado_estado FOREIGN KEY (id_estado_empleado) REFERENCES estado_empleado (id_estado_empleado) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ========================================================================
-- 2. INFRAESTRUCTURA Y UBICACIONES (Habitaciones y Áreas Comunes)
-- ========================================================================

CREATE TABLE ubicacion (
    id_ubicacion INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('HABITACION', 'AREA_COMUN', 'EQUIPO_CRITICO') NOT NULL,
    identificador VARCHAR(50) NOT NULL, -- Ej: 'Habitación 204', 'Piscina Central', 'Chiller 1'
    piso INT NULL,                      -- NULL si es área general
    descripcion VARCHAR(255) NULL,
    estado_operativo ENUM('OPERATIVO', 'BLOQUEADA_MANTENIMIENTO') NOT NULL DEFAULT 'OPERATIVO'
) ENGINE=InnoDB;

-- ========================================================================
-- 3. CATÁLOGOS TÉCNICOS Y GESTIÓN DE INCIDENCIAS
-- ========================================================================

CREATE TABLE especialidad (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre_especialidad VARCHAR(50) NOT NULL -- Plomería, Electricidad, HVAC, etc.
) ENGINE=InnoDB;

CREATE TABLE tipo_incidente (
    id_tipo_incidente INT AUTO_INCREMENT PRIMARY KEY,
    id_especialidad INT NOT NULL,
    codigo VARCHAR(10) NOT NULL UNIQUE,     -- Ej: 'PL-01', 'HV-02'
    nombre_tipo VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    CONSTRAINT fk_tipo_especialidad FOREIGN KEY (id_especialidad) REFERENCES especialidad (id_especialidad) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE prioridad (
    id_prioridad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,            -- 'Emergencia', 'Alta', 'Media', 'Baja'
    nivel_prioridad INT NOT NULL,           -- 1 (máxima) a 4 (mínima)
    tiempo_objetivo_horas DECIMAL(5,2) NOT NULL -- SLA: tiempo en horas esperado para resolver
) ENGINE=InnoDB;

CREATE TABLE estado_incidente (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_estado VARCHAR(50) NOT NULL,     -- 'Pendiente', 'Asignado', 'En Proceso', 'En Espera', 'Resuelto', 'Cerrado'
    descripcion VARCHAR(200) NULL
) ENGINE=InnoDB;

-- ========================================================================
-- 4. FLUJO DE SOLICITUDES, ÓRDENES DE TRABAJO Y ATENCIÓN
-- ========================================================================

CREATE TABLE solicitud (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_empleado_solicitante INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_reporte DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    canal_reporte VARCHAR(30) NOT NULL DEFAULT 'APP_MOVIL', -- 'APP_MOVIL', 'WEB', 'WHATSAPP_LEGACY'
    problema_reportado TEXT NOT NULL,
    foto_evidencia_url VARCHAR(255) NULL,
    CONSTRAINT fk_solicitud_empleado FOREIGN KEY (id_empleado_solicitante) REFERENCES empleado (id_empleado) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_solicitud_ubicacion FOREIGN KEY (id_ubicacion) REFERENCES ubicacion (id_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE incidente (
    id_incidente INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_tipo_incidente INT NOT NULL,
    id_prioridad INT NOT NULL,
    id_estado INT NOT NULL,
    id_supervisor INT NOT NULL,
    observacion TEXT NULL,
    creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incidente_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud (id_solicitud) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_incidente_tipo FOREIGN KEY (id_tipo_incidente) REFERENCES tipo_incidente (id_tipo_incidente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_incidente_prioridad FOREIGN KEY (id_prioridad) REFERENCES prioridad (id_prioridad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_incidente_estado FOREIGN KEY (id_estado) REFERENCES estado_incidente (id_estado) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_incidente_supervisor FOREIGN KEY (id_supervisor) REFERENCES empleado (id_empleado) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE asignacion (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_incidente INT NOT NULL,
    id_tecnico INT NOT NULL,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio DATETIME NULL,             -- Cuándo el técnico pulsa "Iniciar trabajo" en móvil
    fecha_fin DATETIME NULL,                -- Cuándo el técnico pulsa "Finalizar"
    observaciones TEXT NULL,
    CONSTRAINT fk_asignacion_incidente FOREIGN KEY (id_incidente) REFERENCES incidente (id_incidente) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_asignacion_tecnico FOREIGN KEY (id_tecnico) REFERENCES empleado (id_empleado) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE atencion_incidente (
    id_atencion INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NOT NULL,
    fecha_atencion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diagnostico TEXT NOT NULL,
    actividad_realizada TEXT NOT NULL,
    solucion TEXT NOT NULL,
    foto_solucion_url VARCHAR(255) NULL,
    CONSTRAINT fk_atencion_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion (id_asignacion) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ========================================================================
-- 5. GESTIÓN DE MATERIALES / REPUESTOS Y COSTOS
-- ========================================================================

CREATE TABLE material (
    id_material INT AUTO_INCREMENT PRIMARY KEY,
    nombre_mat VARCHAR(80) NOT NULL,
    unidad_medida VARCHAR(30) NOT NULL,    -- 'Unidad', 'Metros', 'Litros', 'Juego'
    stock DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

CREATE TABLE detalle_material (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_atencion INT NOT NULL,
    id_material INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    CONSTRAINT uk_atencion_material UNIQUE (id_atencion, id_material),
    CONSTRAINT fk_detalle_atencion FOREIGN KEY (id_atencion) REFERENCES atencion_incidente (id_atencion) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detalle_material FOREIGN KEY (id_material) REFERENCES material (id_material) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ========================================================================
-- ÍNDICES PARA OPTIMIZAR RENDIMIENTO DE CONSULTAS Y DASHBOARDS (KPIs)
-- ========================================================================

CREATE INDEX idx_solicitud_fecha ON solicitud (fecha_reporte);
CREATE INDEX idx_incidente_estado ON incidente (id_estado);
CREATE INDEX idx_incidente_prioridad ON incidente (id_prioridad);
CREATE INDEX idx_asignacion_tecnico ON asignacion (id_tecnico);
CREATE INDEX idx_asignacion_fechas ON asignacion (fecha_inicio, fecha_fin);

