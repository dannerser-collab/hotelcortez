// Mi perfil: datos, modificar teléfono/nombre, cambiar contraseña y notificaciones.
import { useState, type FormEvent } from 'react';
import { BellRing } from 'lucide-react';
import { api } from '../lib/api';
import { ROL, TURNO } from '../lib/dominio';
import { activarNotificaciones, pushDisponible } from '../lib/push';
import { CLAVES, useAccion, useCatalogos, usePerfil } from '../hooks/datos';
import { useAvisos } from '../hooks/avisos';
import { useSesion } from '../hooks/sesion';
import { Boton, Campo, Cargando, Dato, ErrorCarga, Pagina, Panel } from '../components/ui';

export default function Perfil() {
    const { data: p, isLoading, error, refetch } = usePerfil();
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const { actualizar } = useSesion();
    const [editando, setEditando] = useState(false);
    const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '' });
    const [clave, setClave] = useState({ actual: '', nueva: '', repetir: '' });
    const guardar = useAccion((d: typeof form) => api('/perfil', { metodo: 'PATCH', cuerpo: d }), [CLAVES.perfil]);
    const cambiarClave = useAccion((d: { actual: string; nueva: string }) => api('/auth/clave', { cuerpo: d }), []);

    if (isLoading) return <Cargando />;
    if (error || !p) return <ErrorCarga error={error} reintentar={refetch} />;

    async function enviarPerfil(e: FormEvent) {
        e.preventDefault();
        try {
            await guardar.mutateAsync(form);
            await actualizar();
            setEditando(false);
            avisar('Datos actualizados.');
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    async function enviarClave(e: FormEvent) {
        e.preventDefault();
        if (clave.nueva !== clave.repetir) return avisar('Las contraseñas nuevas no coinciden.', 'error');
        try {
            await cambiarClave.mutateAsync({ actual: clave.actual, nueva: clave.nueva });
            setClave({ actual: '', nueva: '', repetir: '' });
            avisar('Contraseña cambiada. Se cerraron tus otras sesiones.');
        } catch (err) {
            avisar((err as Error).message, 'error');
        }
    }

    return (
        <Pagina titulo="Mi perfil">
            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <Panel
                    titulo="Mis datos"
                    acciones={
                        !editando && (
                            <Boton
                                variante="secundario"
                                onClick={() => {
                                    setForm({ nombre: p.nombre, apellido: p.apellido, telefono: p.telefono || '' });
                                    setEditando(true);
                                }}
                            >
                                Modificar
                            </Boton>
                        )
                    }
                >
                    {!editando ? (
                        <div className="grid grid-cols-2 gap-4">
                            <Dato etiqueta="Código de empleado">{p.codigo}</Dato>
                            <Dato etiqueta="Cargo">{ROL[p.rol as keyof typeof ROL]}</Dato>
                            <Dato etiqueta="Nombre">{p.nombre}</Dato>
                            <Dato etiqueta="Apellido">{p.apellido}</Dato>
                            <Dato etiqueta="Turno">{p.turno ? TURNO[p.turno as keyof typeof TURNO] : '—'}</Dato>
                            <Dato etiqueta="Teléfono">{p.telefono || '—'}</Dato>
                            <Dato etiqueta="CI">{p.ci || '—'}</Dato>
                            <Dato etiqueta="Área">{p.area}</Dato>
                        </div>
                    ) : (
                        <form onSubmit={enviarPerfil} className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Campo etiqueta="Nombre">
                                    <input required maxLength={60} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                                </Campo>
                                <Campo etiqueta="Apellido">
                                    <input required maxLength={60} value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />
                                </Campo>
                            </div>
                            <Campo etiqueta="Teléfono">
                                <input
                                    required
                                    inputMode="tel"
                                    pattern="\+?\d{6,15}"
                                    value={form.telefono}
                                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                                />
                            </Campo>
                            <p className="text-xs text-hotel-textMuted">El cargo y el turno los cambia el supervisor.</p>
                            <div className="flex gap-2">
                                <Boton cargando={guardar.isPending}>Guardar</Boton>
                                <Boton type="button" variante="secundario" onClick={() => setEditando(false)}>
                                    Cancelar
                                </Boton>
                            </div>
                        </form>
                    )}
                </Panel>

                <div className="space-y-5">
                    <Panel titulo="Cambiar contraseña">
                        <form onSubmit={enviarClave} className="space-y-3">
                            <Campo etiqueta="Contraseña actual">
                                <input
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={clave.actual}
                                    onChange={e => setClave({ ...clave, actual: e.target.value })}
                                />
                            </Campo>
                            <Campo etiqueta="Nueva contraseña">
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    value={clave.nueva}
                                    onChange={e => setClave({ ...clave, nueva: e.target.value })}
                                />
                            </Campo>
                            <Campo etiqueta="Repetir nueva contraseña">
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    value={clave.repetir}
                                    onChange={e => setClave({ ...clave, repetir: e.target.value })}
                                />
                            </Campo>
                            <Boton cargando={cambiarClave.isPending}>Cambiar contraseña</Boton>
                        </form>
                    </Panel>
                    <Panel titulo="Notificaciones">
                        <p className="text-sm text-hotel-textMuted">
                            {pushDisponible()
                                ? 'Recibe avisos en este dispositivo aunque la aplicación esté cerrada.'
                                : 'En este dispositivo los avisos llegan solo con la aplicación abierta. Para avisos con la app cerrada, el sistema debe abrirse por HTTPS.'}
                        </p>
                        {pushDisponible() && (
                            <Boton
                                variante="dorado"
                                onClick={() =>
                                    activarNotificaciones(cat?.push ?? null)
                                        .then(() => avisar('Notificaciones activadas en este dispositivo.'))
                                        .catch(e => avisar(e.message, 'error'))
                                }
                            >
                                <BellRing size={16} /> Activar notificaciones
                            </Boton>
                        )}
                    </Panel>
                </div>
            </div>
        </Pagina>
    );
}
