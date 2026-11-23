// Mucama · Solicitar (diseño "Nueva solicitud" + autodetección de bloque y piso del sistema actual).
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { PRIORIDAD } from '../../lib/dominio';
import { CLAVES, useAccion, useCatalogos } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, InsigniaPrioridad, Pagina, Panel, Segmentado } from '../../components/ui';
import { SelectorFoto } from '../../components/Formularios';
import type { Ocupacion } from '../../types';

export function prioridadCalculada(ocupacion: Ocupacion | '', elegida: number) {
    if (ocupacion === 'OCUPADA') return 0;
    if (ocupacion === 'RESERVADA') return 1;
    return ocupacion === 'LIBRE' ? elegida : null;
}

/** Campos de estado de habitación + prioridad (reutilizado al modificar una solicitud). */
export function EstadoYPrioridad({
    ocupacion,
    setOcupacion,
    prioridad,
    setPrioridad
}: {
    ocupacion: Ocupacion | '';
    setOcupacion: (o: Ocupacion) => void;
    prioridad: number;
    setPrioridad: (n: number) => void;
}) {
    const nivel = prioridadCalculada(ocupacion, prioridad);
    return (
        <>
            <div className="beta-label">
                <span>Estado de la habitación</span>
                <Segmentado
                    etiqueta="Estado de la habitación"
                    valor={ocupacion || null}
                    onChange={setOcupacion}
                    opciones={[
                        { valor: 'LIBRE', texto: 'Libre', detalle: 'Tú eliges' },
                        { valor: 'RESERVADA', texto: 'Reservada', detalle: 'Alta' },
                        { valor: 'OCUPADA', texto: 'Ocupada', detalle: 'Urgente' }
                    ]}
                />
            </div>
            <div className="beta-label">
                <span>Prioridad (si está libre)</span>
                <Segmentado
                    etiqueta="Prioridad"
                    valor={ocupacion === 'LIBRE' ? prioridad : null}
                    onChange={setPrioridad}
                    deshabilitado={ocupacion !== 'LIBRE'}
                    opciones={[
                        { valor: 3, texto: 'Baja' },
                        { valor: 2, texto: 'Media' },
                        { valor: 1, texto: 'Alta' }
                    ]}
                />
                <span className="text-[11px] font-normal text-hotel-textMuted">
                    Si marcas Ocupada o Reservada, la prioridad se fija sola y esta sección se bloquea.
                </span>
            </div>
            {nivel !== null && (
                <div className="flex items-start gap-2 rounded-xl bg-[#FAF8F4] border border-[#E2DCCE] p-3 text-xs text-hotel-dark">
                    <InsigniaPrioridad nivel={nivel} />
                    <span>{nivel <= 1 ? 'El supervisor asignará esta solicitud al técnico de turno.' : 'El técnico de turno podrá tomarla directamente.'}</span>
                </div>
            )}
        </>
    );
}

export default function Solicitar() {
    const { data: cat, isLoading, error, refetch } = useCatalogos();
    const { avisar } = useAvisos();
    const navegar = useNavigate();
    const [numero, setNumero] = useState('');
    const [problema, setProblema] = useState('');
    const [ocupacion, setOcupacion] = useState<Ocupacion | ''>('');
    const [prioridad, setPrioridad] = useState(2);
    const [foto, setFoto] = useState('');
    const enviar = useAccion((d: object) => api<{ codigo: string }>('/solicitudes', { cuerpo: d }), [CLAVES.solicitudes, CLAVES.catalogos]);

    const habitacion = useMemo(() => cat?.habitaciones.find(h => h.numero === numero), [cat, numero]);
    const porBloque = useMemo(() => {
        const g = new Map<number, string[]>();
        for (const h of cat?.habitaciones || []) g.set(h.bloque, [...(g.get(h.bloque) || []), h.numero]);
        return [...g.entries()];
    }, [cat]);

    if (isLoading) return <Cargando />;
    if (error || !cat) return <ErrorCarga error={error} reintentar={refetch} />;

    async function enviarFormulario(e: FormEvent) {
        e.preventDefault();
        if (!habitacion) return avisar('Elige una de tus habitaciones asignadas.', 'error');
        if (!ocupacion) return avisar('Indica el estado de la habitación.', 'error');
        try {
            const r = await enviar.mutateAsync({ numero_habitacion: numero, problema, ocupacion, prioridad, foto: foto || null });
            const nivel = prioridadCalculada(ocupacion, prioridad)!;
            avisar(`Solicitud ${r.codigo} enviada · Hab. ${numero} · Prioridad ${PRIORIDAD[nivel].etiqueta}.`);
            setNumero('');
            setProblema('');
            setOcupacion('');
            setPrioridad(2);
            setFoto('');
            navegar('/mis-solicitudes');
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    return (
        <Pagina titulo="Nueva solicitud" subtitulo="Reporta una falla en menos de un minuto.">
            <Panel className="max-w-2xl">
                {cat.habitaciones.length === 0 ? (
                    <p className="beta-error">No tienes habitaciones asignadas. Pide al supervisor que te asigne tus habitaciones.</p>
                ) : (
                    <form onSubmit={enviarFormulario} className="space-y-5">
                        <Campo etiqueta="Habitación" ayuda="Escribe el número o elígelo de la lista. El bloque y el piso se completan solos.">
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                <input
                                    list="mis-habitaciones"
                                    inputMode="numeric"
                                    required
                                    value={numero}
                                    onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 5))}
                                    placeholder="Ej: 354"
                                    className="text-lg font-bold tracking-wider sm:w-40"
                                />
                                <datalist id="mis-habitaciones">
                                    {porBloque.map(([b, nums]) => nums.map(n => <option key={n} value={n}>{`Bloque ${b}`}</option>))}
                                </datalist>
                                {habitacion ? (
                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-hotel-primary text-white border border-hotel-accent">
                                        <Building2 size={20} className="text-hotel-accent shrink-0" />
                                        <div className="text-xs">
                                            <span className="text-hotel-accent font-bold block">
                                                Hab. {habitacion.numero} · Bloque {habitacion.bloque} · Piso {habitacion.piso}
                                            </span>
                                            <span className="text-[#C7D9D4]">{habitacion.tipo_habitacion || 'Tipo sin registrar'}</span>
                                        </div>
                                    </div>
                                ) : numero.length >= 3 ? (
                                    <p className="flex-1 text-xs text-red-700">La habitación {numero} no está entre tus habitaciones asignadas.</p>
                                ) : null}
                            </div>
                        </Campo>

                        <Campo etiqueta="Detalle del incidente">
                            <textarea
                                required
                                maxLength={2000}
                                rows={4}
                                value={problema}
                                onChange={e => setProblema(e.target.value)}
                                placeholder="Qué ocurre y dónde (ej. fuga de agua bajo el lavamanos)"
                            />
                        </Campo>

                        <EstadoYPrioridad ocupacion={ocupacion} setOcupacion={setOcupacion} prioridad={prioridad} setPrioridad={setPrioridad} />

                        <SelectorFoto valor={foto} onChange={setFoto} onError={m => avisar(m, 'error')} />

                        <Boton className="w-full" cargando={enviar.isPending} disabled={!habitacion || !problema.trim() || !ocupacion}>
                            <Send size={16} /> Enviar solicitud
                        </Boton>
                    </form>
                )}
            </Panel>
        </Pagina>
    );
}
