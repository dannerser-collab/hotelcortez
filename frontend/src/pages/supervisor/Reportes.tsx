// Supervisor · Reportes: Pendientes (trabajos con motivo) y Solicitudes de modificación.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { fecha } from '../../lib/formato';
import { CLAVES, useAccion, useModificaciones, useSolicitudes } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Cargando, Dato, ErrorCarga, Pagina, Pestanas, Vacio } from '../../components/ui';

export default function Reportes() {
    const [vista, setVista] = useState<'pendientes' | 'modificaciones'>('pendientes');
    const pend = useSolicitudes({ estado: 'PENDIENTE' });
    const mods = useModificaciones();
    const { avisar } = useAvisos();
    const hecha = useAccion((id: number) => api(`/modificaciones/${id}/hecha`, { cuerpo: {} }), [CLAVES.modificaciones]);
    const modsPend = (mods.data || []).filter(m => m.estado === 'PENDIENTE');

    return (
        <Pagina titulo="Reportes">
            <Pestanas
                valor={vista}
                onChange={setVista}
                opciones={[
                    { valor: 'pendientes', texto: 'Pendientes', cuenta: pend.data?.length },
                    { valor: 'modificaciones', texto: 'Solicitudes de modificación', cuenta: modsPend.length }
                ]}
            />
            {vista === 'pendientes' ? (
                pend.isLoading ? (
                    <Cargando />
                ) : pend.error ? (
                    <ErrorCarga error={pend.error} reintentar={pend.refetch} />
                ) : !pend.data?.length ? (
                    <Vacio>No hay trabajos pendientes.</Vacio>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {pend.data.map(s => (
                            <article key={s.id_solicitud} className="rounded-2xl border border-[#EBD27A] bg-[#FFFBEA] p-4 space-y-3">
                                <div className="flex justify-between items-center gap-2">
                                    <strong className="text-hotel-dark">
                                        Hab {s.numero} · Bloque {s.bloque}
                                    </strong>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">Pendiente</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Dato etiqueta="Técnico">{s.tecnico}</Dato>
                                    <Dato etiqueta="Fecha">{fecha(s.ultimo_reporte_en)}</Dato>
                                </div>
                                <p className="text-sm">{s.motivo_pendiente}</p>
                                <Link to={`/incidentes/${s.id_solicitud}`} className="beta-primary !py-2 w-full">
                                    Ver
                                </Link>
                            </article>
                        ))}
                    </div>
                )
            ) : (
                <>
                    <p className="text-xs text-hotel-textMuted">
                        El supervisor hace el cambio en el reporte (desde el detalle del incidente) y luego toca «Hecho». Solo el supervisor puede modificar un
                        reporte.
                    </p>
                    {mods.isLoading ? (
                        <Cargando />
                    ) : mods.error ? (
                        <ErrorCarga error={mods.error} reintentar={mods.refetch} />
                    ) : !mods.data?.length ? (
                        <Vacio>No hay solicitudes de modificación.</Vacio>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {mods.data.map(m => (
                                <article key={m.id_modificacion} className={'beta-card !p-4 space-y-3 ' + (m.estado === 'HECHA' ? 'opacity-70' : '')}>
                                    <div className="flex justify-between items-center gap-2">
                                        <strong className="text-hotel-dark">
                                            Hab {m.numero} · Bloque {m.bloque}
                                        </strong>
                                        <span
                                            className={
                                                'text-[11px] font-bold px-2 py-0.5 rounded-full ' +
                                                (m.resultado === 'HECHO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')
                                            }
                                        >
                                            Reporte {m.resultado === 'HECHO' ? 'hecho' : 'pendiente'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Dato etiqueta="Técnico">{m.solicitante}</Dato>
                                        <Dato etiqueta="Fecha">{fecha(m.creada_en)}</Dato>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-hotel-textMuted">Qué hay que modificar</p>
                                        <p className="text-sm">{m.detalle}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link to={`/incidentes/${m.id_solicitud}`} className="beta-secondary">
                                            Abrir reporte
                                        </Link>
                                        {m.estado === 'PENDIENTE' ? (
                                            <Boton
                                                className="!py-2 flex-1"
                                                cargando={hecha.isPending && hecha.variables === m.id_modificacion}
                                                onClick={() =>
                                                    hecha
                                                        .mutateAsync(m.id_modificacion)
                                                        .then(() => avisar('Modificación marcada como hecha.'))
                                                        .catch(e => avisar(e.message, 'error'))
                                                }
                                            >
                                                Hecho
                                            </Boton>
                                        ) : (
                                            <span className="text-xs text-emerald-800 self-center">Atendida el {fecha(m.atendida_en)}</span>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Pagina>
    );
}
