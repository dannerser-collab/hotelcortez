// Tabla con filas coloreadas por prioridad (diseño "Supervisor · Solicitudes / Incidentes").
import type { ReactNode } from 'react';
import { prioridad, TONO_FILA } from '../lib/dominio';

export type Columna<T> = { titulo: string; celda: (f: T) => ReactNode; clase?: string };

export function Tabla<T>({
    filas,
    columnas,
    clave,
    onFila,
    tono
}: {
    filas: T[];
    columnas: Columna<T>[];
    clave: (f: T) => string | number;
    onFila?: (f: T) => void;
    tono?: (f: T) => number | null;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-[#E2DCCE] bg-white">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-[#FAF8F4]">
                        {columnas.map(c => (
                            <th
                                key={c.titulo}
                                className={
                                    'text-left px-3 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-hotel-textMuted border-b border-[#E2DCCE] whitespace-nowrap ' +
                                    (c.clase || '')
                                }
                            >
                                {c.titulo}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filas.map(f => {
                        const n = tono?.(f);
                        return (
                            <tr
                                key={clave(f)}
                                onClick={onFila ? () => onFila(f) : undefined}
                                className={
                                    (n !== null && n !== undefined ? TONO_FILA[prioridad(n).tono] : '') +
                                    (onFila ? ' cursor-pointer hover:brightness-[0.97]' : '')
                                }
                            >
                                {columnas.map(c => (
                                    <td key={c.titulo} className={'px-3 py-2.5 border-b border-[#EDE8DC] align-middle whitespace-nowrap ' + (c.clase || '')}>
                                        {c.celda(f)}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
