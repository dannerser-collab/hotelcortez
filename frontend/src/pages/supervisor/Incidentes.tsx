// Supervisor · Incidentes: tabla maestra con filtros y exportación a Excel (CSV).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { ESTADO } from '../../lib/dominio';
import { fecha, hora, fechaHora } from '../../lib/formato';
import { useCatalogos, useSolicitudes } from '../../hooks/datos';
import { Cargando, ErrorCarga, InsigniaEstado, InsigniaPrioridad, Pagina, Vacio } from '../../components/ui';
import { Tabla } from '../../components/Tabla';
import type { EstadoSolicitud, Solicitud } from '../../types';
import { prioridad } from '../../lib/dominio';

function exportarCsv(filas: Solicitud[]) {
    const cab = [
        'Id',
        'Prioridad',
        'Hab',
        'Bloque',
        'Piso',
        'Tipo',
        'Estado',
        'Fecha',
        'Hora',
        'Mucama',
        'Problema',
        'Técnico',
        'Dificultad',
        'Especialidad',
        'Asignada',
        'Materiales',
        'Observación',
        'Motivo pendiente',
        'Fin'
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const cuerpo = filas.map(s =>
        [
            s.codigo,
            prioridad(s.nivel_prioridad).etiqueta,
            s.numero,
            s.bloque,
            s.piso,
            s.tipo_habitacion,
            ESTADO[s.estado].etiqueta,
            fecha(s.creada_en),
            hora(s.creada_en),
            s.mucama,
            s.problema,
            s.tecnico,
            s.dificultad,
            s.especialidad,
            s.asignada_en ? fechaHora(s.asignada_en) : '',
            s.materiales,
            s.ultima_observacion,
            s.motivo_pendiente,
            s.finalizada_en ? fechaHora(s.finalizada_en) : ''
        ]
            .map(esc)
            .join(';')
    );
    const blob = new Blob(['﻿' + [cab.map(esc).join(';'), ...cuerpo].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `incidentes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

export default function Incidentes() {
    const navegar = useNavigate();
    const { data: cat } = useCatalogos();
    const [q, setQ] = useState('');
    const [bloque, setBloque] = useState<number | ''>('');
    const [estado, setEstado] = useState<EstadoSolicitud | ''>('');
    const [historial, setHistorial] = useState(false);
    const { data, isLoading, error, refetch, isFetching } = useSolicitudes({ q: q.trim() || undefined, bloque, estado: estado || undefined, historial });

    return (
        <Pagina
            titulo="Incidentes"
            acciones={
                <button className="beta-secondary" disabled={!data?.length} onClick={() => data && exportarCsv(data)}>
                    <Download size={14} /> Exportar a Excel
                </button>
            }
        >
            <div className="beta-card !p-4 flex flex-wrap gap-3 items-end">
                <label className="beta-label flex-1 min-w-[200px]">
                    Buscar
                    <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-hotel-textMuted" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Habitación, problema, mucama o técnico" className="w-full !pl-10" />
                    </div>
                </label>
                <label className="beta-label">
                    Bloque
                    <select value={bloque} onChange={e => setBloque(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">Todos</option>
                        {cat?.bloques.map(b => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="beta-label">
                    Estado
                    <select value={estado} onChange={e => setEstado(e.target.value as EstadoSolicitud | '')}>
                        <option value="">Todos</option>
                        {Object.entries(ESTADO).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v.etiqueta}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-hotel-dark h-[46px]">
                    <input type="checkbox" checked={historial} onChange={e => setHistorial(e.target.checked)} />
                    Incluir historial completo
                </label>
            </div>
            {!historial && !estado && (
                <p className="text-xs text-hotel-textMuted">Mostrando abiertos y cerrados en las últimas 48 horas{isFetching ? ' · actualizando…' : ''}.</p>
            )}
            {isLoading ? (
                <Cargando />
            ) : error ? (
                <ErrorCarga error={error} reintentar={refetch} />
            ) : !data?.length ? (
                <Vacio>No hay incidentes con esos filtros.</Vacio>
            ) : (
                <Tabla
                    filas={data}
                    clave={s => s.id_solicitud}
                    tono={s => (s.estado === 'RESUELTA' || s.estado === 'ANULADA' ? null : s.nivel_prioridad)}
                    onFila={s => navegar('/incidentes/' + s.id_solicitud)}
                    columnas={[
                        { titulo: 'Id', celda: s => <strong>{s.codigo}</strong> },
                        { titulo: 'Prioridad', celda: s => <InsigniaPrioridad nivel={s.nivel_prioridad} /> },
                        { titulo: 'Hab', celda: s => s.numero },
                        { titulo: 'Bloque', celda: s => s.bloque },
                        { titulo: 'Estado', celda: s => <InsigniaEstado estado={s.estado} /> },
                        { titulo: 'Fecha', celda: s => fecha(s.creada_en) },
                        { titulo: 'Hora', celda: s => hora(s.creada_en) },
                        { titulo: 'Piso', celda: s => s.piso },
                        { titulo: 'Tipo', celda: s => s.tipo_habitacion || '—' },
                        { titulo: 'Mucama', celda: s => s.mucama },
                        {
                            titulo: 'Problema',
                            celda: s => (
                                <span className="block max-w-[220px] truncate" title={s.problema}>
                                    {s.problema}
                                </span>
                            )
                        },
                        { titulo: 'Técnico', celda: s => s.tecnico || '—' },
                        { titulo: 'Dificultad', celda: s => s.dificultad || '—' },
                        { titulo: 'Especialidad', celda: s => s.especialidad || '—' },
                        { titulo: 'Asignada', celda: s => (s.asignada_en ? `${fecha(s.asignada_en)} ${hora(s.asignada_en)}` : '—') },
                        {
                            titulo: 'Materiales',
                            celda: s => (
                                <span className="block max-w-[200px] truncate" title={s.materiales || ''}>
                                    {s.materiales || '—'}
                                </span>
                            )
                        },
                        {
                            titulo: 'Observación',
                            celda: s => (
                                <span className="block max-w-[200px] truncate" title={s.motivo_pendiente || s.ultima_observacion || ''}>
                                    {s.motivo_pendiente || s.ultima_observacion || '—'}
                                </span>
                            )
                        },
                        { titulo: 'Fin', celda: s => (s.finalizada_en && s.estado === 'RESUELTA' ? `${fecha(s.finalizada_en)} ${hora(s.finalizada_en)}` : '—') }
                    ]}
                />
            )}
        </Pagina>
    );
}
