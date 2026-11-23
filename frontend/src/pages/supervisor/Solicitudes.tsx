// Supervisor · Solicitudes sin asignar (las urgentes primero y resaltadas) + resumen del día.
import { useNavigate } from 'react-router-dom';
import { fecha, hace, hora } from '../../lib/formato';
import { useCatalogos, useSolicitudes } from '../../hooks/datos';
import { Cargando, ErrorCarga, InsigniaPrioridad, Pagina, Vacio } from '../../components/ui';
import { Tabla } from '../../components/Tabla';
import { TarjetaSolicitud } from '../../components/TarjetaSolicitud';
import type { Solicitud } from '../../types';

export default function Solicitudes() {
    const navegar = useNavigate();
    const { data, isLoading, error, refetch } = useSolicitudes();
    const { data: cat } = useCatalogos();
    const sinAsignar = (data || [])
        .filter(s => s.estado === 'SIN_ASIGNAR')
        .sort((a, b) => a.nivel_prioridad - b.nivel_prioridad || +new Date(a.creada_en) - +new Date(b.creada_en));
    const abiertas = (data || []).filter(s => ['ASIGNADA', 'EN_PROCESO', 'PENDIENTE'].includes(s.estado));
    const habs = cat?.habitaciones || [];
    const ir = (s: Solicitud) => navegar('/solicitudes/' + s.id_solicitud);

    return (
        <Pagina titulo="Solicitudes" subtitulo="Sin asignar. Las urgentes aparecen primero y resaltadas.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    ['Sin asignar', sinAsignar.length],
                    ['En curso', abiertas.length],
                    ['Habitaciones en mantenimiento', habs.filter(h => !h.operativa).length],
                    ['Técnicos de turno', cat?.tecnicos.filter(t => t.de_turno).length ?? '—']
                ].map(([t, v]) => (
                    <section key={t} className="beta-card !p-4 border-t-4 border-t-hotel-accent">
                        <p className="text-xs text-hotel-textMuted">{t}</p>
                        <strong className="font-serif text-3xl text-hotel-dark">{v}</strong>
                    </section>
                ))}
            </div>
            {isLoading ? (
                <Cargando />
            ) : error ? (
                <ErrorCarga error={error} reintentar={refetch} />
            ) : !sinAsignar.length ? (
                <Vacio>No hay solicitudes pendientes de asignación.</Vacio>
            ) : (
                <>
                    <div className="hidden md:block">
                        <Tabla
                            filas={sinAsignar}
                            clave={s => s.id_solicitud}
                            tono={s => s.nivel_prioridad}
                            onFila={ir}
                            columnas={[
                                { titulo: 'Prioridad', celda: s => <InsigniaPrioridad nivel={s.nivel_prioridad} /> },
                                { titulo: 'Habitación', celda: s => <strong>{s.numero}</strong> },
                                { titulo: 'Bloque', celda: s => s.bloque },
                                { titulo: 'Hora', celda: s => hora(s.creada_en) },
                                { titulo: 'Fecha', celda: s => fecha(s.creada_en) },
                                { titulo: 'Espera', celda: s => hace(s.creada_en) },
                                { titulo: 'Mucama', celda: s => s.mucama },
                                { titulo: 'Problema', celda: s => <span className="block max-w-[280px] truncate">{s.problema}</span>, clase: 'w-full' },
                                {
                                    titulo: '',
                                    celda: s => (
                                        <button className="beta-primary !py-1.5 !px-3 !text-xs" onClick={e => (e.stopPropagation(), ir(s))}>
                                            Ver detalles
                                        </button>
                                    )
                                }
                            ]}
                        />
                    </div>
                    <div className="md:hidden space-y-3">
                        {sinAsignar.map(s => (
                            <TarjetaSolicitud key={s.id_solicitud} s={s}>
                                <button className="beta-primary !py-2 w-full" onClick={() => ir(s)}>
                                    Ver detalles
                                </button>
                            </TarjetaSolicitud>
                        ))}
                    </div>
                </>
            )}
        </Pagina>
    );
}
