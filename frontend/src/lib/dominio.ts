// Etiquetas y colores del dominio. Un solo lugar para textos y estilos de estados.
import type { CodigoTurno, EstadoSolicitud, Ocupacion, Rol } from '../types';

export const ROL: Record<Rol, string> = {
    MUCAMA: 'Mucama',
    TECNICO: 'Técnico',
    SUPERVISOR: 'Supervisor'
};

export const ROL_AREA: Record<Rol, string> = {
    MUCAMA: 'Gobernanza · Mucama',
    TECNICO: 'Mantenimiento · Técnico',
    SUPERVISOR: 'Supervisión general'
};

/** 0 Urgente · 1 Alta · 2 Media · 3 Baja. `tono` decide el color de la tarjeta/fila. */
export const PRIORIDAD: Record<number, { etiqueta: string; insignia: string; tono: 'urgente' | 'alta' | 'media' | 'baja' }> = {
    0: { etiqueta: 'Urgente', insignia: 'bg-red-700 text-white', tono: 'urgente' },
    1: { etiqueta: 'Alta', insignia: 'bg-red-100 text-red-800 border border-red-200', tono: 'alta' },
    2: { etiqueta: 'Media', insignia: 'bg-amber-100 text-amber-900 border border-amber-200', tono: 'media' },
    3: { etiqueta: 'Baja', insignia: 'bg-emerald-50 text-emerald-800 border border-emerald-200', tono: 'baja' }
};

export const TONO_TARJETA: Record<string, string> = {
    urgente: 'bg-red-50 border-red-300 border-l-4 border-l-red-700',
    alta: 'bg-[#FFF4F2] border-[#F0B7B1]',
    media: 'bg-[#FFFBEA] border-[#EBD27A]',
    baja: 'bg-[#F4FBF6] border-[#A9D9B9]'
};

export const TONO_FILA: Record<string, string> = {
    urgente: 'bg-red-50',
    alta: 'bg-[#FFF3F1]',
    media: 'bg-[#FFFAE8]',
    baja: 'bg-[#F4FBF6]'
};

export const prioridad = (n: number | null | undefined) => PRIORIDAD[n ?? 2] ?? PRIORIDAD[2];

export const ESTADO: Record<EstadoSolicitud, { etiqueta: string; clase: string }> = {
    SIN_ASIGNAR: { etiqueta: 'Sin asignar', clase: 'bg-[#EAE1CC] text-hotel-dark' },
    ASIGNADA: { etiqueta: 'Asignada', clase: 'bg-sky-100 text-sky-900' },
    EN_PROCESO: { etiqueta: 'En reparación', clase: 'bg-hotel-primary text-white' },
    PENDIENTE: { etiqueta: 'Pendiente', clase: 'bg-amber-100 text-amber-900' },
    RESUELTA: { etiqueta: 'Hecho', clase: 'bg-emerald-100 text-emerald-800' },
    ANULADA: { etiqueta: 'Anulada', clase: 'bg-slate-200 text-slate-600' }
};

export const OCUPACION: Record<Ocupacion, string> = { LIBRE: 'Libre', OCUPADA: 'Ocupada', RESERVADA: 'Reservada' };

export const TURNO: Record<CodigoTurno, string> = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };

export const EVENTO: Record<string, string> = {
    REPORTADA: 'Solicitud registrada',
    MODIFICADA: 'Solicitud modificada por la mucama',
    ASIGNADA: 'Asignada a técnico',
    REASIGNADA: 'Reasignada',
    TOMADA: 'Tomada por el técnico',
    INICIADA: 'Trabajo iniciado',
    REANUDADA: 'Trabajo reanudado',
    PENDIENTE: 'Quedó pendiente',
    RESUELTA: 'Resuelta',
    ANULADA: 'Anulada',
    REPORTE_EDITADO: 'Reporte modificado por el supervisor',
    MODIF_SOLICITADA: 'Técnico pidió modificar su reporte',
    MODIF_HECHA: 'Modificación aplicada'
};

export const requiereSupervisor = (nivel: number) => nivel <= 1;
