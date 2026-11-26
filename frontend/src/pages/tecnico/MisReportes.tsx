// Técnico · Mis reportes: solo el supervisor modifica un reporte; el técnico pide el cambio.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { fecha, hora } from '../../lib/formato';
import { CLAVES, useAccion, useModificaciones, useSolicitudes } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { useUsuario } from '../../hooks/sesion';
import { Boton, Cargando, Dato, ErrorCarga, Pagina, Vacio } from '../../components/ui';

export default function MisReportes() {
    const u = useUsuario();
    const { data, isLoading, error, refetch } = useSolicitudes({ historial: true });
    const { data: mods } = useModificaciones();
    const [abierto, setAbierto] = useState<number | null>(null);
    const [detalle, setDetalle] = useState('');
    const { avisar } = useAvisos();
    const pedir = useAccion(
        (v: { id: number; detalle: string }) => api(`/reportes/${v.id}/modificaciones`, { cuerpo: { detalle: v.detalle } }),
        [CLAVES.modificaciones]
    );

    const reportes = (data || []).filter(s => s.id_tecnico === u.id_empleado && s.id_ultimo_reporte);

    return (
        <Pagina titulo="Mis reportes" subtitulo="Solo el supervisor puede modificar un reporte. Escribe exactamente qué debe cambiar.">
            {isLoading ? (
                <Cargando />
            ) : error ? (
                <ErrorCarga error={error} reintentar={refetch} />
            ) : !reportes.length ? (
                <Vacio>Aún no enviaste reportes.</Vacio>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {reportes.map(s => {
                        const pendiente = mods?.find(m => m.id_reporte === s.id_ultimo_reporte && m.estado === 'PENDIENTE');
                        const hecha = mods?.find(m => m.id_reporte === s.id_ultimo_reporte && m.estado === 'HECHA');
                        return (
                            <article key={s.id_solicitud} className="beta-card !p-4 space-y-3">
                                <div className="flex justify-between items-center gap-2">
                                    <Link to={`/asignaciones/${s.id_solicitud}`} className="font-bold text-hotel-dark hover:underline">
                                        Hab {s.numero} · Bloque {s.bloque}
                                    </Link>
                                    <span
                                        className={
                                            'text-[11px] font-bold px-2 py-0.5 rounded-full ' +
                                            (s.ultimo_resultado === 'HECHO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')
                                        }
                                    >
                                        {s.ultimo_resultado === 'HECHO' ? 'Hecho' : 'Pendiente'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Dato etiqueta="Hora">{hora(s.ultimo_reporte_en)}</Dato>
                                    <Dato etiqueta="Fecha">{fecha(s.ultimo_reporte_en)}</Dato>
                                </div>
                                <p className="text-sm whitespace-pre-wrap line-clamp-3">{s.ultima_observacion}</p>
                                {pendiente ? (
                                    <p className="text-xs rounded-lg bg-[#FFFBEA] border border-[#EBD27A] p-2">
                                        Modificación solicitada: «{pendiente.detalle}». Esperando al supervisor.
                                    </p>
                                ) : abierto === s.id_ultimo_reporte ? (
                                    <form
                                        className="space-y-2"
                                        onSubmit={e => {
                                            e.preventDefault();
                                            pedir
                                                .mutateAsync({ id: s.id_ultimo_reporte!, detalle })
                                                .then(() => {
                                                    avisar('Solicitud de modificación enviada.');
                                                    setAbierto(null);
                                                    setDetalle('');
                                                })
                                                .catch(er => avisar(er.message, 'error'));
                                        }}
                                    >
                                        <label className="beta-label">
                                            ¿Qué hay que modificar?
                                            <textarea
                                                required
                                                rows={2}
                                                maxLength={1000}
                                                value={detalle}
                                                onChange={e => setDetalle(e.target.value)}
                                                placeholder="Ej: cambiar la cantidad de focos de 1 a 2"
                                            />
                                        </label>
                                        <div className="flex gap-2">
                                            <Boton cargando={pedir.isPending}>Enviar solicitud de modificación</Boton>
                                            <Boton type="button" variante="secundario" onClick={() => setAbierto(null)}>
                                                Cancelar
                                            </Boton>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        {hecha && <p className="text-xs text-emerald-800">Última modificación aplicada el {fecha(hecha.atendida_en)}.</p>}
                                        <Boton variante="secundario" onClick={() => setAbierto(s.id_ultimo_reporte)}>
                                            Solicitar modificación
                                        </Boton>
                                    </>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </Pagina>
    );
}
