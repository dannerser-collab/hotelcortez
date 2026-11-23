// Mucama · Mis solicitudes: puede modificar o anular mientras no esté asignada.
import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { CLAVES, useAccion, useSolicitudes } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, Modal, Pagina, Pestanas, Vacio } from '../../components/ui';
import { TarjetaSolicitud } from '../../components/TarjetaSolicitud';
import { SelectorFoto } from '../../components/Formularios';
import { Foto } from '../../components/Foto';
import { EstadoYPrioridad } from './Solicitar';
import type { Ocupacion, Solicitud } from '../../types';

export default function MisSolicitudes() {
    const [vista, setVista] = useState<'activas' | 'historial'>('activas');
    const [q, setQ] = useState('');
    const { data, isLoading, error, refetch } = useSolicitudes({ historial: vista === 'historial', q: q.trim() || undefined });
    const [editar, setEditar] = useState<Solicitud | null>(null);
    const { avisar } = useAvisos();
    const anular = useAccion((id: number) => api(`/solicitudes/${id}/anular`, { cuerpo: {} }), [CLAVES.solicitudes, CLAVES.catalogos]);

    return (
        <Pagina titulo="Mis solicitudes">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <Pestanas
                    valor={vista}
                    onChange={setVista}
                    opciones={[
                        { valor: 'activas', texto: 'Recientes' },
                        { valor: 'historial', texto: 'Historial completo' }
                    ]}
                />
                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-hotel-textMuted" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar hab. o problema…" className="w-full !pl-10" />
                </div>
            </div>
            {isLoading ? (
                <Cargando />
            ) : error ? (
                <ErrorCarga error={error} reintentar={refetch} />
            ) : !data?.length ? (
                <Vacio>No hay solicitudes para mostrar.</Vacio>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map(s => (
                        <TarjetaSolicitud
                            key={s.id_solicitud}
                            s={s}
                            extra={s.tiene_foto && s.foto ? <Foto archivo={s.foto} alt={'Foto de ' + s.codigo} className="max-h-32 rounded-lg" /> : null}
                        >
                            {s.estado === 'SIN_ASIGNAR' ? (
                                <>
                                    <Boton variante="primario" className="!py-2" onClick={() => setEditar(s)}>
                                        Modificar
                                    </Boton>
                                    <Boton
                                        variante="secundario"
                                        cargando={anular.isPending && anular.variables === s.id_solicitud}
                                        onClick={() => {
                                            if (confirm(`¿Anular la solicitud de la habitación ${s.numero}?`))
                                                anular
                                                    .mutateAsync(s.id_solicitud)
                                                    .then(() => avisar('Solicitud anulada.'))
                                                    .catch(e => avisar(e.message, 'error'));
                                        }}
                                    >
                                        Anular
                                    </Boton>
                                </>
                            ) : s.estado === 'ANULADA' || s.estado === 'RESUELTA' ? null : (
                                <p className="text-xs text-hotel-textMuted">Ya fue asignada, no se puede modificar.</p>
                            )}
                        </TarjetaSolicitud>
                    ))}
                </div>
            )}
            {editar && <EditarSolicitud s={editar} onCerrar={() => setEditar(null)} />}
        </Pagina>
    );
}

function EditarSolicitud({ s, onCerrar }: { s: Solicitud; onCerrar: () => void }) {
    const { avisar } = useAvisos();
    const [problema, setProblema] = useState(s.problema);
    const [ocupacion, setOcupacion] = useState<Ocupacion | ''>(s.ocupacion);
    const [prioridad, setPrioridad] = useState(s.nivel_prioridad >= 1 ? s.nivel_prioridad : 2);
    const [foto, setFoto] = useState('');
    const [quitarFoto, setQuitarFoto] = useState(false);
    const guardar = useAccion((d: object) => api('/solicitudes/' + s.id_solicitud, { metodo: 'PATCH', cuerpo: d }));

    async function enviar(e: FormEvent) {
        e.preventDefault();
        try {
            await guardar.mutateAsync({ problema, ocupacion, prioridad, ...(foto ? { foto } : quitarFoto ? { foto: null } : {}) });
            avisar('Solicitud modificada.');
            onCerrar();
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    return (
        <Modal titulo={`Modificar · Hab ${s.numero}`} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="space-y-4">
                <Campo etiqueta="Detalle del incidente">
                    <textarea required rows={4} maxLength={2000} value={problema} onChange={e => setProblema(e.target.value)} />
                </Campo>
                <EstadoYPrioridad ocupacion={ocupacion} setOcupacion={setOcupacion} prioridad={prioridad} setPrioridad={setPrioridad} />
                {s.foto && !foto && !quitarFoto && (
                    <div className="flex items-end gap-3">
                        <Foto archivo={s.foto} alt="Foto actual" className="max-h-32 rounded-lg" />
                        <button type="button" className="beta-secondary" onClick={() => setQuitarFoto(true)}>
                            Quitar foto
                        </button>
                    </div>
                )}
                <SelectorFoto valor={foto} onChange={setFoto} onError={m => avisar(m, 'error')} etiqueta={s.foto ? 'Reemplazar foto' : 'Agregar foto'} />
                <div className="flex gap-2">
                    <Boton cargando={guardar.isPending}>Guardar cambios</Boton>
                    <Boton type="button" variante="secundario" onClick={onCerrar}>
                        Cancelar
                    </Boton>
                </div>
            </form>
        </Modal>
    );
}
