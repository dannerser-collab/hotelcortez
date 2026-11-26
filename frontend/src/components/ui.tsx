// Componentes visuales compartidos. Cambiar el estilo aquí lo cambia en toda la app.
import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { ESTADO, prioridad } from '../lib/dominio';
import type { EstadoSolicitud } from '../types';

export function Pagina({ titulo, subtitulo, acciones, children }: { titulo: string; subtitulo?: ReactNode; acciones?: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-hotel-dark">{titulo}</h1>
                    {subtitulo && <p className="text-sm text-hotel-textMuted mt-1">{subtitulo}</p>}
                </div>
                {acciones}
            </div>
            {children}
        </div>
    );
}

export function Panel({ titulo, children, className = '', acciones }: { titulo?: ReactNode; children: ReactNode; className?: string; acciones?: ReactNode }) {
    return (
        <section className={'beta-card space-y-4 ' + className}>
            {(titulo || acciones) && (
                <div className="flex items-center justify-between gap-3">
                    {titulo && <h2 className="text-base font-bold text-hotel-dark">{titulo}</h2>}
                    {acciones}
                </div>
            )}
            {children}
        </section>
    );
}

export function InsigniaPrioridad({ nivel }: { nivel: number }) {
    const p = prioridad(nivel);
    return (
        <span className={'inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ' + p.insignia}>{p.etiqueta}</span>
    );
}

export function InsigniaEstado({ estado }: { estado: EstadoSolicitud }) {
    const e = ESTADO[estado];
    return <span className={'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ' + e.clase}>{e.etiqueta}</span>;
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-hotel-textMuted">{etiqueta}</p>
            <p className="text-sm font-semibold text-hotel-dark break-words">{children}</p>
        </div>
    );
}

export function Campo({ etiqueta, ayuda, children, className = '' }: { etiqueta: ReactNode; ayuda?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <label className={'beta-label ' + className}>
            <span>{etiqueta}</span>
            {children}
            {ayuda && <span className="text-[11px] font-normal text-hotel-textMuted">{ayuda}</span>}
        </label>
    );
}

/** Botones de opción (como "Libre / Ocupado" o "Fácil / Medio / Difícil"). */
export function Segmentado<T extends string | number>({
    opciones,
    valor,
    onChange,
    deshabilitado,
    etiqueta
}: {
    opciones: { valor: T; texto: ReactNode; detalle?: ReactNode; deshabilitada?: boolean }[];
    valor: T | null | undefined;
    onChange: (v: T) => void;
    deshabilitado?: boolean;
    etiqueta?: string;
}) {
    return (
        <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
            {opciones.map(o => {
                const activo = o.valor === valor;
                return (
                    <button
                        key={String(o.valor)}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        disabled={deshabilitado || o.deshabilitada}
                        onClick={() => onChange(o.valor)}
                        className={
                            'flex-1 min-w-[90px] min-h-[44px] rounded-xl border-[1.5px] px-3 py-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
                            (activo
                                ? 'bg-hotel-primary text-white border-hotel-accent shadow-sm'
                                : 'bg-white text-hotel-dark border-[#D8D0BE] hover:border-hotel-accent')
                        }
                    >
                        <span className="block text-sm font-bold text-center">{o.texto}</span>
                        {o.detalle && (
                            <span className={'block text-[11px] text-center ' + (activo ? 'text-[#EAE1CC]' : 'text-hotel-textMuted')}>{o.detalle}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function Pestanas<T extends string>({
    opciones,
    valor,
    onChange
}: {
    opciones: { valor: T; texto: string; cuenta?: number }[];
    valor: T;
    onChange: (v: T) => void;
}) {
    return (
        <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-[#EDE8DC] w-full sm:w-fit overflow-x-auto">
            {opciones.map(o => (
                <button
                    key={o.valor}
                    role="tab"
                    aria-selected={o.valor === valor}
                    onClick={() => onChange(o.valor)}
                    className={
                        'flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' +
                        (o.valor === valor ? 'bg-white text-hotel-primary shadow-sm' : 'text-hotel-textMuted hover:text-hotel-dark')
                    }
                >
                    {o.texto}
                    {o.cuenta !== undefined && (
                        <span className={'ml-1.5 text-[11px] px-1.5 rounded-full ' + (o.valor === valor ? 'bg-hotel-accent text-white' : 'bg-white/70')}>
                            {o.cuenta}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

export function Vacio({ children }: { children: ReactNode }) {
    return <p className="text-sm text-hotel-textMuted py-8 text-center">{children}</p>;
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
    return (
        <p className="flex items-center justify-center gap-2 text-sm text-hotel-textMuted py-8">
            <Loader2 size={16} className="animate-spin" /> {texto}
        </p>
    );
}

export function ErrorCarga({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
    return (
        <div className="beta-error flex flex-wrap items-center justify-between gap-3" role="alert">
            <span>{(error as Error)?.message || 'No se pudieron cargar los datos.'}</span>
            {reintentar && (
                <button className="beta-secondary" onClick={reintentar}>
                    Reintentar
                </button>
            )}
        </div>
    );
}

export function Modal({ titulo, onCerrar, children, ancho = 'max-w-2xl' }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={titulo} onClick={onCerrar}>
            <section className={'beta-card mx-auto my-4 ' + ancho} onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="font-serif text-xl font-bold text-hotel-dark">{titulo}</h2>
                    <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-[#FAF8F4]" aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </section>
        </div>
    );
}

export function Boton({
    children,
    cargando,
    variante = 'primario',
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { cargando?: boolean; variante?: 'primario' | 'secundario' | 'dorado' | 'peligro' }) {
    const clase = { primario: 'beta-primary', secundario: 'beta-secondary', dorado: 'beta-gold', peligro: 'beta-danger' }[variante];
    return (
        <button {...props} disabled={props.disabled || cargando} className={clase + ' ' + className}>
            {cargando && <Loader2 size={16} className="animate-spin" />}
            {children}
        </button>
    );
}
