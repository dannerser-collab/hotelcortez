-- ========================================================================
-- DATOS INICIALES PARA EL NUEVO MODELO FÍSICO
-- Archivo: 02_nuevo_seed.sql
-- ========================================================================

USE hotel_cortez;

-- 1. Estados de Empleado y Áreas
INSERT INTO estado_empleado (id_estado_empleado, nombre_estado) VALUES
(1, 'Activo'),
(2, 'De Vacaciones'),
(3, 'De Baja');

INSERT INTO area (id_area, nombre_area) VALUES
(1, 'Gobernanza (Mucamas)'),
(2, 'Mantenimiento (Técnicos)'),
(3, 'Supervisión y Control');

-- 2. Empleados y Supervisor
INSERT INTO empleado (id_empleado, id_area, id_estado_empleado, nombre, apellido, telefono, rol) VALUES
(1, 1, 1, 'María Fernanda', 'López', 78912345, 'MUCAMA'),
(2, 2, 1, 'Jorge', 'Paredes', 71234567, 'TECNICO'),
(3, 2, 1, 'Carlos', 'Ruiz', 72345678, 'TECNICO'),
(4, 2, 1, 'Luis', 'Torres', 73456789, 'TECNICO'),
(5, 3, 1, 'Roberto', 'Paz', 70123456, 'SUPERVISOR');

INSERT INTO supervisor (id_supervisor, id_empleado) VALUES
(1, 5);

-- 3. Bloques
INSERT INTO bloque (id_bloque, bloque) VALUES
(1, 100),
(2, 200),
(3, 300),
(4, 400),
(5, 500);

-- 4. Habitaciones (Con soporte para Hab 354 en Bloque 300 y Hab 437 en Bloque 400)
INSERT INTO habitacion (id_habitacion, id_bloque, numero, piso, tipo_hab, estado) VALUES
-- Bloque 100 (Piso 1)
(1, 1, '101', 1, 'Doble Standard', TRUE),
(2, 1, '102', 1, 'Doble Standard', FALSE), -- Fuga en lavabo
(3, 1, '105', 1, 'Matrimonial', TRUE),
(4, 1, '108', 1, 'Suite', FALSE),

-- Bloque 200 (Piso 2)
(5, 2, '201', 2, 'Ejecutiva', TRUE),
(6, 2, '204', 2, 'Suite Presidencial', TRUE),

-- Bloque 300 (Piso 3)
(7, 3, '301', 3, 'Matrimonial', TRUE),
(8, 3, '354', 3, 'Suite Ejecutiva', TRUE), -- Habitación 354 solicitada por el usuario

-- Bloque 400 (Piso 4)
(9, 4, '431', 4, 'Doble', TRUE),
(10, 4, '434', 4, 'Suite Junior', FALSE),
(11, 4, '437', 4, 'Suite Junior', FALSE), -- Bloqueada por A/C
(12, 4, '439', 4, 'Matrimonial', TRUE),

-- Bloque 500 (Piso 5 / 6)
(13, 5, '501', 5, 'Doble', TRUE),
(14, 5, '601', 6, 'Suite Deluxe', FALSE);

-- 5. Especialidades y Tipos de Incidente
INSERT INTO especialidad (id_especialidad, nombre_especialidad) VALUES
(1, 'Plomería y Grifería'),
(2, 'Electricidad e Iluminación'),
(3, 'Aire Acondicionado (HVAC)'),
(4, 'Cerrajería y Carpintería'),
(5, 'Mantenimiento General');

INSERT INTO tipo_incidente (id_tipo_incidente, id_especialidad, descripcion) VALUES
(1, 1, 'Fuga de agua en inodoro o lavamanos'),
(2, 1, 'Baja presión de agua o sin agua caliente'),
(3, 2, 'Luminaria o foco quemado / parpadeando'),
(4, 2, 'Tomacorriente sin energía eléctrica o en corto'),
(5, 3, 'Aire acondicionado no enfría o gotea agua'),
(6, 4, 'Cerradura electrónica no abre o sin batería');

-- 6. Prioridades y Estados
INSERT INTO prioridad (id_prioridad, nivel_prioridad) VALUES
(1, 1), -- Alta / Emergencia (Bloquea Check-in)
(2, 2), -- Media (Atender hoy)
(3, 3); -- Baja (Fin de turno)

INSERT INTO estado_incidente (id_estado, estado) VALUES
(1, FALSE), -- En Proceso / Pendiente
(2, TRUE);  -- Resuelto / Concluido

-- 7. Materiales
INSERT INTO material (id_material, nombre_mat) VALUES
(1, 'Empaque de goma 1/2 pulgada'),
(2, 'Foco LED 12W luz cálida E27'),
(3, 'Filtro lavable para Split A/C'),
(4, 'Pilas alcalinas AA (Pack 4)'),
(5, 'Cinta aislante 3M negra'),
(6, 'Cartucho de silicona antihongos');

-- 8. Incidente inicial de prueba (Habitación 437)
INSERT INTO solicitud (id_solicitud, id_empleado, fecha, hora_inicial, problema) VALUES
(1, 1, CURDATE(), '09:42:00', 'El A/C hace ruido fuerte y no enfría. Gotea agua junto a la ventana. Huésped reportó a las 09:30.');

INSERT INTO solicitud_habitacion (id_solicitud, id_habitacion) VALUES
(1, 11); -- Habitación 437

INSERT INTO asignacion (id_asignacion, id_empleado, fecha_asignacion, hora_asignacion, fecha_fin, hora_fin, observaciones) VALUES
(1, 2, CURDATE(), '10:00:00', NULL, NULL, 'Asignado a Jorge Paredes. Limpieza de turbina y cambio de filtro.');

INSERT INTO asignacion_material (id_asignacion, id_material, cantidad) VALUES
(1, 3, 1); -- 1 Filtro A/C

INSERT INTO incidente (id_incidente, id_tipo_incidente, id_asignacion, id_solicitud, id_supervisor, id_prioridad, id_estado, observacion) VALUES
(1, 5, 1, 1, 1, 1, 1, 'Alta — Bloquea Check-in de las 15:00. Habitación con reserva.');
