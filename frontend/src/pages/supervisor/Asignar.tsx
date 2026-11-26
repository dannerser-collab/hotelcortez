// Supervisor · Asignar: dificultad, especialidad y técnico según su turno.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { TURNO } from '../../lib/dominio';
import { CLAVES, useAccion, useCatalogos, useSolicitud } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, Pagina, Panel, Segmentado } from '../../components/ui';
import { DatosSolicitud, Historial, Volver } from '../../components/DetalleSolicitud';
import type { Catalogos, DetalleSolicitud } from '../../types';

export default function Asignar() {
    const id = Number(useParams().id);
    const { data: s, isLoading, error, refetch } = useSolicitud(id);
    const { data: cat } = useCatalogos();
    if (isLoading || !cat) return <Cargando />;
    if (error || !s) return <ErrorCarga error={error} reintentar={refetch} />;
    return (
        <Pagina titulo="Solicitud" subtitulo={s.codigo} acciones={<Volver a="/solicitudes" />}>
            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-5">
                    <DatosSolicitud s={s} conMucama />
                    <Historial eventos={s.eventos} />
                </div>
                {['SIN_ASIGNAR', 'ASIGNADA', 'PENDIENTE'].includes(s.estado) ? (
                    <FormAsignacion s={s} cat={cat} />
                ) : (
                    <Panel titulo="Asignación">
                        <p className="text-sm text-hotel-textMuted">
                            Esta solicitud está {s.estado === 'EN_PROCESO' ? 'en reparación' : s.estado.toLowerCase()}; revísala en Incidentes.
                        </p>
                    </Panel>
                )}
            </div>
        </Pagina>
    );
}

export function FormAsignacion({ s, cat, alTerminar }: { s: DetalleSolicitud; cat: Catalogos; alTerminar?: () => void }) {
    const navegar = useNavigate();
    const { avisar } = useAvisos();
    const [dificultad, setDificultad] = useState<number | null>(s.id_dificultad);
    const [especialidad, setEspecialidad] = useState<number | null>(s.id_especialidad);
    const deTurno = [...cat.tecnicos].sort((a, b) => Number(b.de_turno) - Number(a.de_turno) || a.activos - b.activos);
    const [tecnico, setTecnico] = useState<number | null>(s.id_tecnico ?? deTurno.find(t => t.de_turno)?.id_empleado ?? null);
    const [forzar, setForzar] = useState(false);
    const asignar = useAccion((d: object) => api(`/solicitudes/${s.id_solicitud}/asignar`, { cuerpo: d }), [CLAVES.solicitudes, CLAVES.catalogos]);

    async function enviar() {
        if (!tecnico) return avisar('Elige un técnico.', 'error');
        try {
            await asignar.mutateAsync({ id_tecnico: tecnico, id_dificultad: dificultad, id_especialidad: especialidad });
            avisar(`Hab. ${s.numero} asignada a ${cat.tecnicos.find(t => t.id_empleado === tecnico)?.nombre}.`);
            if (alTerminar) alTerminar();
            else navegar('/solicitudes');
        } catch (e) {
            avisar((e as Error).message, 'error');
        }
    }

    return (
        <Panel titulo={s.id_tecnico ? 'Reasignar' : 'Asignación'}>
            <div className="beta-label">
                <span>Dificultad</span>
                <Segmentado
                    etiqueta="Dificultad"
                    valor={dificultad}
                    onChange={setDificultad}
                    opciones={cat.dificultades.map(d => ({ valor: d.id_dificultad, texto: d.nombre }))}
                />
            </div>
            <Campo etiqueta="Especialidad">
                <select value={especialidad ?? ''} onChange={e => setEspecialidad(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Elegir especialidad</option>
                    {cat.especialidades.map(x => (
                        <option key={x.id_especialidad} value={x.id_especialidad}>
                            {x.nombre}
                        </option>
                    ))}
                </select>
            </Campo>
            <div className="beta-label">
                <span>Técnico (según su turno)</span>
                <div className="space-y-2">
                    {deTurno.map(t => {
                        const elegido = t.id_empleado === tecnico;
                        const disponible = t.de_turno || forzar;
                        return (
                            <div
                                key={t.id_empleado}
                                className={
                                    'flex items-center justify-between gap-3 rounded-xl border p-3 ' +
                                    (elegido ? 'border-hotel-accent bg-[#FAF8F4]' : 'border-[#E2DCCE] bg-white')
                                }
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-hotel-dark truncate">
                                        {t.nombre} {t.apellido}
                                    </p>
                                    <p className="text-xs font-normal text-hotel-textMuted">
                                        Turno {t.turno ? TURNO[t.turno].toLowerCase() : 'sin definir'}
                                        {!t.de_turno && ' · fuera de su horario'} · {t.activos} trabajo(s) activo(s)
                                    </p>
                                </div>
                                {elegido ? (
                                    <span className="beta-gold !py-1.5 !px-3 !text-xs">
                                        <CheckCircle2 size={14} /> Elegido
                                    </span>
                                ) : disponible ? (
                                    <button type="button" className="beta-secondary" onClick={() => setTecnico(t.id_empleado)}>
                                        Elegir
                                    </button>
                                ) : (
                                    <span className="text-xs font-semibold text-slate-400 px-3">No disponible</span>
                                )}
                            </div>
                        );
                    })}
                    {!cat.tecnicos.length && <p className="text-sm text-red-700">No hay técnicos activos.</p>}
                    {cat.tecnicos.some(t => !t.de_turno) && (
                        <label className="flex items-center gap-2 text-xs font-normal text-hotel-textMuted">
                            <input type="checkbox" checked={forzar} onChange={e => setForzar(e.target.checked)} />
                            Permitir elegir técnicos fuera de su turno (emergencias)
                        </label>
                    )}
                </div>
            </div>
            <Boton className="w-full" cargando={asignar.isPending} disabled={!tecnico} onClick={() => void enviar()}>
                <Send size={16} /> Enviar asignación
            </Boton>
        </Panel>
    );
}
