// Formulario de reporte (técnico) o "Resolver o actualizar" (supervisor).
import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import { CLAVES, useAccion, useCatalogos } from '../hooks/datos';
import { useAvisos } from '../hooks/avisos';
import { Boton, Campo, Panel, Segmentado } from './ui';
import { EditorMateriales, filaVacia, materialesParaApi, validarMateriales, type FilaMaterial } from './Formularios';
import type { DetalleSolicitud } from '../types';

export function FormReporte({ s, comoSupervisor = false, alTerminar }: { s: DetalleSolicitud; comoSupervisor?: boolean; alTerminar?: () => void }) {
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const [filas, setFilas] = useState<FilaMaterial[]>([filaVacia()]);
    const [observacion, setObservacion] = useState('');
    const [resultado, setResultado] = useState<'HECHO' | 'PENDIENTE' | null>(null);
    const [motivo, setMotivo] = useState('');
    const [dificultad, setDificultad] = useState<number | null>(s.id_dificultad);
    const [especialidad, setEspecialidad] = useState<number | null>(s.id_especialidad);
    const enviar = useAccion((d: object) => api(`/solicitudes/${s.id_solicitud}/reportes`, { cuerpo: d }), [CLAVES.solicitudes, CLAVES.catalogos]);

    async function guardar(e: FormEvent) {
        e.preventDefault();
        if (!resultado) return avisar('Indica si quedó hecho o pendiente.', 'error');
        const err = validarMateriales(filas);
        if (err) return avisar(err, 'error');
        try {
            await enviar.mutateAsync({
                resultado,
                observacion,
                motivo_pendiente: resultado === 'PENDIENTE' ? motivo : null,
                materiales: materialesParaApi(filas, cat?.materiales || []),
                ...(comoSupervisor ? { id_dificultad: dificultad, id_especialidad: especialidad } : {})
            });
            avisar(resultado === 'HECHO' ? 'Reporte enviado: incidente resuelto.' : 'Reporte enviado como pendiente. El supervisor fue notificado.');
            setFilas([filaVacia()]);
            setObservacion('');
            setResultado(null);
            setMotivo('');
            alTerminar?.();
        } catch (er) {
            avisar((er as Error).message, 'error');
        }
    }

    return (
        <Panel titulo={comoSupervisor ? 'Resolver o actualizar' : 'Reporte'}>
            <form onSubmit={guardar} className="space-y-4">
                {comoSupervisor && cat && (
                    <>
                        <div className="beta-label">
                            <span>Dificultad</span>
                            <Segmentado
                                valor={dificultad}
                                onChange={setDificultad}
                                opciones={cat.dificultades.map(d => ({ valor: d.id_dificultad, texto: d.nombre }))}
                            />
                        </div>
                        <Campo etiqueta="Especialidad">
                            <select value={especialidad ?? ''} onChange={e => setEspecialidad(e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Sin especialidad</option>
                                {cat.especialidades.map(x => (
                                    <option key={x.id_especialidad} value={x.id_especialidad}>
                                        {x.nombre}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                    </>
                )}
                <EditorMateriales filas={filas} onChange={setFilas} catalogo={cat?.materiales || []} />
                <Campo etiqueta="Observaciones">
                    <textarea
                        required
                        rows={3}
                        maxLength={4000}
                        value={observacion}
                        onChange={e => setObservacion(e.target.value)}
                        placeholder="Qué se hizo y cómo quedó"
                    />
                </Campo>
                <div className="beta-label">
                    <span>Resultado</span>
                    <Segmentado
                        etiqueta="Resultado"
                        valor={resultado}
                        onChange={setResultado}
                        opciones={[
                            { valor: 'HECHO', texto: comoSupervisor ? 'Resuelto' : 'Hecho' },
                            { valor: 'PENDIENTE', texto: 'Pendiente' }
                        ]}
                    />
                </div>
                {resultado === 'PENDIENTE' && (
                    <Campo etiqueta="Motivo del pendiente (obligatorio)">
                        <textarea
                            required
                            rows={2}
                            maxLength={2000}
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            placeholder="Ej: falta el repuesto de la válvula"
                        />
                    </Campo>
                )}
                <Boton className="w-full" cargando={enviar.isPending}>
                    <Send size={16} /> {comoSupervisor ? 'Guardar' : 'Enviar reporte'}
                </Boton>
            </form>
        </Panel>
    );
}
