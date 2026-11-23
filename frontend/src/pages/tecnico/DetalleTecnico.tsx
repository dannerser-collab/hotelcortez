// Técnico · Detalle incidente: tomar/iniciar y enviar reporte Hecho/Pendiente.
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Hand } from 'lucide-react';
import { api } from '../../lib/api';
import { requiereSupervisor } from '../../lib/dominio';
import { CLAVES, useAccion, useSolicitud } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { useUsuario } from '../../hooks/sesion';
import { Boton, Cargando, ErrorCarga, Pagina, Panel } from '../../components/ui';
import { DatosSolicitud, ListaReportes, Volver } from '../../components/DetalleSolicitud';
import { FormReporte } from '../../components/FormReporte';

export default function DetalleTecnico() {
    const id = Number(useParams().id);
    const u = useUsuario();
    const navegar = useNavigate();
    const { avisar } = useAvisos();
    const { data: s, isLoading, error, refetch } = useSolicitud(id);
    const tomar = useAccion(() => api(`/solicitudes/${id}/tomar`, { cuerpo: {} }), [CLAVES.solicitudes]);
    const iniciar = useAccion(() => api(`/solicitudes/${id}/iniciar`, { cuerpo: {} }), [CLAVES.solicitudes]);

    if (isLoading) return <Cargando />;
    if (error || !s) return <ErrorCarga error={error} reintentar={refetch} />;

    const mia = s.id_tecnico === u.id_empleado;
    const abierta = ['ASIGNADA', 'EN_PROCESO', 'PENDIENTE'].includes(s.estado);

    return (
        <Pagina titulo="Detalle incidente" subtitulo={s.codigo} acciones={<Volver a="/asignaciones" />}>
            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-5">
                    <DatosSolicitud s={s} />
                    <ListaReportes reportes={s.reportes} />
                </div>
                <div className="space-y-5">
                    {s.estado === 'SIN_ASIGNAR' && (
                        <Panel titulo="Disponible">
                            {requiereSupervisor(s.nivel_prioridad) ? (
                                <p className="text-sm text-orange-800">Esta solicitud la asigna el supervisor.</p>
                            ) : (
                                <Boton
                                    className="w-full"
                                    cargando={tomar.isPending}
                                    onClick={() =>
                                        tomar
                                            .mutateAsync(undefined)
                                            .then(() => avisar('Tomaste la solicitud. Ya puedes reportar el trabajo.'))
                                            .catch(e => avisar(e.message, 'error'))
                                    }
                                >
                                    <Hand size={16} /> Tomar esta solicitud
                                </Boton>
                            )}
                        </Panel>
                    )}
                    {mia && s.estado === 'ASIGNADA' && (
                        <Panel titulo="Iniciar trabajo">
                            <p className="text-sm text-hotel-textMuted">
                                Marca el inicio cuando llegues a la habitación. Sirve para medir los tiempos de respuesta.
                            </p>
                            <Boton
                                className="w-full"
                                variante="dorado"
                                cargando={iniciar.isPending}
                                onClick={() =>
                                    iniciar
                                        .mutateAsync(undefined)
                                        .then(() => avisar('Trabajo iniciado.'))
                                        .catch(e => avisar(e.message, 'error'))
                                }
                            >
                                <Play size={16} /> Iniciar trabajo
                            </Boton>
                        </Panel>
                    )}
                    {mia && abierta && <FormReporte s={s} alTerminar={() => navegar('/asignaciones')} />}
                    {!mia && s.id_tecnico && <p className="text-sm text-hotel-textMuted">Asignada a {s.tecnico}.</p>}
                </div>
            </div>
        </Pagina>
    );
}
