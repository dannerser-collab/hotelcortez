-- ========================================================================
-- MIGRACIÓN ADITIVA: Turnos de técnicos + prioridad por estado de habitación
-- Archivo: 04_turnos_prioridad.sql
-- No borra datos. El backend también la aplica automáticamente al iniciar.
-- ========================================================================
USE hotel_cortez;

-- Nivel 0 = URGENTE (habitación ocupada). Se mantienen 1 Alta, 2 Media, 3 Baja.
INSERT INTO prioridad (nivel_prioridad)
SELECT 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM prioridad WHERE nivel_prioridad = 0);

-- Turno de cada técnico: MANANA (06:00-14:00), TARDE (14:00-22:00), NOCHE (22:00-06:00)
CREATE TABLE IF NOT EXISTS beta_empleado_turno (
  id_empleado INT PRIMARY KEY,
  turno ENUM('MANANA','TARDE','NOCHE') NOT NULL DEFAULT 'MANANA',
  CONSTRAINT fk_beta_turno_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Estado de la habitación al reportar, prioridad calculada y técnico asignado por el jefe
CREATE TABLE IF NOT EXISTS beta_solicitud_ocupacion (
  id_solicitud INT PRIMARY KEY,
  ocupacion ENUM('VACIA','OCUPADA','RESERVADA') NULL,
  nivel_prioridad INT NOT NULL DEFAULT 2,
  tecnico_asignado INT NULL,
  asignado_por INT NULL,
  fecha_asignado DATETIME NULL,
  CONSTRAINT fk_beta_ocup_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
  CONSTRAINT fk_beta_ocup_tecnico FOREIGN KEY (tecnico_asignado) REFERENCES empleado(id_empleado),
  CONSTRAINT fk_beta_ocup_asignador FOREIGN KEY (asignado_por) REFERENCES empleado(id_empleado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Turnos iniciales de los técnicos de prueba
INSERT IGNORE INTO beta_empleado_turno (id_empleado, turno)
SELECT id_empleado, CASE id_empleado WHEN 2 THEN 'MANANA' WHEN 3 THEN 'TARDE' WHEN 4 THEN 'NOCHE' ELSE 'MANANA' END
FROM empleado WHERE rol = 'TECNICO';
