-- ========================================================================
-- SISTEMA DE GESTIÓN DE MANTENIMIENTO (CMMS) - HOTEL CORTÉZ
-- Archivo: 02_seed.sql
-- Datos iniciales y catálogo de prueba
-- ========================================================================

USE hotel_cortez;

-- 1. ÁREAS DEL HOTEL
INSERT INTO area (id_area, nombre_area, descripcion) VALUES
(1, 'Gobernanza (Housekeeping)', 'Personal encargado de limpieza, confort y reporte de fallas en habitaciones'),
(2, 'Mantenimiento', 'Equipo técnico responsable de reparaciones e infraestructura física'),
(3, 'Recepción', 'Atención al huésped y gestión de habitaciones operativas/bloqueadas'),
(4, 'Administración y Gerencia', 'Supervisión general, asignación de presupuesto y análisis de KPIs');

-- 2. CARGOS
INSERT INTO cargo (id_cargo, id_area, nombre_cargo, descripcion) VALUES
(1, 1, 'Camarera de Piso', 'Inspección diaria de habitaciones y reporte de averías'),
(2, 1, 'Supervisora de Gobernanza', 'Control de calidad de habitaciones y verificación de cierres'),
(3, 2, 'Técnico de Climatización (HVAC)', 'Mantenimiento preventivo y correctivo de aires acondicionados y refrigeración'),
(4, 2, 'Técnico Electricista', 'Red eléctrica, paneles, luminarias y equipos de potencia'),
(5, 2, 'Técnico Plomero', 'Sistemas sanitarios, tuberías, bombas de agua y griferías'),
(6, 2, 'Jefe de Mantenimiento', 'Triaje de solicitudes, asignación técnica y control de inventario'),
(7, 4, 'Gerente de Operaciones', 'Visualización de métricas ejecutivas y tiempos de respuesta');

-- 3. ESTADOS DE EMPLEADO
INSERT INTO estado_empleado (id_estado_empleado, nombre_estado) VALUES
(1, 'Activo'),
(2, 'De Vacaciones'),
(3, 'Con Permiso'),
(4, 'De Baja');

-- 4. EMPLEADOS INICIALES (Contraseña de prueba para todos: 'Password123*')
-- password_hash generado con bcrypt ($2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C)
INSERT INTO empleado (id_empleado, id_area, id_cargo, id_estado_empleado, ci, nombre, email, password_hash, rol_sistema) VALUES
(1, 4, 7, 1, '4567891', 'Carlos Mendoza', 'gerencia@hotelcortez.com', '$2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C', 'ADMIN'),
(2, 2, 6, 1, '3456782', 'Ing. Roberto Paz', 'mantenimiento@hotelcortez.com', '$2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C', 'SUPERVISOR'),
(3, 1, 1, 1, '7891234', 'María Condori', 'gobernanza@hotelcortez.com', '$2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C', 'OPERATIVO'),
(4, 2, 3, 1, '5678912', 'Juan Quispe (HVAC)', 'juan.hvac@hotelcortez.com', '$2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C', 'TECNICO'),
(5, 2, 5, 1, '6789123', 'Luis Flores (Plomería)', 'luis.plomero@hotelcortez.com', '$2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C', 'TECNICO'),
(6, 2, 4, 1, '8912345', 'David Vargas (Electricidad)', 'david.electrico@hotelcortez.com', '$2b$10$wTqB0qHw2Q8c9K8X.Z/5pe.E4zD2sZ1u4N7F.N3xV9P8k1m.L1Q5C', 'TECNICO');

-- 5. UBICACIONES DEL HOTEL CORTÉZ
-- Habitaciones Piso 1
INSERT INTO ubicacion (tipo, identificador, piso, descripcion, estado_operativo) VALUES
('HABITACION', 'Habitación 101', 1, 'Habitación Doble Standard', 'OPERATIVO'),
('HABITACION', 'Habitación 102', 1, 'Habitación Doble Standard', 'OPERATIVO'),
('HABITACION', 'Habitación 103', 1, 'Habitación Matrimonial', 'OPERATIVO'),
('HABITACION', 'Habitación 104', 1, 'Habitación Matrimonial', 'OPERATIVO'),
('HABITACION', 'Habitación 105', 1, 'Suite Junior', 'OPERATIVO');

-- Habitaciones Piso 2
INSERT INTO ubicacion (tipo, identificador, piso, descripcion, estado_operativo) VALUES
('HABITACION', 'Habitación 201', 2, 'Habitación Ejecutiva', 'OPERATIVO'),
('HABITACION', 'Habitación 202', 2, 'Habitación Ejecutiva', 'OPERATIVO'),
('HABITACION', 'Habitación 203', 2, 'Habitación Matrimonial', 'OPERATIVO'),
('HABITACION', 'Habitación 204', 2, 'Suite Presidencial', 'OPERATIVO'),
('HABITACION', 'Habitación 205', 2, 'Habitación Doble', 'OPERATIVO');

