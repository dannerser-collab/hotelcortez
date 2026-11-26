// Supervisor · Rack de habitaciones: estado de mantenimiento, mucama asignada, historial y alta de habitaciones.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { CLAVES, useAccion, useCatalogos, useSolicitudes } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, InsigniaEstado, Modal, Pagina, Panel, Vacio } from '../../components/ui';
import { fecha } from '../../lib/formato';
import type { Habitacion } from '../../types';

export default function Rack() {
    const { data: cat, isLoading, error, refetch } = useCatalogos();
    const [buscar, setBuscar] = useState('');
    const [bloque, setBloque] = useState('');
    const [soloFallas, setSoloFallas] = useState(false);
    const [elegida, setElegida] = useState<Habitacion | null>(null);
    const [nueva, setNueva] = useState(false);

    if (isLoading) return <Cargando />;
    if (error || !cat) return <ErrorCarga error={error} reintentar={refetch} />;
    const lista = cat.habitaciones.filter(h => h.numero.includes(buscar) && (!bloque || String(h.bloque) === bloque) && (!soloFallas || !h.operativa));

    return (
        <Pagina
            titulo="Rack de habitaciones"
            subtitulo={`${cat.habitaciones.filter(h => h.operativa).length} operativas · ${cat.habitaciones.filter(h => !h.operativa).length} en mantenimiento`}
            acciones={
                <Boton variante="dorado" onClick={() => setNueva(true)}>
                    <Plus size={16} /> Registrar habitación
                </Boton>
            }
        >
            <div className="beta-card !p-4 flex flex-wrap gap-3 items-end">
                <label className="beta-label flex-1 min-w-[160px]">
                    Buscar habitación
                    <input value={buscar} onChange={e => setBuscar(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 437" inputMode="numeric" />
                </label>
                <label className="beta-label">
                    Bloque
                    <select value={bloque} onChange={e => setBloque(e.target.value)}>
                        <option value="">Todos</option>
                        {cat.bloques.map(b => (
                            <option key={b}>{b}</option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold h-[46px]">
                    <input type="checkbox" checked={soloFallas} onChange={e => setSoloFallas(e.target.checked)} /> Solo con fallas
                </label>
            </div>
            {!lista.length ? (
                <Vacio>No hay habitaciones con esos filtros.</Vacio>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                    {lista.map(h => (
                        <button
                            key={h.id_habitacion}
                            onClick={() => setElegida(h)}
                            className={
                                'text-left rounded-xl border p-4 transition-colors ' +
                                (h.operativa ? 'bg-white border-[#E2DCCE] hover:border-hotel-accent' : 'bg-hotel-primary text-white border-hotel-accent')
                            }
                        >
                            <Building2 size={18} className="text-hotel-accent" />
                            <strong className="font-serif text-2xl block">{h.numero}</strong>
                            <p className="text-xs">
                                Bloque {h.bloque} · Piso {h.piso}
                            </p>
                            <p className="text-xs opacity-80 truncate">{h.tipo_habitacion || 'Sin tipo'}</p>
                            <p className="text-xs mt-2 font-semibold">{h.operativa ? 'Operativa' : `Mantenimiento (${h.abiertas})`}</p>
                        </button>
                    ))}
                </div>
            )}
            {elegida && (
                <DetalleHabitacion h={cat.habitaciones.find(x => x.id_habitacion === elegida.id_habitacion) || elegida} onCerrar={() => setElegida(null)} />
            )}
            {nueva && <NuevaHabitacion onCerrar={() => setNueva(false)} />}
        </Pagina>
    );
}

function DetalleHabitacion({ h, onCerrar }: { h: Habitacion; onCerrar: () => void }) {
    const { data: cat } = useCatalogos();
    const { data: sols } = useSolicitudes({ q: h.numero, historial: true });
    const { avisar } = useAvisos();
    const guardar = useAccion((d: object) => api('/habitaciones/' + h.id_habitacion, { metodo: 'PATCH', cuerpo: d }), [CLAVES.catalogos]);
    const cambiar = (d: object, msg: string) =>
        guardar
            .mutateAsync(d)
            .then(() => avisar(msg))
            .catch(e => avisar(e.message, 'error'));
    const historial = (sols || []).filter(s => s.id_habitacion === h.id_habitacion);

    return (
        <Modal titulo={`Habitación ${h.numero} · Bloque ${h.bloque}`} onCerrar={onCerrar}>
            <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                    <Campo etiqueta="Mucama responsable">
                        <select
                            value={h.id_mucama ?? ''}
                            disabled={guardar.isPending}
                            onChange={e => void cambiar({ id_mucama: e.target.value ? Number(e.target.value) : null }, 'Mucama asignada.')}
                        >
                            <option value="">Sin asignar</option>
                            {cat?.mucamas.map(m => (
                                <option key={m.id_empleado} value={m.id_empleado}>
                                    {m.nombre} {m.apellido}
                                </option>
                            ))}
                        </select>
                    </Campo>
                    <Campo etiqueta="Tipo de habitación">
                        <select
                            value={h.id_tipo_hab ?? ''}
                            disabled={guardar.isPending}
                            onChange={e => void cambiar({ id_tipo_hab: e.target.value ? Number(e.target.value) : null }, 'Tipo actualizado.')}
                        >
                            <option value="">Sin tipo</option>
                            {cat?.tipos_habitacion.map(t => (
                                <option key={t.id_tipo_hab} value={t.id_tipo_hab}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                    </Campo>
                </div>
                <Panel titulo="Historial de solicitudes" className="!p-4">
                    {!historial.length ? (
                        <Vacio>Sin solicitudes registradas.</Vacio>
                    ) : (
                        <ul className="divide-y divide-[#EDE8DC]">
                            {historial.map(s => (
                                <li key={s.id_solicitud} className="py-2 flex items-center justify-between gap-3">
                                    <Link to={'/incidentes/' + s.id_solicitud} className="min-w-0">
                                        <p className="text-sm font-semibold truncate hover:underline">{s.problema}</p>
                                        <p className="text-xs text-hotel-textMuted">
                                            {s.codigo} · {fecha(s.creada_en)}
                                            {s.tecnico && ` · ${s.tecnico}`}
                                        </p>
                                    </Link>
                                    <InsigniaEstado estado={s.estado} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
        </Modal>
    );
}

function NuevaHabitacion({ onCerrar }: { onCerrar: () => void }) {
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const [numero, setNumero] = useState('');
    const [piso, setPiso] = useState('');
    const [tipo, setTipo] = useState('');
    const [nuevoTipo, setNuevoTipo] = useState('');
    const [mucama, setMucama] = useState('');
    const crear = useAccion((d: object) => api('/habitaciones', { cuerpo: d }), [CLAVES.catalogos]);
    const crearTipo = useAccion((nombre: string) => api('/tipos-habitacion', { cuerpo: { nombre } }), [CLAVES.catalogos]);

    async function enviar(e: FormEvent) {
        e.preventDefault();
        try {
            let idTipo = tipo ? Number(tipo) : null;
            if (tipo === 'nuevo') {
                await crearTipo.mutateAsync(nuevoTipo);
                const c = await api<{ tipos_habitacion: { id_tipo_hab: number; nombre: string }[] }>('/catalogos');
                idTipo = c.tipos_habitacion.find(t => t.nombre.toLowerCase() === nuevoTipo.trim().toLowerCase())?.id_tipo_hab ?? null;
            }
            await crear.mutateAsync({ numero, piso: piso ? Number(piso) : undefined, id_tipo_hab: idTipo, id_mucama: mucama ? Number(mucama) : null });
            avisar(`Habitación ${numero} registrada.`);
            onCerrar();
        } catch (er) {
            avisar((er as Error).message, 'error');
        }
    }

    return (
        <Modal titulo="Registrar habitación" onCerrar={onCerrar} ancho="max-w-lg">
            <form onSubmit={enviar} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Campo etiqueta="Número" ayuda={numero.length >= 3 ? `Bloque ${Number(numero[0]) * 100}` : 'El bloque se calcula solo.'}>
                        <input
                            required
                            inputMode="numeric"
                            pattern="\d{3,5}"
                            value={numero}
                            onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        />
                    </Campo>
                    <Campo etiqueta="Piso" ayuda="Vacío = primer dígito.">
                        <input inputMode="numeric" value={piso} onChange={e => setPiso(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                    </Campo>
                </div>
                <Campo etiqueta="Tipo de habitación">
                    <select value={tipo} onChange={e => setTipo(e.target.value)}>
                        <option value="">Sin tipo</option>
                        {cat?.tipos_habitacion.map(t => (
                            <option key={t.id_tipo_hab} value={t.id_tipo_hab}>
                                {t.nombre}
                            </option>
                        ))}
                        <option value="nuevo">Otro (escribir)</option>
                    </select>
                </Campo>
                {tipo === 'nuevo' && (
                    <Campo etiqueta="Nombre del nuevo tipo">
                        <input required maxLength={50} value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} />
                    </Campo>
                )}
                <Campo etiqueta="Mucama responsable">
                    <select value={mucama} onChange={e => setMucama(e.target.value)}>
                        <option value="">Sin asignar</option>
                        {cat?.mucamas.map(m => (
                            <option key={m.id_empleado} value={m.id_empleado}>
                                {m.nombre} {m.apellido}
                            </option>
                        ))}
                    </select>
                </Campo>
                <Boton className="w-full" cargando={crear.isPending || crearTipo.isPending}>
                    Registrar
                </Boton>
            </form>
        </Modal>
    );
}
