// Acceso a datos con caché (TanStack Query). Cada "clave" corresponde a un tema
// de tiempo real del backend: cuando llega un aviso, se refresca solo esa parte.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api';
import type { Catalogos, DetalleSolicitud, Empleado, Modificacion, Solicitud } from '../types';

export const CLAVES = {
    catalogos: ['catalogos'],
    solicitudes: ['solicitudes'],
    modificaciones: ['modificaciones'],
    empleados: ['empleados'],
    indicadores: ['indicadores'],
    perfil: ['perfil']
} as const;

/** Qué claves invalidar por cada tema que avisa el backend. */
export const TEMA_A_CLAVES: Record<string, readonly (readonly string[])[]> = {
    solicitudes: [CLAVES.solicitudes, CLAVES.indicadores, CLAVES.catalogos],
    habitaciones: [CLAVES.catalogos],
    catalogos: [CLAVES.catalogos],
    personal: [CLAVES.empleados, CLAVES.catalogos, CLAVES.perfil],
    modificaciones: [CLAVES.modificaciones, CLAVES.solicitudes]
};

export const useCatalogos = () => useQuery({ queryKey: CLAVES.catalogos, queryFn: () => api<Catalogos>('/catalogos'), staleTime: 60_000 });

export type FiltroSolicitudes = { estado?: string; bloque?: number | ''; q?: string; historial?: boolean };

export const useSolicitudes = (f: FiltroSolicitudes = {}) =>
    useQuery({
        queryKey: [...CLAVES.solicitudes, 'lista', f],
        queryFn: () => api<Solicitud[]>('/solicitudes' + qs({ estado: f.estado, bloque: f.bloque, q: f.q, historial: f.historial })),
        placeholderData: prev => prev
    });

export const useSolicitud = (id: number | null) =>
    useQuery({
        queryKey: [...CLAVES.solicitudes, 'detalle', id],
        queryFn: () => api<DetalleSolicitud>('/solicitudes/' + id),
        enabled: Boolean(id)
    });

export const useModificaciones = (activo = true) =>
    useQuery({ queryKey: CLAVES.modificaciones, queryFn: () => api<Modificacion[]>('/modificaciones'), enabled: activo });

export const useEmpleados = () => useQuery({ queryKey: CLAVES.empleados, queryFn: () => api<Empleado[]>('/empleados') });

export const usePerfil = () => useQuery({ queryKey: CLAVES.perfil, queryFn: () => api('/perfil') });

export const useIndicadores = (dias: number) => useQuery({ queryKey: [...CLAVES.indicadores, dias], queryFn: () => api('/indicadores' + qs({ dias })) });

/** Mutación genérica: llama a la API y refresca las claves indicadas. */
export function useAccion<V = unknown, R = unknown>(llamada: (v: V) => Promise<R>, refrescar: readonly (readonly string[])[] = [CLAVES.solicitudes]) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: llamada,
        onSuccess: () => Promise.all(refrescar.map(k => qc.invalidateQueries({ queryKey: k })))
    });
}
