-- ESQUEMA DE REFERENCIA (solo lectura) generado desde las migraciones.
-- No lo ejecutes para crear la base: usa "npm run semilla" en backend/.
-- Sirve para ver el modelo en MySQL Workbench (Database > Reverse Engineer) o documentarlo.


/*!50503 SET NAMES utf8mb4 */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `area` (
  `id_area` int NOT NULL AUTO_INCREMENT,
  `nombre_area` varchar(50) NOT NULL,
  PRIMARY KEY (`id_area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignacion` (
  `id_asignacion` int NOT NULL AUTO_INCREMENT,
  `id_solicitud` int NOT NULL,
  `id_tecnico` int NOT NULL,
  `asignado_por` int DEFAULT NULL,
  `id_dificultad` tinyint DEFAULT NULL,
  `id_especialidad` int DEFAULT NULL,
  `asignada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `iniciada_en` datetime DEFAULT NULL,
  `finalizada_en` datetime DEFAULT NULL,
  `diagnostico` text,
  PRIMARY KEY (`id_asignacion`),
  UNIQUE KEY `id_solicitud` (`id_solicitud`),
  KEY `fk_asig_por` (`asignado_por`),
  KEY `fk_asig_dificultad` (`id_dificultad`),
  KEY `fk_asig_especialidad` (`id_especialidad`),
  KEY `idx_asig_tecnico` (`id_tecnico`,`finalizada_en`),
  CONSTRAINT `fk_asig_dificultad` FOREIGN KEY (`id_dificultad`) REFERENCES `dificultad` (`id_dificultad`),
  CONSTRAINT `fk_asig_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id_especialidad`),
  CONSTRAINT `fk_asig_por` FOREIGN KEY (`asignado_por`) REFERENCES `empleado` (`id_empleado`),
  CONSTRAINT `fk_asig_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitud` (`id_solicitud`) ON DELETE CASCADE,
  CONSTRAINT `fk_asig_tecnico` FOREIGN KEY (`id_tecnico`) REFERENCES `empleado` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloque` (
  `id_bloque` int NOT NULL AUTO_INCREMENT,
  `bloque` int NOT NULL,
  PRIMARY KEY (`id_bloque`),
  UNIQUE KEY `bloque` (`bloque`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dificultad` (
  `id_dificultad` tinyint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `orden` tinyint NOT NULL,
  PRIMARY KEY (`id_dificultad`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleado` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `ci` varchar(15) DEFAULT NULL,
  `id_area` int NOT NULL,
  `id_estado_empleado` int NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `apellido` varchar(60) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `rol` enum('MUCAMA','TECNICO','SUPERVISOR') NOT NULL,
  `id_turno` tinyint DEFAULT NULL,
  `password_hash` varchar(100) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `uq_empleado_ci` (`ci`),
  KEY `fk_empleado_area` (`id_area`),
  KEY `fk_empleado_estado` (`id_estado_empleado`),
  KEY `fk_empleado_turno` (`id_turno`),
  CONSTRAINT `fk_empleado_area` FOREIGN KEY (`id_area`) REFERENCES `area` (`id_area`),
  CONSTRAINT `fk_empleado_estado` FOREIGN KEY (`id_estado_empleado`) REFERENCES `estado_empleado` (`id_estado_empleado`),
  CONSTRAINT `fk_empleado_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `especialidad` (
  `id_especialidad` int NOT NULL AUTO_INCREMENT,
  `nombre_especialidad` varchar(30) NOT NULL,
  PRIMARY KEY (`id_especialidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estado_empleado` (
  `id_estado_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre_estado` varchar(30) NOT NULL,
  PRIMARY KEY (`id_estado_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `habitacion` (
  `id_habitacion` int NOT NULL AUTO_INCREMENT,
  `id_bloque` int NOT NULL,
  `numero` varchar(10) NOT NULL,
  `piso` int NOT NULL,
  `id_tipo_hab` int DEFAULT NULL,
  `estado` tinyint(1) DEFAULT '1',
  `id_mucama` int DEFAULT NULL,
  PRIMARY KEY (`id_habitacion`),
  UNIQUE KEY `numero` (`numero`),
  KEY `fk_habitacion_bloque` (`id_bloque`),
  KEY `fk_habitacion_tipo` (`id_tipo_hab`),
  KEY `fk_habitacion_mucama` (`id_mucama`),
  CONSTRAINT `fk_habitacion_bloque` FOREIGN KEY (`id_bloque`) REFERENCES `bloque` (`id_bloque`),
  CONSTRAINT `fk_habitacion_mucama` FOREIGN KEY (`id_mucama`) REFERENCES `empleado` (`id_empleado`),
  CONSTRAINT `fk_habitacion_tipo` FOREIGN KEY (`id_tipo_hab`) REFERENCES `tipo_habitacion` (`id_tipo_hab`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id_material` int NOT NULL AUTO_INCREMENT,
  `nombre_mat` varchar(80) NOT NULL,
  `unidad` varchar(20) NOT NULL DEFAULT 'unidad',
  `stock` decimal(10,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_material`),
  UNIQUE KEY `uq_material_nombre` (`nombre_mat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_suscripcion` (
  `id_suscripcion` int NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` varchar(200) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_suscripcion`),
  UNIQUE KEY `uq_push_endpoint` (`endpoint`),
  KEY `fk_push_empleado` (`id_empleado`),
  CONSTRAINT `fk_push_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleado` (`id_empleado`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reporte` (
  `id_reporte` int NOT NULL AUTO_INCREMENT,
  `id_asignacion` int NOT NULL,
  `id_autor` int NOT NULL,
  `resultado` enum('HECHO','PENDIENTE') NOT NULL,
  `observacion` text NOT NULL,
  `motivo_pendiente` text,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_reporte`),
  KEY `fk_rep_autor` (`id_autor`),
  KEY `idx_rep_asignacion` (`id_asignacion`,`creado_en`),
  CONSTRAINT `fk_rep_asignacion` FOREIGN KEY (`id_asignacion`) REFERENCES `asignacion` (`id_asignacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_rep_autor` FOREIGN KEY (`id_autor`) REFERENCES `empleado` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reporte_material` (
  `id_reporte` int NOT NULL,
  `id_material` int NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_reporte`,`id_material`),
  KEY `fk_repmat_material` (`id_material`),
  CONSTRAINT `fk_repmat_material` FOREIGN KEY (`id_material`) REFERENCES `material` (`id_material`),
  CONSTRAINT `fk_repmat_reporte` FOREIGN KEY (`id_reporte`) REFERENCES `reporte` (`id_reporte`) ON DELETE CASCADE,
  CONSTRAINT `chk_repmat_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_version` (
  `id` varchar(80) NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  `aplicada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesion` (
  `token_hash` char(64) NOT NULL,
  `id_empleado` int NOT NULL,
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_en` datetime NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `fk_sesion_empleado` (`id_empleado`),
  KEY `idx_sesion_expira` (`expira_en`),
  CONSTRAINT `fk_sesion_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleado` (`id_empleado`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud` (
  `id_solicitud` int NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `id_habitacion` int NOT NULL,
  `problema` text NOT NULL,
  `ocupacion` enum('LIBRE','OCUPADA','RESERVADA') NOT NULL DEFAULT 'LIBRE',
  `nivel_prioridad` tinyint NOT NULL DEFAULT '2',
  `foto` varchar(100) DEFAULT NULL,
  `estado` enum('SIN_ASIGNAR','ASIGNADA','EN_PROCESO','PENDIENTE','RESUELTA','ANULADA') NOT NULL DEFAULT 'SIN_ASIGNAR',
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizada_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_solicitud`),
  KEY `fk_solicitud_empleado` (`id_empleado`),
  KEY `fk_solicitud_habitacion` (`id_habitacion`),
  KEY `idx_solicitud_estado` (`estado`,`nivel_prioridad`,`creada_en`),
  KEY `idx_solicitud_creada` (`creada_en`),
  CONSTRAINT `fk_solicitud_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleado` (`id_empleado`),
  CONSTRAINT `fk_solicitud_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitacion` (`id_habitacion`),
  CONSTRAINT `chk_solicitud_prioridad` CHECK ((`nivel_prioridad` between 0 and 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud_evento` (
  `id_evento` bigint NOT NULL AUTO_INCREMENT,
  `id_solicitud` int NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `id_empleado` int DEFAULT NULL,
  `detalle` varchar(500) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_evento`),
  KEY `fk_evento_empleado` (`id_empleado`),
  KEY `idx_evento_solicitud` (`id_solicitud`,`creado_en`),
  CONSTRAINT `fk_evento_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleado` (`id_empleado`),
  CONSTRAINT `fk_evento_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitud` (`id_solicitud`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud_modificacion` (
  `id_modificacion` int NOT NULL AUTO_INCREMENT,
  `id_reporte` int NOT NULL,
  `id_solicitante` int NOT NULL,
  `detalle` text NOT NULL,
  `estado` enum('PENDIENTE','HECHA') NOT NULL DEFAULT 'PENDIENTE',
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atendida_por` int DEFAULT NULL,
  `atendida_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_modificacion`),
  KEY `fk_mod_reporte` (`id_reporte`),
  KEY `fk_mod_solicitante` (`id_solicitante`),
  KEY `fk_mod_atendida` (`atendida_por`),
  KEY `idx_mod_estado` (`estado`,`creada_en`),
  CONSTRAINT `fk_mod_atendida` FOREIGN KEY (`atendida_por`) REFERENCES `empleado` (`id_empleado`),
  CONSTRAINT `fk_mod_reporte` FOREIGN KEY (`id_reporte`) REFERENCES `reporte` (`id_reporte`) ON DELETE CASCADE,
  CONSTRAINT `fk_mod_solicitante` FOREIGN KEY (`id_solicitante`) REFERENCES `empleado` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_habitacion` (
  `id_tipo_hab` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id_tipo_hab`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turno` (
  `id_turno` tinyint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(30) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id_turno`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


