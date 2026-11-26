// Supervisor · Detalle incidente: ver reportes, editarlos, resolver/actualizar, reasignar o anular.
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import { cantidad } from '../../lib/formato';
import { CLAVES, useAccion, useCatalogos, useSolicitud } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, Modal, Pagina, Panel } from '../../components/ui';
import { DatosSolicitud, Historial, ListaReportes, Volver } from '../../components/DetalleSolicitud';
import { FormReporte } from '../../components/FormReporte';
import { EditorMateriales, filaVacia, materialesParaApi, validarMateriales, type FilaMaterial } from '../../components/Formularios';
import { FormAsignacion } from './Asignar';
import type { Reporte } from '../../types';

export default function DetalleIncidente() {
    const id = Number(useParams().id);
    const { data: s, isLoading, error, refetch } = useSolicitud(id);
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const [editar, setEditar] = useState<Reporte | null>(null);
    const [reasignar, setReasignar] = useState(false);
    const hecha = useAccion((idm: number) => api(`/modificaciones/${idm}/hecha`, { cuerpo: {} }), [CLAVES.modificaciones, CLAVES.solicitudes]);
    const anular = useAccion((motivo: string) => api(`/solicitudes/${id}/anular`, { cuerpo: { motivo } }), [CLAVES.solicitudes, CLAVES.catalogos]);

    if (isLoading || !cat) return <Cargando />;
    if (error || !s) return <ErrorCarga error={error} reintentar={refetch} />;
    const abierta = !['RESUELTA', 'ANULADA'].includes(s.estado);

    return (
        <Pagina titulo="Detalle incidente" subtitulo={s.codigo} acciones={<Volver a="/incidentes" />}>
            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-5">
                    <DatosSolicitud s={s} conMucama />
                    <ListaReportes
                        reportes={s.reportes}
                        acciones={r => {
                            const pedidas = s.modificaciones.filter(m => m.id_reporte === r.id_reporte);
                            return (
                                <div className="space-y-2 pt-1">
                                    {pedidas.map(m => (
                                        <div
                                            key={m.id_modificacion}
                                            className={
                                                'rounded-lg border p-2 text-xs ' +
                                                (m.estado === 'PENDIENTE' ? 'bg-white border-hotel-accent' : 'bg-white/60 border-[#E2DCCE]')
                                            }
                                        >
                                            <p>
                                                <strong>{m.solicitante}</strong> pidió: «{m.detalle}»
                                            </p>
                                            {m.estado === 'PENDIENTE' ? (
                                                <Boton
                                                    className="!py-1.5 !px-3 !text-xs mt-2"
                                                    cargando={hecha.isPending}
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
                                                <p className="text-emerald-800 mt-1">Aplicada{m.atendida_por_nombre ? ` por ${m.atendida_por_nombre}` : ''}.</p>
                                            )}
                                        </div>
                                    ))}
                                    <button className="beta-secondary" onClick={() => setEditar(r)}>
                                        <Pencil size={12} /> Modificar reporte
                                    </button>
                                </div>
                            );
                        }}
                    />
                    <Historial eventos={s.eventos} />
                </div>
                <div className="space-y-5">
                    {abierta && s.id_asignacion && <FormReporte s={s} comoSupervisor />}
                    {abierta && (reasignar || !s.id_asignacion) && s.estado !== 'EN_PROCESO' ? (
                        <FormAsignacion s={s} cat={cat} alTerminar={() => setReasignar(false)} />
                    ) : (
                        abierta &&
                        s.estado !== 'EN_PROCESO' && (
                            <Boton variante="secundario" onClick={() => setReasignar(true)}>
                                Reasignar técnico
                            </Boton>
                        )
                    )}
                    {abierta && (
                        <Panel titulo="Anular solicitud">
                            <p className="text-xs text-hotel-textMuted">Úsalo si fue un reporte duplicado o por error. Queda registrado en el historial.</p>
                            <Boton
                                variante="peligro"
                                cargando={anular.isPending}
                                onClick={() => {
                                    const motivo = prompt('Motivo de la anulación:');
                                    if (motivo !== null)
                                        anular
                                            .mutateAsync(motivo)
                                            .then(() => avisar('Solicitud anulada.'))
                                            .catch(e => avisar(e.message, 'error'));
                                }}
                            >
                                Anular
                            </Boton>
                        </Panel>
                    )}
                </div>
            </div>
            {editar && <EditarReporte r={editar} onCerrar={() => setEditar(null)} />}
        </Pagina>
    );
}

function EditarReporte({ r, onCerrar }: { r: Reporte; onCerrar: () => void }) {
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const [observacion, setObservacion] = useState(r.observacion);
    const [motivo, setMotivo] = useState(r.motivo_pendiente || '');
    const [filas, setFilas] = useState<FilaMaterial[]>(
        r.materiales.length ? r.materiales.map(m => ({ nombre: m.nombre_mat, cantidad: cantidad(m.cantidad) })) : [filaVacia()]
    );
    const guardar = useAccion((d: object) => api(`/reportes/${r.id_reporte}`, { metodo: 'PATCH', cuerpo: d }), [CLAVES.solicitudes, CLAVES.catalogos]);

    async function enviar(e: FormEvent) {
        e.preventDefault();
        const err = validarMateriales(filas);
        if (err) return avisar(err, 'error');
        try {
            await guardar.mutateAsync({
                observacion,
                motivo_pendiente: r.resultado === 'PENDIENTE' ? motivo : null,
                materiales: materialesParaApi(filas, cat?.materiales || [])
            });
            avisar('Reporte actualizado. Si había una solicitud de modificación, márcala como «Hecho».');
            onCerrar();
        } catch (er) {
            avisar((er as Error).message, 'error');
        }
    }

    return (
        <Modal titulo={`Modificar reporte de ${r.autor}`} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="space-y-4">
                <Campo etiqueta="Observaciones">
                    <textarea required rows={3} maxLength={4000} value={observacion} onChange={e => setObservacion(e.target.value)} />
                </Campo>
                {r.resultado === 'PENDIENTE' && (
                    <Campo etiqueta="Motivo del pendiente">
                        <textarea rows={2} maxLength={2000} value={motivo} onChange={e => setMotivo(e.target.value)} />
                    </Campo>
                )}
                <EditorMateriales filas={filas} onChange={setFilas} catalogo={cat?.materiales || []} />
                <div className="flex gap-2">
                    <Boton cargando={guardar.isPending}>Guardar</Boton>
                    <Boton type="button" variante="secundario" onClick={onCerrar}>
                        Cancelar
                    </Boton>
                </div>
            </form>
        </Modal>
    );
}
