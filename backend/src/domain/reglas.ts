// Reglas de negocio puras (sin base de datos): fáciles de probar y de cambiar.
// Si cambia una regla del hotel, se cambia aquí y en test/reglas.test.ts.

export const ROLES = ['MUCAMA', 'TECNICO', 'SUPERVISOR'] as const;
export type Rol = (typeof ROLES)[number];

export const OCUPACIONES = ['LIBRE', 'OCUPADA', 'RESERVADA'] as const;
export type Ocupacion = (typeof OCUPACIONES)[number];

/** 0 Urgente · 1 Alta · 2 Media · 3 Baja */
export const PRIORIDADES = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3 } as const;

export const ESTADOS_SOLICITUD = ['SIN_ASIGNAR', 'ASIGNADA', 'EN_PROCESO', 'PENDIENTE', 'RESUELTA', 'ANULADA'] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];
export const ESTADOS_ABIERTOS: EstadoSolicitud[] = ['SIN_ASIGNAR', 'ASIGNADA', 'EN_PROCESO', 'PENDIENTE'];

/**
 * Prioridad según el estado de la habitación.
 * Ocupada → Urgente, Reservada → Alta. Libre → la que elija la mucama (Alta, Media o Baja; Media por defecto).
 */
export function prioridadPorOcupacion(ocupacion: Ocupacion, elegidaSiLibre?: number): number {
    if (ocupacion === 'OCUPADA') return PRIORIDADES.URGENTE;
    if (ocupacion === 'RESERVADA') return PRIORIDADES.ALTA;
    const n = Number(elegidaSiLibre);
    return [1, 2, 3].includes(n) ? n : PRIORIDADES.MEDIA;
}

/** Urgente y Alta solo las asigna el supervisor; Media y Baja las puede tomar un técnico. */
export function requiereSupervisor(nivel: number) {
    return nivel <= PRIORIDADES.ALTA;
}

export type Turno = { codigo: string; hora_inicio: string; hora_fin: string };

function minutos(hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
}

/** ¿La hora dada cae dentro del turno? Soporta turnos que cruzan medianoche. */
export function enTurno(turno: Pick<Turno, 'hora_inicio' | 'hora_fin'>, fecha = new Date()) {
    const ahora = fecha.getHours() * 60 + fecha.getMinutes();
    const ini = minutos(turno.hora_inicio),
        fin = minutos(turno.hora_fin);
    return ini < fin ? ahora >= ini && ahora < fin : ahora >= ini || ahora < fin;
}

export function turnoActual<T extends Turno>(turnos: T[], fecha = new Date()): T | undefined {
    return turnos.find(t => enTurno(t, fecha));
}

/** Transiciones válidas del ciclo de vida de una solicitud. */
const TRANSICIONES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
    SIN_ASIGNAR: ['ASIGNADA', 'ANULADA'],
    ASIGNADA: ['ASIGNADA', 'EN_PROCESO', 'PENDIENTE', 'RESUELTA'],
    EN_PROCESO: ['PENDIENTE', 'RESUELTA'],
    PENDIENTE: ['ASIGNADA', 'EN_PROCESO', 'PENDIENTE', 'RESUELTA'],
    RESUELTA: [],
    ANULADA: []
};

export function puedePasar(de: EstadoSolicitud, a: EstadoSolicitud) {
    return TRANSICIONES[de]?.includes(a) ?? false;
}

/** Estado de la solicitud tras un reporte del técnico o supervisor. */
export function estadoTrasReporte(resultado: 'HECHO' | 'PENDIENTE'): EstadoSolicitud {
    return resultado === 'HECHO' ? 'RESUELTA' : 'PENDIENTE';
}

/** Normaliza el nombre de un material para evitar duplicados ("foco  led " → "Foco led"). */
export function normalizarMaterial(nombre: string) {
    const limpio = nombre.trim().replace(/\s+/g, ' ');
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Código visible de empleado: 7 → "E-0007". Acepta "E-0007", "e7" o "7". */
export function codigoEmpleado(id: number) {
    return 'E-' + String(id).padStart(4, '0');
}

export function idDesdeCodigo(codigo: string): number | null {
    const m = /^\s*(?:e-?)?0*(\d{1,9})\s*$/i.exec(String(codigo));
    return m ? Number(m[1]) : null;
}

/** Código visible de incidente: 3 → "INC-003". */
export function codigoIncidente(idSolicitud: number) {
    return 'INC-' + String(idSolicitud).padStart(3, '0');
}