-- Áreas Comunes y Equipos Críticos
INSERT INTO ubicacion (tipo, identificador, piso, descripcion, estado_operativo) VALUES
('AREA_COMUN', 'Lobby y Recepción', 1, 'Área de bienvenida y mostradores de atención', 'OPERATIVO'),
('AREA_COMUN', 'Restaurante Las Palmeras', 1, 'Salón principal de comidas y desayunador', 'OPERATIVO'),
('AREA_COMUN', 'Piscina Central', 1, 'Área de esparcimiento exterior y bombas de agua', 'OPERATIVO'),
('AREA_COMUN', 'Cocina General', 1, 'Cocina industrial de producción', 'OPERATIVO'),
('AREA_COMUN', 'Lavandería Central', 0, 'Sótano: secadoras y calderas de vapor', 'OPERATIVO'),
('EQUIPO_CRITICO', 'Chiller Principal (Enfriador Central)', 0, 'Sótano: Unidad central de climatización del hotel', 'OPERATIVO');

-- 6. ESPECIALIDADES
INSERT INTO especialidad (id_especialidad, nombre_especialidad) VALUES
(1, 'Plomería y Red Sanitaria'),
(2, 'Electricidad e Iluminación'),
(3, 'Refrigeración y Climatización (HVAC)'),
(4, 'Cerrajería y Carpintería'),
(5, 'Pintura y Mampostería');

-- 7. TIPOS DE INCIDENTE
INSERT INTO tipo_incidente (id_especialidad, codigo, nombre_tipo, descripcion) VALUES
(1, 'PL-01', 'Fuga de agua en sanitario / inodoro', 'Pérdida constante de agua o empaque roto'),
(1, 'PL-02', 'Baja presión o falta de agua caliente en ducha', 'Falla en termotanque o tubería obstruida'),
(1, 'PL-03', 'Desagüe obstruido en lavamanos o tina', 'Retención de agua en desagüe'),
(2, 'EL-01', 'Luminaria o foco quemado', 'Foco fundido o parpadeante'),
(2, 'EL-02', 'Tomacorriente sin energía eléctrica', 'Sin paso de corriente en enchufe'),
(2, 'EL-03', 'Disyuntor saltado / corte de luz en habitación', 'Sobrecarga de circuito'),
(3, 'HV-01', 'Aire acondicionado no enfría', 'Ventila pero no climatiza (posible fuga de gas o filtro sucio)'),
(3, 'HV-02', 'Goteo interior de agua desde unidad de aire', 'Bandeja de condensado obstruida'),
(3, 'HV-03', 'Ruido anormal excesivo en motor de aire', 'Vibración mecánica o turbina suelta'),
(4, 'CE-01', 'Cerradura electrónica no lee tarjeta o sin batería', 'Puerta trabada o luz roja constante'),
(4, 'CE-02', 'Bisagra o puerta de clóset desencajada', 'Dificultad para cerrar');

-- 8. PRIORIDADES (CON TIEMPOS OBJETIVO SLA)
INSERT INTO prioridad (id_prioridad, nombre, nivel_prioridad, tiempo_objetivo_horas) VALUES
(1, 'Emergencia (Inmediata)', 1, 1.00),    -- Máximo 1 hora (ej: inundación, huésped sin aire con calor)
(2, 'Alta', 2, 3.00),                   -- Máximo 3 horas (habitación ocupada con falla menor)
(3, 'Media', 3, 12.00),                 -- Máximo 12 horas (habitación vacía para venta al día siguiente)
(4, 'Baja (Mantenimiento General)', 4, 48.00); -- Hasta 48 horas (detalles estéticos o preventivos)

-- 9. ESTADOS DEL INCIDENTE
INSERT INTO estado_incidente (id_estado, nombre_estado, descripcion) VALUES
(1, 'Pendiente', 'Solicitud registrada por Gobernanza pendiente de triaje técnico'),
(2, 'Asignado', 'Incidente categorizado y asignado a un técnico de mantenimiento'),
(3, 'En Proceso', 'El técnico ha iniciado activamente los trabajos de reparación'),
(4, 'En Espera de Repuestos', 'Trabajo pausado por falta de material en almacén'),
(5, 'Resuelto', 'Técnico finalizó la reparación y registró solución'),
(6, 'Verificado y Cerrado', 'Supervisión confirmó que la avería fue resuelta satisfactoriamente');

-- 10. MATERIALES Y REPUESTOS EN STOCK
INSERT INTO material (id_material, nombre_mat, unidad_medida, stock) VALUES
(1, 'Empaque de goma 1/2 pulgada para grifo', 'Unidad', 50.00),
(2, 'Foco LED 12W luz cálida rosca E27', 'Unidad', 80.00),
(3, 'Tomacorriente doble universal con placa', 'Unidad', 25.00),
(4, 'Filtro lavable para aire acondicionado Split', 'Unidad', 15.00),
(5, 'Pilas alcalinas AA (Pack 4 unidades)', 'Juego', 40.00),
(6, 'Cartucho de silicona antihongos transparente', 'Unidad', 12.00),
(7, 'Cinta aislante 3M negra 20 metros', 'Rollo', 30.00),
(8, 'Válvula de descarga para inodoro', 'Unidad', 10.00);

