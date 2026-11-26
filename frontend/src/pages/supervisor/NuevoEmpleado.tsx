// Supervisor · Alta de personal: el formulario cambia según sea mucama o técnico.
import { useState, type FormEvent } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { CLAVES, useAccion, useCatalogos } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Modal, Segmentado } from '../../components/ui';
import type { CodigoTurno } from '../../types';

type Cargo = 'MUCAMA' | 'TECNICO';

/** Contraseña inicial fácil de dictar (sin 0/O ni 1/l). */
function claveAleatoria() {
    const letras = 'abcdefghjkmnpqrstuvwxyz';
    const nums = '23456789';
    const azar = (s: string) => s[Math.floor(Math.random() * s.length)];
    return Array.from({ length: 4 }, () => azar(letras)).join('') + Array.from({ length: 4 }, () => azar(nums)).join('');
}

export function NuevoEmpleado({ onCerrar }: { onCerrar: () => void }) {
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const [cargo, setCargo] = useState<Cargo | null>(null);
    const [datos, setDatos] = useState({ nombre: '', apellido: '', ci: '', telefono: '' });
    const [turno, setTurno] = useState<CodigoTurno | ''>('');
    const [entrada, setEntrada] = useState('');
    const [salida, setSalida] = useState('');
    const [especialidades, setEspecialidades] = useState<number[]>([]);
    const [clave, setClave] = useState(claveAleatoria);
    const [creado, setCreado] = useState<{ codigo: string; nombre: string; clave: string } | null>(null);
    const crear = useAccion((d: object) => api<{ codigo: string }>('/empleados', { cuerpo: d }), [CLAVES.empleados, CLAVES.catalogos]);

    const campo = (k: keyof typeof datos) => ({ value: datos[k], onChange: (e: { target: { value: string } }) => setDatos({ ...datos, [k]: e.target.value }) });

    function elegirTurno(codigo: CodigoTurno) {
        setTurno(codigo);
        // El horario se llena con el del turno; el supervisor puede ajustarlo
        const t = cat?.turnos.find(x => x.codigo === codigo);
        if (t) {
            setEntrada(t.hora_inicio);
            setSalida(t.hora_fin);
        }
    }

    const alternar = (id: number) => setEspecialidades(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]));

    async function enviar(e: FormEvent) {
        e.preventDefault();
        if (!cargo) return avisar('Elige si es mucama o técnico.', 'error');
        if (!turno) return avisar('Elige el turno.', 'error');
        if (cargo === 'TECNICO' && !especialidades.length) return avisar('Elige al menos una especialidad.', 'error');
        try {
            const r = await crear.mutateAsync({
                rol: cargo,
                ...datos,
                turno,
                hora_entrada: entrada,
                hora_salida: salida,
                especialidades: cargo === 'TECNICO' ? especialidades : [],
                password: clave
            });
            setCreado({ codigo: r.codigo, nombre: `${datos.nombre} ${datos.apellido}`, clave });
            avisar(`${cargo === 'MUCAMA' ? 'Mucama' : 'Técnico'} registrado con el código ${r.codigo}.`);
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    if (creado)
        return (
            <Modal titulo="Personal registrado" onCerrar={onCerrar} ancho="max-w-md">
                <div className="space-y-4">
                    <p className="text-sm text-hotel-dark">
                        <strong>{creado.nombre}</strong> ya puede ingresar al sistema. Entrégale estos datos en persona:
                    </p>
                    <div className="rounded-xl bg-[#FAF8F4] border border-[#E2DCCE] p-4 grid grid-cols-2 gap-3 text-sm">
                        <span className="text-hotel-textMuted">Código</span>
                        <strong className="text-lg tracking-wider">{creado.codigo}</strong>
                        <span className="text-hotel-textMuted">Contraseña</span>
                        <strong className="text-lg tracking-wider font-mono">{creado.clave}</strong>
                    </div>
                    <p className="text-[11px] text-hotel-textMuted">Podrá cambiar su contraseña desde «Mi perfil». Esta pantalla no se vuelve a mostrar.</p>
                    <div className="flex gap-2">
                        <Boton
                            type="button"
                            variante="secundario"
                            className="flex-1"
                            onClick={() =>
                                navigator.clipboard
                                    ?.writeText(`Código: ${creado.codigo}\nContraseña: ${creado.clave}`)
                                    .then(() => avisar('Datos copiados.'))
                                    .catch(() => avisar('No se pudo copiar.', 'error'))
                            }
                        >
                            <Copy size={15} /> Copiar
                        </Boton>
                        <Boton type="button" className="flex-1" onClick={onCerrar}>
                            Listo
                        </Boton>
                    </div>
                </div>
            </Modal>
        );

    return (
        <Modal titulo="Agregar personal" onCerrar={onCerrar}>
            <form onSubmit={enviar} className="space-y-5">
                <div className="beta-label">
                    <span>¿Qué cargo tendrá?</span>
                    <Segmentado
                        etiqueta="Cargo"
                        valor={cargo}
                        onChange={setCargo}
                        opciones={[
                            { valor: 'MUCAMA', texto: 'Nueva mucama', detalle: 'Gobernanza' },
                            { valor: 'TECNICO', texto: 'Nuevo técnico', detalle: 'Mantenimiento' }
                        ]}
                    />
                </div>

                {cargo && (
                    <>
                        <fieldset className="grid sm:grid-cols-2 gap-4">
                            <legend className="text-xs font-bold uppercase tracking-wide text-hotel-textMuted mb-2">Datos personales</legend>
                            <Campo etiqueta="Nombre">
                                <input required maxLength={60} autoComplete="off" {...campo('nombre')} />
                            </Campo>
                            <Campo etiqueta="Apellido">
                                <input required maxLength={60} autoComplete="off" {...campo('apellido')} />
                            </Campo>
                            <Campo etiqueta="CI" ayuda="Carnet de identidad, sin espacios.">
                                <input required maxLength={15} pattern="[0-9A-Za-z\-]{5,15}" autoComplete="off" {...campo('ci')} />
                            </Campo>
                            <Campo etiqueta="Teléfono">
                                <input
                                    required
                                    inputMode="tel"
                                    maxLength={16}
                                    pattern="\+?\d{6,15}"
                                    placeholder="Ej: 71234567"
                                    autoComplete="off"
                                    {...campo('telefono')}
                                />
                            </Campo>
                        </fieldset>

                        <fieldset className="space-y-3">
                            <legend className="text-xs font-bold uppercase tracking-wide text-hotel-textMuted mb-2">
                                {cargo === 'MUCAMA' ? 'Horario de trabajo' : 'Turno y horario'}
                            </legend>
                            <Segmentado
                                etiqueta="Turno"
                                valor={turno || null}
                                onChange={elegirTurno}
                                opciones={(cat?.turnos ?? []).map(t => ({ valor: t.codigo, texto: t.nombre, detalle: `${t.hora_inicio}–${t.hora_fin}` }))}
                            />
                            {turno && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Campo etiqueta="Hora de entrada">
                                        <input type="time" required value={entrada} onChange={e => setEntrada(e.target.value)} />
                                    </Campo>
                                    <Campo etiqueta="Hora de salida">
                                        <input type="time" required value={salida} onChange={e => setSalida(e.target.value)} />
                                    </Campo>
                                    <p className="col-span-2 text-[11px] text-hotel-textMuted -mt-2">
                                        Se completa con el horario del turno; ajústalo si trabaja de otra hora a otra hora.
                                    </p>
                                </div>
                            )}
                        </fieldset>

                        {cargo === 'TECNICO' && (
                            <fieldset className="space-y-2">
                                <legend className="text-xs font-bold uppercase tracking-wide text-hotel-textMuted mb-2">Especialidades</legend>
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {(cat?.especialidades ?? []).map(es => (
                                        <label
                                            key={es.id_especialidad}
                                            className={
                                                'flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-sm cursor-pointer ' +
                                                (especialidades.includes(es.id_especialidad)
                                                    ? 'bg-hotel-primary text-white border-hotel-accent'
                                                    : 'bg-white border-[#D8D0BE] hover:border-hotel-accent')
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                className="accent-[#C9A96E]"
                                                checked={especialidades.includes(es.id_especialidad)}
                                                onChange={() => alternar(es.id_especialidad)}
                                            />
                                            {es.nombre}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[11px] text-hotel-textMuted">Puedes marcar varias.</p>
                            </fieldset>
                        )}

                        <fieldset>
                            <legend className="text-xs font-bold uppercase tracking-wide text-hotel-textMuted mb-2">Acceso al sistema</legend>
                            <Campo etiqueta="Contraseña inicial" ayuda="Generada automáticamente; puedes cambiarla. Mínimo 6 caracteres.">
                                <div className="flex gap-2">
                                    <input
                                        required
                                        minLength={6}
                                        maxLength={100}
                                        value={clave}
                                        onChange={e => setClave(e.target.value)}
                                        className="flex-1 font-mono"
                                    />
                                    <Boton type="button" variante="secundario" onClick={() => setClave(claveAleatoria())}>
                                        Generar otra
                                    </Boton>
                                </div>
                            </Campo>
                        </fieldset>

                        <Boton className="w-full" cargando={crear.isPending}>
                            <UserPlus size={16} /> Registrar {cargo === 'MUCAMA' ? 'mucama' : 'técnico'}
                        </Boton>
                    </>
                )}
            </form>
        </Modal>
    );
}
