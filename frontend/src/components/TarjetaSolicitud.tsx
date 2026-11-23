// Tarjeta de solicitud coloreada por prioridad (diseño "Mis solicitudes" / "Asignaciones").
import type { ReactNode } from 'react';
import { prioridad, TONO_TARJETA, OCUPACION } from '../lib/dominio';
import { fecha, hora } from '../lib/formato';
import type { Solicitud } from '../types';
import { Dato, InsigniaEstado, InsigniaPrioridad } from './ui';

export function TarjetaSolicitud({
    s,
    children,
    mostrarProblema = true,
    extra
}: {
    s: Solicitud;
    children?: ReactNode;
    mostrarProblema?: boolean;
    extra?: ReactNode;
}) {
    const cerrada = s.estado === 'RESUELTA' || s.estado === 'ANULADA';
    return (
        <article className={'rounded-2xl border p-4 space-y-3 ' + (cerrada ? 'bg-white border-[#E2DCCE]' : TONO_TARJETA[prioridad(s.nivel_prioridad).tono])}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <strong className="bg-hotel-primary text-white border border-hotel-accent/50 rounded-lg px-2 py-0.5 text-sm font-bold whitespace-nowrap">
                        Hab {s.numero}
                    </strong>
                    <span className="text-sm font-semibold text-hotel-dark whitespace-nowrap">Bloque {s.bloque}</span>
                    <span className="text-[11px] text-hotel-textMuted hidden sm:inline">· {s.codigo}</span>
                </div>
                <InsigniaPrioridad nivel={s.nivel_prioridad} />
            </div>
            {mostrarProblema && <p className="text-sm text-hotel-dark whitespace-pre-wrap line-clamp-3">{s.problema}</p>}
            <div className="grid grid-cols-3 gap-3">
                <Dato etiqueta="Hora">{hora(s.creada_en)}</Dato>
                <Dato etiqueta="Fecha">{fecha(s.creada_en)}</Dato>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-hotel-textMuted">Estado</p>
                    <InsigniaEstado estado={s.estado} />
                </div>
            </div>
            {extra}
            {(s.tecnico || s.ocupacion !== 'LIBRE') && (
                <p className="text-xs text-hotel-textMuted">
                    {s.ocupacion !== 'LIBRE' && <>Habitación {OCUPACION[s.ocupacion].toLowerCase()}</>}
                    {s.ocupacion !== 'LIBRE' && s.tecnico && ' · '}
                    {s.tecnico && (
                        <>
                            Técnico: <strong className="text-hotel-dark">{s.tecnico}</strong>
                        </>
                    )}
                </p>
            )}
            {children && <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>}
        </article>
    );
}
