// Tipos del dominio, iguales a lo que devuelve la API (backend/src/modules/*).
export type Rol = 'MUCAMA' | 'TECNICO' | 'SUPERVISOR';
export type Ocupacion = 'LIBRE' | 'OCUPADA' | 'RESERVADA';
export type EstadoSolicitud = 'SIN_ASIGNAR' | 'ASIGNADA' | 'EN_PROCESO' | 'PENDIENTE' | 'RESUELTA' | 'ANULADA';
export type CodigoTurno = 'MANANA' | 'TARDE' | 'NOCHE';

export type Usuario = {
    id_empleado: number;
    codigo: string;
    nombre: string;
    apellido: string;
    rol: Rol;
    turno: CodigoTurno | null;
};

export type Turno = { id_turno: number; codigo: CodigoTurno; nombre: string; hora_inicio: string; hora_fin: string };

export type Habitacion = {
    id_habitacion: number;
    numero: string;
    piso: number;
    bloque: number;
    operativa: number;
    id_tipo_hab: number | null;
    tipo_habitacion: string | null;
    id_mucama: number | null;
    mucama: string | null;
    abiertas: number;
};

export type Tecnico = {
    id_empleado: number;
    codigo: string;
    nombre: string;
    apellido: string;
    turno: CodigoTurno | null;
    activos: number;
    de_turno: boolean;
};

export type Material = { id_material: number; nombre: string; unidad: string; stock: number | null; activo: number };

export type Catalogos = {
    turnos: Turno[];
    turno_actual: CodigoTurno | null;
    habitaciones: Habitacion[];
    bloques: number[];
    tipos_habitacion: { id_tipo_hab: number; nombre: string }[];
    especialidades: { id_especialidad: number; nombre: string }[];
    dificultades: { id_dificultad: number; nombre: string }[];
    materiales: Material[];
    tecnicos: Tecnico[];
    mucamas: { id_empleado: number; nombre: string; apellido: string; turno: CodigoTurno | null }[];
    push: string | null;
};

export type Solicitud = {
    id_solicitud: number;
    codigo: string;
    problema: string;
    ocupacion: Ocupacion;
    nivel_prioridad: number;
    estado: EstadoSolicitud;
    creada_en: string;
    actualizada_en: string | null;
    foto: string | null;
    tiene_foto: boolean;
    id_habitacion: number;
    numero: string;
    piso: number;
    bloque: number;
    tipo_habitacion: string | null;
    id_mucama: number;
    mucama: string;
    turno_mucama: CodigoTurno | null;
    id_asignacion: number | null;
    id_tecnico: number | null;
    tecnico: string | null;
    asignado_por: number | null;
    asignado_por_nombre: string | null;
    asignada_en: string | null;
    iniciada_en: string | null;
    finalizada_en: string | null;
    diagnostico: string | null;
    id_dificultad: number | null;
    dificultad: string | null;
    id_especialidad: number | null;
    especialidad: string | null;
    id_ultimo_reporte: number | null;
    ultimo_resultado: 'HECHO' | 'PENDIENTE' | null;
    ultima_observacion: string | null;
    motivo_pendiente: string | null;
    ultimo_reporte_en: string | null;
    materiales: string | null;
    veces_reiterada: number;
};

/** Incidente abierto en una habitación (aviso antes de duplicar un reporte). */
export type IncidenteAbierto = {
    id_solicitud: number;
    codigo: string;
    problema: string;
    estado: EstadoSolicitud;
    nivel_prioridad: number;
    ocupacion: Ocupacion;
    creada_en: string;
    mucama: string;
    turno_mucama: CodigoTurno | null;
    es_mia: boolean;
    veces_reiterada: number;
    ya_reiterada: boolean;
};

export type MaterialReporte = { id_reporte: number; id_material: number; nombre_mat: string; unidad: string; cantidad: number };

export type Reporte = {
    id_reporte: number;
    id_asignacion: number;
    id_autor: number;
    autor: string;
    rol_autor: Rol;
    resultado: 'HECHO' | 'PENDIENTE';
    observacion: string;
    motivo_pendiente: string | null;
    creado_en: string;
    actualizado_en: string | null;
    materiales: MaterialReporte[];
};

export type Modificacion = {
    id_modificacion: number;
    id_reporte: number;
    id_solicitante: number;
    solicitante: string;
    detalle: string;
    estado: 'PENDIENTE' | 'HECHA';
    creada_en: string;
    atendida_en: string | null;
    atendida_por_nombre?: string | null;
    id_solicitud?: number;
    numero?: string;
    bloque?: number;
    resultado?: 'HECHO' | 'PENDIENTE';
    observacion?: string;
    reporte_en?: string;
};

export type DetalleSolicitud = Solicitud & {
    reportes: Reporte[];
    modificaciones: Modificacion[];
    eventos: { tipo: string; detalle: string | null; creado_en: string; empleado: string | null }[];
};

export type Empleado = {
    id_empleado: number;
    codigo: string;
    ci: string | null;
    nombre: string;
    apellido: string;
    telefono: string | null;
    rol: Rol;
    id_estado_empleado: number;
    estado: string;
    turno: CodigoTurno | null;
    creado_en: string;
    hora_entrada: string | null;
    hora_salida: string | null;
    especialidades: string | null;
};

export type MaterialEntrada = { id_material?: number; nombre?: string; cantidad: number };
