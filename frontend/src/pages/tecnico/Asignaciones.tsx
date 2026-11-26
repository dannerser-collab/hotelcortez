// Técnico · Asignaciones: Nuevas (asignadas a mí), Pendientes (mías con motivo) y Disponibles (Media/Baja para tomar).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TURNO } from '../../lib/dominio';
import { useCatalogos, useSolicitudes } from '../../hooks/datos';
import { useUsuario } from '../../hooks/sesion';
import { Cargando, ErrorCarga, Pagina, Pestanas, Vacio } from '../../components/ui';
import { TarjetaSolicitud } from '../../components/TarjetaSolicitud';

type Vista = 'nuevas' | 'pendientes' | 'disponibles';

export default function Asignaciones() {
    const u = useUsuario();
    const [vista, setVista] = useState<Vista>('nuevas');
    const { data, isLoading, error, refetch } = useSolicitudes();
    const { data: cat } = useCatalogos();
    const yo = cat?.tecnicos.find(t => t.id_empleado === u.id_empleado);

    const mias = (data || []).filter(s => s.id_tecnico === u.id_empleado);
    const grupos: Record<Vista, typeof mias> = {
        nuevas: mias.filter(s => s.estado === 'ASIGNADA' || s.estado === 'EN_PROCESO'),
        pendientes: mias.filter(s => s.estado === 'PENDIENTE'),
        disponibles: (data || []).filter(s => s.estado === 'SIN_ASIGNAR')
    };
    const orden = (l: typeof mias) => [...l].sort((a, b) => a.nivel_prioridad - b.nivel_prioridad || +new Date(a.creada_en) - +new Date(b.creada_en));

    return (
        <Pagina
            titulo="Asignaciones"
            subtitulo={
                u.turno && (
                    <>
                        Turno {TURNO[u.turno].toLowerCase()} · {yo?.de_turno ? <strong className="text-emerald-700">de turno ahora</strong> : 'fuera de turno'}
                    </>
                )
            }
        >
            <Pestanas
                valor={vista}
                onChange={setVista}
                opciones={[
                    { valor: 'nuevas', texto: 'Nuevas', cuenta: grupos.nuevas.length },
                    { valor: 'pendientes', texto: 'Pendientes', cuenta: grupos.pendientes.length },
                    { valor: 'disponibles', texto: 'Disponibles', cuenta: grupos.disponibles.length }
                ]}
            />
            {vista === 'disponibles' && (
                <p className="text-xs text-hotel-textMuted">
                    Solicitudes de prioridad Media o Baja que puedes tomar. Las urgentes y altas las asigna el supervisor.
                </p>
            )}
            {isLoading ? (
                <Cargando />
            ) : error ? (
                <ErrorCarga error={error} reintentar={refetch} />
            ) : !grupos[vista].length ? (
                <Vacio>
                    {vista === 'nuevas'
                        ? 'No tienes trabajos asignados por ahora.'
                        : vista === 'pendientes'
                          ? 'No tienes trabajos pendientes.'
                          : 'No hay solicitudes disponibles para tomar.'}
                </Vacio>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {orden(grupos[vista]).map(s => (
                        <TarjetaSolicitud
                            key={s.id_solicitud}
                            s={s}
                            extra={
                                s.estado === 'PENDIENTE' && s.motivo_pendiente ? <p className="text-xs text-amber-900">Motivo: {s.motivo_pendiente}</p> : null
                            }
                        >
                            <Link to={`/asignaciones/${s.id_solicitud}`} className="beta-primary !py-2 w-full">
                                Ver
                            </Link>
                        </TarjetaSolicitud>
                    ))}
                </div>
            )}
        </Pagina>
    );
}
