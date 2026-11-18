-- Migración aditiva. No borra registros ni reconstruye tablas existentes.
CREATE TABLE IF NOT EXISTS beta_solicitud_foto (
  id_solicitud INT PRIMARY KEY,
  foto MEDIUMTEXT NOT NULL,
  CONSTRAINT fk_beta_foto_solicitud FOREIGN KEY (id_solicitud)
    REFERENCES solicitud(id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS beta_habitacion_mucama (
  id_habitacion INT PRIMARY KEY,
  id_empleado INT NOT NULL,
  CONSTRAINT fk_beta_habitacion FOREIGN KEY (id_habitacion) REFERENCES habitacion(id_habitacion),
  CONSTRAINT fk_beta_mucama FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
