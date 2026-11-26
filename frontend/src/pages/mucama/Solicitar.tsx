// Mucama · Solicitar (diseño "Nueva solicitud" + autodetección de bloque y piso del sistema actual).
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Building2, RefreshCw, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { ESTADO, OCUPACION, PRIORIDAD, TIPOS_HABITACION, TURNO, habitacionEnRango, ubicacionHabitacion, type TipoHabitacion } from '../../lib/dominio';
import { fecha, hora } from '../../lib/formato';
import { CLAVES, useAccion, useCatalogos } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, InsigniaPrioridad, Pagina, Panel, Segmentado } from '../../components/ui';
import { SelectorFoto } from '../../components/Formularios';
import type { IncidenteAbierto, Ocupacion } from '../../types';

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
    const [tipo, setTipo] = useState<TipoHabitacion | ''>('');
    const [inexistente, setInexistente] = useState('');
    // Si ya hay un incidente abierto en la habitación, la mucama decide: es el mismo (se reitera) o es otro (se crea)
    const [esOtro, setEsOtro] = useState(false);
    const [comentario, setComentario] = useState('');
    const [ocupacionActual, setOcupacionActual] = useState<Ocupacion | ''>('');
    const enviar = useAccion((d: object) => api<{ codigo: string }>('/solicitudes', { cuerpo: d }), [CLAVES.solicitudes, CLAVES.catalogos]);
    const reiterar = useAccion(
        (v: { id: number; d: object }) =>
            api<{ codigo: string; nivel_prioridad: number; prioridad_subio: boolean }>(`/solicitudes/${v.id}/reiterar`, { cuerpo: v.d }),
        [CLAVES.solicitudes]
    );
    const { data: abiertas = [], isFetching: buscandoAbiertas } = useQuery({
        queryKey: [...CLAVES.solicitudes, 'abiertas', numero],
        queryFn: () => api<IncidenteAbierto[]>('/solicitudes/abiertas/' + numero),
        enabled: habitacionEnRango(numero)
    });
    const decidir = abiertas.length > 0 && !esOtro;

    // Si la habitación ya es tuya se muestran sus datos; si no, el bloque y el piso se calculan del número
    const registrada = useMemo(() => cat?.habitaciones.find(h => h.numero === numero), [cat, numero]);
    const ubicacion = registrada ? { bloque: registrada.bloque, piso: registrada.piso } : ubicacionHabitacion(numero);

    if (isLoading) return <Cargando />;
    if (error || !cat) return <ErrorCarga error={error} reintentar={refetch} />;

    function cambiarNumero(valor: string) {
        const v = valor.replace(/\D/g, '').slice(0, 3);
        if (v.length === 3 && !habitacionEnRango(v)) {
            // Fuera de los bloques 100–400: se avisa y se limpia para que la escriba de nuevo
            avisar(`Habitación inexistente: ${v}. Escribe un número del 100 al 499.`, 'error');
            setInexistente(v);
            setNumero('');
            setTipo('');
            return;
        }
        setInexistente('');
        setEsOtro(false);
        setNumero(v);
        // Si la habitación ya tiene uno de estos tipos, se marca solo
        const tipoGuardado = cat?.habitaciones.find(h => h.numero === v)?.tipo_habitacion;
        setTipo(TIPOS_HABITACION.find(t => t.toLowerCase() === tipoGuardado?.toLowerCase()) ?? '');
    }

    function limpiar() {
        setNumero('');
        setProblema('');
        setOcupacion('');
        setPrioridad(2);
        setFoto('');
        setTipo('');
        setEsOtro(false);
        setComentario('');
        setOcupacionActual('');
    }

    async function reportarDeNuevo(inc: IncidenteAbierto) {
        try {
            const r = await reiterar.mutateAsync({
                id: inc.id_solicitud,
                d: { comentario: comentario.trim() || undefined, ocupacion: ocupacionActual || undefined }
            });
            avisar(
                `${r.codigo} reportado de nuevo · Prioridad ${PRIORIDAD[r.nivel_prioridad].etiqueta}${r.prioridad_subio ? ' (subió)' : ''}. Se avisó al supervisor.`
            );
            limpiar();
            navegar('/mis-solicitudes');
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    async function enviarFormulario(e: FormEvent) {
        e.preventDefault();
        if (!ubicacion) return avisar('Escribe un número de habitación del 100 al 499.', 'error');
        if (!tipo) return avisar('Elige el tipo de habitación.', 'error');
        if (!ocupacion) return avisar('Indica el estado de la habitación.', 'error');
        try {
            const r = await enviar.mutateAsync({
                numero_habitacion: numero,
                tipo_habitacion: tipo,
                problema,
                ocupacion,
                prioridad,
                foto: foto || null,
                es_otro_problema: esOtro || undefined
            });
            const nivel = prioridadCalculada(ocupacion, prioridad)!;
            avisar(`Solicitud ${r.codigo} enviada · Hab. ${numero} · Prioridad ${PRIORIDAD[nivel].etiqueta}.`);
            limpiar();
            navegar('/mis-solicitudes');
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    return (
        <Pagina titulo="Nueva solicitud" subtitulo="Reporta una falla en menos de un minuto.">
            <Panel className="max-w-2xl">
                <form onSubmit={enviarFormulario} className="space-y-5">
                    <Campo etiqueta="Habitación" ayuda="Escribe el número (100 al 499). El bloque y el piso se completan solos (ej. 124 → bloque 100).">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <input
                                inputMode="numeric"
                                required
                                value={numero}
                                onChange={e => cambiarNumero(e.target.value)}
                                placeholder="Ej: 354"
                                className="text-lg font-bold tracking-wider sm:w-40"
                            />
                            {ubicacion ? (
                                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-hotel-primary text-white border border-hotel-accent">
                                    <Building2 size={20} className="text-hotel-accent shrink-0" />
                                    <div className="text-xs">
                                        <span className="text-hotel-accent font-bold block">
                                            Hab. {numero} · Bloque {ubicacion.bloque} · Piso {ubicacion.piso}
                                        </span>
                                        <span className="text-[#C7D9D4]">{registrada ? 'Una de tus habitaciones' : 'Bloque calculado por el número'}</span>
                                    </div>
                                </div>
                            ) : inexistente ? (
                                <p role="alert" className="flex-1 text-xs font-semibold text-red-700">
                                    Habitación inexistente ({inexistente}). Escribe de nuevo un número del 100 al 499.
                                </p>
                            ) : null}
                        </div>
                    </Campo>

                    {decidir && (
                        <div role="alert" className="rounded-2xl border-[1.5px] border-amber-300 bg-[#FFFBEA] p-4 space-y-4">
                            <div className="flex items-start gap-2 text-hotel-dark">
                                <AlertTriangle size={20} className="text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">
                                        La habitación {numero} ya tiene{' '}
                                        {abiertas.length === 1 ? 'un incidente abierto' : `${abiertas.length} incidentes abiertos`}
                                    </p>
                                    <p className="text-xs text-hotel-textMuted">¿Es el mismo problema que vas a reportar?</p>
                                </div>
                            </div>
                            {abiertas.map(inc => (
                                <div key={inc.id_solicitud} className="rounded-xl bg-white border border-[#E2DCCE] p-3 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <strong className="text-hotel-dark">{inc.codigo}</strong>
                                        <InsigniaPrioridad nivel={inc.nivel_prioridad} />
                                        <span className="text-hotel-textMuted">{ESTADO[inc.estado].etiqueta}</span>
                                        {inc.veces_reiterada > 0 && (
                                            <span className="font-bold text-red-700">
                                                Reportada de nuevo {inc.veces_reiterada} {inc.veces_reiterada === 1 ? 'vez' : 'veces'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-hotel-dark whitespace-pre-wrap line-clamp-3">{inc.problema}</p>
                                    <p className="text-[11px] text-hotel-textMuted">
                                        {inc.es_mia ? 'La reportaste tú' : `La reportó ${inc.mucama}`}
                                        {inc.turno_mucama ? ` (turno ${TURNO[inc.turno_mucama].toLowerCase()})` : ''} · {fecha(inc.creada_en)}{' '}
                                        {hora(inc.creada_en)}
                                    </p>
                                    {inc.ya_reiterada ? (
                                        <p className="text-xs font-semibold text-hotel-textMuted">Ya lo reportaste de nuevo; el supervisor fue avisado.</p>
                                    ) : (
                                        <Boton
                                            type="button"
                                            variante="dorado"
                                            className="w-full !py-2"
                                            cargando={reiterar.isPending && reiterar.variables?.id === inc.id_solicitud}
                                            onClick={() => void reportarDeNuevo(inc)}
                                        >
                                            <RefreshCw size={15} /> Es el mismo: volver a reportarlo
                                        </Boton>
                                    )}
                                </div>
                            ))}
                            <div className="beta-label">
                                <span>Estado actual de la habitación (opcional)</span>
                                <Segmentado
                                    etiqueta="Estado actual de la habitación"
                                    valor={ocupacionActual || null}
                                    onChange={setOcupacionActual}
                                    opciones={(['LIBRE', 'RESERVADA', 'OCUPADA'] as Ocupacion[]).map(o => ({ valor: o, texto: OCUPACION[o] }))}
                                />
                            </div>
                            <Campo etiqueta="Comentario (opcional)">
                                <input maxLength={300} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Ej: la fuga empeoró" />
                            </Campo>
                            <p className="text-[11px] text-hotel-textMuted">
                                Al volver a reportarlo, la prioridad sube un nivel y se avisa al supervisor. No se crea un incidente nuevo.
                            </p>
                            <Boton type="button" variante="secundario" className="w-full" onClick={() => setEsOtro(true)}>
                                Es otro problema: registrar uno nuevo
                            </Boton>
                        </div>
                    )}

                    {esOtro && abiertas.length > 0 && (
                        <p className="text-xs text-hotel-textMuted">
                            Registrarás un incidente distinto al que ya está abierto.{' '}
                            <button type="button" className="underline font-semibold text-hotel-dark" onClick={() => setEsOtro(false)}>
                                Cambiar
                            </button>
                        </p>
                    )}

                    {!decidir && (
                        <>
                            <div className="beta-label">
                                <span>Tipo de habitación</span>
                                <Segmentado
                                    etiqueta="Tipo de habitación"
                                    valor={tipo || null}
                                    onChange={setTipo}
                                    opciones={TIPOS_HABITACION.map(t => ({ valor: t, texto: t }))}
                                />
                            </div>

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

                            <Boton
                                className="w-full"
                                cargando={enviar.isPending}
                                disabled={!ubicacion || !tipo || !problema.trim() || !ocupacion || buscandoAbiertas}
                            >
                                <Send size={16} /> Enviar solicitud
                            </Boton>
                        </>
                    )}
                </form>
            </Panel>
        </Pagina>
    );
}
