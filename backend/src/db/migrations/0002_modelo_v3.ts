// Modelo V3: consolida las tablas beta, incorpora lo esencial del diagrama
// "gestion_incidentes" (turnos con horario, CI, tipo de habitación, dificultad,
// especialidad asignada, reportes Hecho/Pendiente, solicitudes de modificación)
// y reemplaza fecha+hora separadas por DATETIME.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Migracion } from '../migrar.js';
import { columnaExiste, tablaExiste } from '../esquema.js';
import { env } from '../../config/env.js';

const MOTOR = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

export const m0002: Migracion = {
    id: '0002_modelo_v3',
    descripcion: 'Modelo V3: turnos, dificultad, reportes, modificaciones, eventos y sesiones',
    async up(c) {
        const q = (sql: string, p: unknown[] = []) => c.query(sql, p);
        const tieneOcupacion = await tablaExiste(c, 'beta_solicitud_ocupacion');
        const tieneTurnoBeta = await tablaExiste(c, 'beta_empleado_turno');

        // ---------- 1. Catálogos nuevos ----------
        await q(
            `CREATE TABLE turno (
            id_turno TINYINT AUTO_INCREMENT PRIMARY KEY,
            codigo VARCHAR(10) NOT NULL UNIQUE,
            nombre VARCHAR(30) NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL)` + MOTOR
        );
        await q(`INSERT INTO turno (codigo, nombre, hora_inicio, hora_fin) VALUES
            ('MANANA','Mañana','06:00','14:00'), ('TARDE','Tarde','14:00','22:00'), ('NOCHE','Noche','22:00','06:00')`);

        await q(
            `CREATE TABLE tipo_habitacion (
            id_tipo_hab INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(50) NOT NULL UNIQUE)` + MOTOR
        );

        await q(
            `CREATE TABLE dificultad (
            id_dificultad TINYINT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(20) NOT NULL UNIQUE,
            orden TINYINT NOT NULL)` + MOTOR
        );
        await q(`INSERT INTO dificultad (nombre, orden) VALUES ('Fácil',1), ('Medio',2), ('Difícil',3)`);

        await q(`INSERT INTO estado_empleado (id_estado_empleado, nombre_estado)
            SELECT 4, 'Pendiente de aprobación' FROM DUAL
            WHERE NOT EXISTS (SELECT 1 FROM estado_empleado WHERE id_estado_empleado = 4)`);

        // ---------- 2. Empleado ----------
        await q(`UPDATE empleado SET rol = 'MUCAMA' WHERE rol IS NULL OR rol NOT IN ('MUCAMA','TECNICO','SUPERVISOR')`);
        await q(`ALTER TABLE empleado
            MODIFY telefono VARCHAR(20) NULL,
            MODIFY rol ENUM('MUCAMA','TECNICO','SUPERVISOR') NOT NULL,
            ADD COLUMN ci VARCHAR(15) NULL AFTER id_empleado,
            ADD COLUMN id_turno TINYINT NULL AFTER rol,
            ADD COLUMN password_hash VARCHAR(100) NULL,
            ADD COLUMN creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ADD UNIQUE KEY uq_empleado_ci (ci),
            ADD CONSTRAINT fk_empleado_turno FOREIGN KEY (id_turno) REFERENCES turno(id_turno)`);
        if (tieneTurnoBeta)
            await q(`UPDATE empleado e JOIN beta_empleado_turno b USING (id_empleado)
                JOIN turno t ON t.codigo = b.turno SET e.id_turno = t.id_turno`);
        await q(`UPDATE empleado SET id_turno = CASE
            WHEN rol = 'TECNICO' AND id_empleado = 3 THEN 2
            WHEN rol = 'TECNICO' AND id_empleado = 4 THEN 3
            ELSE 1 END WHERE id_turno IS NULL`);

        // ---------- 3. Habitación ----------
        await q(`INSERT IGNORE INTO tipo_habitacion (nombre)
            SELECT DISTINCT TRIM(tipo_hab) FROM habitacion WHERE tipo_hab IS NOT NULL AND TRIM(tipo_hab) <> ''`);
        await q(`INSERT IGNORE INTO tipo_habitacion (nombre) VALUES ('Simple'), ('Doble'), ('Matrimonial'), ('Suite')`);
        await q(`ALTER TABLE habitacion
            ADD COLUMN id_tipo_hab INT NULL AFTER piso,
            ADD COLUMN id_mucama INT NULL,
            ADD CONSTRAINT fk_habitacion_tipo FOREIGN KEY (id_tipo_hab) REFERENCES tipo_habitacion(id_tipo_hab),
            ADD CONSTRAINT fk_habitacion_mucama FOREIGN KEY (id_mucama) REFERENCES empleado(id_empleado)`);
        await q(`UPDATE habitacion h JOIN tipo_habitacion t ON t.nombre = TRIM(h.tipo_hab) SET h.id_tipo_hab = t.id_tipo_hab`);
        await q(`UPDATE habitacion h JOIN beta_habitacion_mucama b USING (id_habitacion) SET h.id_mucama = b.id_empleado`);
        await q(`ALTER TABLE habitacion DROP COLUMN tipo_hab`);

        // ---------- 4. Material ----------
        await q(`UPDATE material SET nombre_mat = TRIM(nombre_mat)`);
        await q(`ALTER TABLE material
            MODIFY nombre_mat VARCHAR(80) NOT NULL,
            ADD COLUMN unidad VARCHAR(20) NOT NULL DEFAULT 'unidad',
            ADD COLUMN stock DECIMAL(10,2) NULL,
            ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE`);

        // ---------- 5. Solicitud ----------
        await q(`ALTER TABLE solicitud
            ADD COLUMN id_habitacion INT NULL AFTER id_empleado,
            ADD COLUMN ocupacion ENUM('LIBRE','OCUPADA','RESERVADA') NOT NULL DEFAULT 'LIBRE',
            ADD COLUMN nivel_prioridad TINYINT NOT NULL DEFAULT 2,
            ADD COLUMN foto VARCHAR(100) NULL,
            ADD COLUMN estado ENUM('SIN_ASIGNAR','ASIGNADA','EN_PROCESO','PENDIENTE','RESUELTA','ANULADA') NOT NULL DEFAULT 'SIN_ASIGNAR',
            ADD COLUMN creada_en DATETIME NULL,
            ADD COLUMN actualizada_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP`);
        await q(`UPDATE solicitud SET creada_en = TIMESTAMP(fecha, hora_inicial)`);
        await q(`UPDATE solicitud s JOIN (SELECT id_solicitud, MIN(id_habitacion) h FROM solicitud_habitacion GROUP BY id_solicitud) x
            USING (id_solicitud) SET s.id_habitacion = x.h`);
        // Solicitudes sin habitación no son recuperables (no ocurre con datos reales)
        await q(`DELETE FROM solicitud WHERE id_habitacion IS NULL`);
        if (tieneOcupacion)
            await q(`UPDATE solicitud s JOIN beta_solicitud_ocupacion o USING (id_solicitud)
                SET s.ocupacion = CASE o.ocupacion WHEN 'OCUPADA' THEN 'OCUPADA' WHEN 'RESERVADA' THEN 'RESERVADA' ELSE 'LIBRE' END,
                    s.nivel_prioridad = o.nivel_prioridad`);
        await q(`UPDATE solicitud s JOIN incidente i USING (id_solicitud) JOIN prioridad p USING (id_prioridad)
            SET s.nivel_prioridad = LEAST(GREATEST(p.nivel_prioridad, 0), 3)`);
        await q(`ALTER TABLE solicitud
            MODIFY id_habitacion INT NOT NULL,
            MODIFY creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            MODIFY problema TEXT NOT NULL,
            DROP COLUMN fecha,
            DROP COLUMN hora_inicial,
            ADD CONSTRAINT fk_solicitud_habitacion FOREIGN KEY (id_habitacion) REFERENCES habitacion(id_habitacion),
            ADD CONSTRAINT chk_solicitud_prioridad CHECK (nivel_prioridad BETWEEN 0 AND 3),
            ADD INDEX idx_solicitud_estado (estado, nivel_prioridad, creada_en),
            ADD INDEX idx_solicitud_creada (creada_en)`);

        // Fotos: de base64 en MySQL a archivos en disco
        await mkdir(env.carpetaFotos, { recursive: true });
        const [fotos]: any = await q('SELECT id_solicitud, foto FROM beta_solicitud_foto');
        for (const f of fotos) {
            const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/s.exec(f.foto || '');
            if (!m) continue;
            const archivo = `${randomUUID()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
            await writeFile(path.join(env.carpetaFotos, archivo), Buffer.from(m[2], 'base64'));
            await q('UPDATE solicitud SET foto = ? WHERE id_solicitud = ?', [archivo, f.id_solicitud]);
        }

        // ---------- 6. Trabajo técnico: asignación, reporte, materiales ----------
        await q('RENAME TABLE asignacion TO v2_asignacion, asignacion_material TO v2_asignacion_material, incidente TO v2_incidente');

        await q(
            `CREATE TABLE asignacion (
            id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
            id_solicitud INT NOT NULL UNIQUE,
            id_tecnico INT NOT NULL,
            asignado_por INT NULL,
            id_dificultad TINYINT NULL,
            id_especialidad INT NULL,
            asignada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            iniciada_en DATETIME NULL,
            finalizada_en DATETIME NULL,
            diagnostico TEXT NULL,
            CONSTRAINT fk_asig_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
            CONSTRAINT fk_asig_tecnico FOREIGN KEY (id_tecnico) REFERENCES empleado(id_empleado),
            CONSTRAINT fk_asig_por FOREIGN KEY (asignado_por) REFERENCES empleado(id_empleado),
            CONSTRAINT fk_asig_dificultad FOREIGN KEY (id_dificultad) REFERENCES dificultad(id_dificultad),
            CONSTRAINT fk_asig_especialidad FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad),
            INDEX idx_asig_tecnico (id_tecnico, finalizada_en))` + MOTOR
        );

        await q(
            `CREATE TABLE reporte (
            id_reporte INT AUTO_INCREMENT PRIMARY KEY,
            id_asignacion INT NOT NULL,
            id_autor INT NOT NULL,
            resultado ENUM('HECHO','PENDIENTE') NOT NULL,
            observacion TEXT NOT NULL,
            motivo_pendiente TEXT NULL,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME NULL,
            CONSTRAINT fk_rep_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignacion(id_asignacion) ON DELETE CASCADE,
            CONSTRAINT fk_rep_autor FOREIGN KEY (id_autor) REFERENCES empleado(id_empleado),
            INDEX idx_rep_asignacion (id_asignacion, creado_en))` + MOTOR
        );

        await q(
            `CREATE TABLE reporte_material (
            id_reporte INT NOT NULL,
            id_material INT NOT NULL,
            cantidad DECIMAL(10,2) NOT NULL,
            PRIMARY KEY (id_reporte, id_material),
            CONSTRAINT fk_repmat_reporte FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte) ON DELETE CASCADE,
            CONSTRAINT fk_repmat_material FOREIGN KEY (id_material) REFERENCES material(id_material),
            CONSTRAINT chk_repmat_cantidad CHECK (cantidad > 0))` + MOTOR
        );

        await q(
            `CREATE TABLE solicitud_modificacion (
            id_modificacion INT AUTO_INCREMENT PRIMARY KEY,
            id_reporte INT NOT NULL,
            id_solicitante INT NOT NULL,
            detalle TEXT NOT NULL,
            estado ENUM('PENDIENTE','HECHA') NOT NULL DEFAULT 'PENDIENTE',
            creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atendida_por INT NULL,
            atendida_en DATETIME NULL,
            CONSTRAINT fk_mod_reporte FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte) ON DELETE CASCADE,
            CONSTRAINT fk_mod_solicitante FOREIGN KEY (id_solicitante) REFERENCES empleado(id_empleado),
            CONSTRAINT fk_mod_atendida FOREIGN KEY (atendida_por) REFERENCES empleado(id_empleado),
            INDEX idx_mod_estado (estado, creada_en))` + MOTOR
        );

        await q(
            `CREATE TABLE solicitud_evento (
            id_evento BIGINT AUTO_INCREMENT PRIMARY KEY,
            id_solicitud INT NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            id_empleado INT NULL,
            detalle VARCHAR(500) NULL,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_evento_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
            CONSTRAINT fk_evento_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado),
            INDEX idx_evento_solicitud (id_solicitud, creado_en))` + MOTOR
        );

        await q(
            `CREATE TABLE sesion (
            token_hash CHAR(64) PRIMARY KEY,
            id_empleado INT NOT NULL,
            creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expira_en DATETIME NOT NULL,
            CONSTRAINT fk_sesion_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE CASCADE,
            INDEX idx_sesion_expira (expira_en))` + MOTOR
        );

        await q(
            `CREATE TABLE push_suscripcion (
            id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
            id_empleado INT NOT NULL,
            endpoint VARCHAR(500) NOT NULL,
            p256dh VARCHAR(200) NOT NULL,
            auth VARCHAR(100) NOT NULL,
            creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_push_endpoint (endpoint),
            CONSTRAINT fk_push_empleado FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE CASCADE)` + MOTOR
        );

        // ---------- 7. Migrar datos V2 de trabajo técnico ----------
        const asignadoPor = tieneOcupacion ? 'o.asignado_por' : 'NULL';
        const joinOcup = tieneOcupacion ? 'LEFT JOIN beta_solicitud_ocupacion o ON o.id_solicitud = i.id_solicitud' : '';
        await q(`INSERT INTO asignacion (id_solicitud, id_tecnico, asignado_por, id_especialidad, asignada_en, iniciada_en, finalizada_en, diagnostico)
            SELECT i.id_solicitud, a.id_empleado, ${asignadoPor}, t.id_especialidad,
                TIMESTAMP(a.fecha_asignacion, a.hora_asignacion), TIMESTAMP(a.fecha_asignacion, a.hora_asignacion),
                IF(ei.estado, TIMESTAMP(COALESCE(a.fecha_fin, a.fecha_asignacion), COALESCE(a.hora_fin, a.hora_asignacion)), NULL),
                IF(ei.estado, NULL, COALESCE(i.observacion, a.observaciones))
            FROM v2_incidente i JOIN v2_asignacion a ON a.id_asignacion = i.id_asignacion
            JOIN estado_incidente ei ON ei.id_estado = i.id_estado
            LEFT JOIN tipo_incidente t ON t.id_tipo_incidente = i.id_tipo_incidente
            ${joinOcup}
            JOIN solicitud s ON s.id_solicitud = i.id_solicitud
            WHERE i.id_incidente = (SELECT MIN(i2.id_incidente) FROM v2_incidente i2 WHERE i2.id_solicitud = i.id_solicitud)`);
        if (tieneOcupacion)
            await q(`INSERT IGNORE INTO asignacion (id_solicitud, id_tecnico, asignado_por, asignada_en)
                SELECT o.id_solicitud, o.tecnico_asignado, o.asignado_por, COALESCE(o.fecha_asignado, NOW())
                FROM beta_solicitud_ocupacion o JOIN solicitud s USING (id_solicitud) WHERE o.tecnico_asignado IS NOT NULL`);

        // Reporte HECHO para los incidentes resueltos, con sus materiales
        await q(`INSERT INTO reporte (id_asignacion, id_autor, resultado, observacion, creado_en)
            SELECT na.id_asignacion, na.id_tecnico, 'HECHO', COALESCE(i.observacion, a.observaciones, 'Reparación finalizada'), na.finalizada_en
            FROM asignacion na JOIN v2_incidente i ON i.id_solicitud = na.id_solicitud
            JOIN v2_asignacion a ON a.id_asignacion = i.id_asignacion
            WHERE na.finalizada_en IS NOT NULL
              AND i.id_incidente = (SELECT MIN(i2.id_incidente) FROM v2_incidente i2 WHERE i2.id_solicitud = i.id_solicitud)`);
        await q(`INSERT INTO reporte_material (id_reporte, id_material, cantidad)
            SELECT r.id_reporte, am.id_material, SUM(am.cantidad)
            FROM reporte r JOIN asignacion na USING (id_asignacion)
            JOIN v2_incidente i ON i.id_solicitud = na.id_solicitud
            JOIN v2_asignacion_material am ON am.id_asignacion = i.id_asignacion
            WHERE i.id_incidente = (SELECT MIN(i2.id_incidente) FROM v2_incidente i2 WHERE i2.id_solicitud = i.id_solicitud)
            GROUP BY r.id_reporte, am.id_material`);
        // Materiales de trabajos aún abiertos: se conservan como texto en el diagnóstico
        await q(`UPDATE asignacion na JOIN (
                SELECT i.id_solicitud, GROUP_CONCAT(CONCAT(m.nombre_mat, ' x', am.cantidad) SEPARATOR ', ') AS mats
                FROM v2_incidente i JOIN v2_asignacion_material am ON am.id_asignacion = i.id_asignacion
                JOIN material m USING (id_material) GROUP BY i.id_solicitud) x USING (id_solicitud)
            SET na.diagnostico = CONCAT(COALESCE(na.diagnostico, ''), '\nMateriales registrados: ', x.mats)
            WHERE na.finalizada_en IS NULL`);

        // Estado de cada solicitud según su trabajo
        await q(`UPDATE solicitud s LEFT JOIN asignacion a USING (id_solicitud) SET s.estado = CASE
            WHEN a.finalizada_en IS NOT NULL THEN 'RESUELTA'
            WHEN a.iniciada_en IS NOT NULL THEN 'EN_PROCESO'
            WHEN a.id_asignacion IS NOT NULL THEN 'ASIGNADA'
            ELSE 'SIN_ASIGNAR' END`);

        // Historial de eventos (trazabilidad y base de los indicadores)
        await q(`INSERT INTO solicitud_evento (id_solicitud, tipo, id_empleado, creado_en)
            SELECT id_solicitud, 'REPORTADA', id_empleado, creada_en FROM solicitud`);
        await q(`INSERT INTO solicitud_evento (id_solicitud, tipo, id_empleado, detalle, creado_en)
            SELECT id_solicitud, 'ASIGNADA', COALESCE(asignado_por, id_tecnico), CONCAT('Técnico #', id_tecnico), asignada_en FROM asignacion`);
        await q(`INSERT INTO solicitud_evento (id_solicitud, tipo, id_empleado, creado_en)
            SELECT id_solicitud, 'INICIADA', id_tecnico, iniciada_en FROM asignacion WHERE iniciada_en IS NOT NULL`);
        await q(`INSERT INTO solicitud_evento (id_solicitud, tipo, id_empleado, creado_en)
            SELECT id_solicitud, 'RESUELTA', id_tecnico, finalizada_en FROM asignacion WHERE finalizada_en IS NOT NULL`);

        // Habitación operativa solo si no tiene solicitudes abiertas
        await q(`UPDATE habitacion h SET h.estado = NOT EXISTS (
            SELECT 1 FROM solicitud s WHERE s.id_habitacion = h.id_habitacion AND s.estado NOT IN ('RESUELTA','ANULADA'))`);

        // ---------- 8. Retirar estructuras reemplazadas ----------
        await q('SET FOREIGN_KEY_CHECKS = 0');
        for (const t of [
            'v2_incidente',
            'v2_asignacion_material',
            'v2_asignacion',
            'solicitud_habitacion',
            'beta_solicitud_foto',
            'beta_habitacion_mucama',
            'beta_solicitud_ocupacion',
            'beta_empleado_turno',
            'prioridad',
            'estado_incidente',
            'tipo_incidente',
            'supervisor'
        ])
            await q('DROP TABLE IF EXISTS `' + t + '`');
        await q('SET FOREIGN_KEY_CHECKS = 1');

        // Materiales duplicados (mismo nombre sin distinguir mayúsculas/acentos) se fusionan
        const [dups]: any = await q(`SELECT m.id_material, k.id_keep FROM material m
            JOIN (SELECT MIN(id_material) id_keep, nombre_mat FROM material GROUP BY nombre_mat) k
            ON k.nombre_mat = m.nombre_mat AND k.id_keep <> m.id_material`);
        for (const d of dups) {
            await q(
                `INSERT INTO reporte_material (id_reporte, id_material, cantidad)
                SELECT id_reporte, ?, cantidad FROM reporte_material WHERE id_material = ?
                ON DUPLICATE KEY UPDATE cantidad = reporte_material.cantidad + VALUES(cantidad)`,
                [d.id_keep, d.id_material]
            );
            await q('DELETE FROM reporte_material WHERE id_material = ?', [d.id_material]);
            await q('DELETE FROM material WHERE id_material = ?', [d.id_material]);
        }
        await q('ALTER TABLE material ADD UNIQUE KEY uq_material_nombre (nombre_mat)');
        if (!(await columnaExiste(c, 'especialidad', 'nombre_especialidad'))) throw new Error('Esquema de especialidad inesperado');
    }
};
