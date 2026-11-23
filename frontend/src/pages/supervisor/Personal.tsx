// Supervisor · Personal y turnos: aprobar solicitudes de acceso, turnos, estado, rol y contraseñas.
import { useState } from 'react';
import { KeyRound, UserCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { ROL, TURNO } from '../../lib/dominio';
import { fecha } from '../../lib/formato';
import { CLAVES, useAccion, useCatalogos, useEmpleados } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { useUsuario } from '../../hooks/sesion';
import { Boton, Cargando, ErrorCarga, Pagina, Panel, Vacio } from '../../components/ui';
import type { Empleado } from '../../types';

const ESTADOS: Record<number, string> = { 1: 'Activo', 2: 'De vacaciones', 3: 'De baja', 4: 'Pendiente de aprobación' };

export default function Personal() {
    const yo = useUsuario();
    const { data, isLoading, error, refetch } = useEmpleados();
    const { data: cat } = useCatalogos();
    const { avisar } = useAvisos();
    const cambiar = useAccion(
        (v: { id: number; d: object }) => api('/empleados/' + v.id, { metodo: 'PATCH', cuerpo: v.d }),
        [CLAVES.empleados, CLAVES.catalogos]
    );
    const clave = useAccion((v: { id: number; nueva: string }) => api(`/empleados/${v.id}/clave`, { cuerpo: { nueva: v.nueva } }), []);
    const [filtro, setFiltro] = useState<'' | 'MUCAMA' | 'TECNICO' | 'SUPERVISOR'>('');

    if (isLoading) return <Cargando />;
    if (error || !data) return <ErrorCarga error={error} reintentar={refetch} />;
    const pendientes = data.filter(e => e.id_estado_empleado === 4);
    const resto = data.filter(e => e.id_estado_empleado !== 4 && (!filtro || e.rol === filtro));
    const aplicar = (e: Empleado, d: object, msg: string) =>
        cambiar
            .mutateAsync({ id: e.id_empleado, d })
            .then(() => avisar(msg))
            .catch(er => avisar(er.message, 'error'));

    return (
        <Pagina titulo="Personal y turnos" subtitulo={cat?.turno_actual ? `Turno actual: ${TURNO[cat.turno_actual]}` : undefined}>
            {pendientes.length > 0 && (
                <Panel titulo={`Solicitudes de acceso (${pendientes.length})`} className="border-hotel-accent">
                    <ul className="divide-y divide-[#EDE8DC]">
                        {pendientes.map(e => (
                            <li key={e.id_empleado} className="py-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">
                                        {e.nombre} {e.apellido} <span className="text-xs text-hotel-textMuted">· {e.codigo}</span>
                                    </p>
                                    <p className="text-xs text-hotel-textMuted">
                                        {ROL[e.rol]} · Turno {e.turno ? TURNO[e.turno].toLowerCase() : '—'} · CI {e.ci} · Tel. {e.telefono} ·{' '}
                                        {fecha(e.creado_en)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Boton
                                        className="!py-2"
                                        onClick={() => void aplicar(e, { id_estado_empleado: 1 }, `${e.nombre} ya puede ingresar con ${e.codigo}.`)}
                                    >
                                        <UserCheck size={16} /> Aprobar
                                    </Boton>
                                    <Boton
                                        variante="secundario"
                                        onClick={() =>
                                            confirm('¿Rechazar esta solicitud de acceso?') && void aplicar(e, { id_estado_empleado: 3 }, 'Solicitud rechazada.')
                                        }
                                    >
                                        Rechazar
                                    </Boton>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}
            <Panel
                titulo="Personal"
                acciones={
                    <select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)} className="!py-2" aria-label="Filtrar por cargo">
                        <option value="">Todos los cargos</option>
                        {Object.entries(ROL).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                }
            >
                {!resto.length ? (
                    <Vacio>Sin personal.</Vacio>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-hotel-textMuted">
                                    <th className="py-2 pr-3">Empleado</th>
                                    <th className="py-2 pr-3">Cargo</th>
                                    <th className="py-2 pr-3">Turno</th>
                                    <th className="py-2 pr-3">Estado</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {resto.map(e => (
                                    <tr key={e.id_empleado} className="border-t border-[#EDE8DC]">
                                        <td className="py-2 pr-3">
                                            <p className="font-semibold whitespace-nowrap">
                                                {e.nombre} {e.apellido}
                                            </p>
                                            <p className="text-xs text-hotel-textMuted">
                                                {e.codigo} · {e.telefono || 'sin teléfono'}
                                            </p>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <select
                                                className="!py-1.5"
                                                value={e.rol}
                                                disabled={e.id_empleado === yo.id_empleado}
                                                onChange={x => void aplicar(e, { rol: x.target.value }, 'Cargo actualizado.')}
                                            >
                                                {Object.entries(ROL).map(([k, v]) => (
                                                    <option key={k} value={k}>
                                                        {v}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <select
                                                className="!py-1.5"
                                                value={e.turno ?? ''}
                                                onChange={x => void aplicar(e, { turno: x.target.value }, 'Turno actualizado.')}
                                            >
                                                {!e.turno && <option value="">—</option>}
                                                {cat?.turnos.map(t => (
                                                    <option key={t.codigo} value={t.codigo}>
                                                        {t.nombre} ({t.hora_inicio}–{t.hora_fin})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <select
                                                className="!py-1.5"
                                                value={e.id_estado_empleado}
                                                disabled={e.id_empleado === yo.id_empleado}
                                                onChange={x => void aplicar(e, { id_estado_empleado: Number(x.target.value) }, 'Estado actualizado.')}
                                            >
                                                {[1, 2, 3].map(n => (
                                                    <option key={n} value={n}>
                                                        {ESTADOS[n]}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 text-right">
                                            <button
                                                className="beta-secondary"
                                                title="Asignar una contraseña nueva"
                                                onClick={() => {
                                                    const nueva = prompt(`Nueva contraseña para ${e.nombre} (mínimo 6 caracteres):`);
                                                    if (nueva)
                                                        clave
                                                            .mutateAsync({ id: e.id_empleado, nueva })
                                                            .then(() => avisar('Contraseña cambiada. Comunícasela en persona.'))
                                                            .catch(er => avisar(er.message, 'error'));
                                                }}
                                            >
                                                <KeyRound size={14} /> Clave
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </Pagina>
    );
}
