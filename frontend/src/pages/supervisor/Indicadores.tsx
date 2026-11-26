// Supervisor · Indicadores: tiempos de respuesta (MTTR), carga por técnico, especialidad,
// habitaciones más reportadas y materiales. Gráficos de una sola serie (un tono), con valores visibles.
import { useState } from 'react';
import { AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { duracion, cantidad } from '../../lib/formato';
import { useIndicadores } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { descargar } from '../../lib/api';
import { Boton, Cargando, ErrorCarga, Pagina, Panel, Pestanas, Vacio } from '../../components/ui';

type Fila = { etiqueta: string; valor: number; detalle?: string };

/** Barras horizontales de una serie: el valor siempre visible a la derecha (no depende del color). */
function Barras({ filas, formato = (n: number) => String(n) }: { filas: Fila[]; formato?: (n: number) => string }) {
    if (!filas.length) return <Vacio>Sin datos en este periodo.</Vacio>;
    const max = Math.max(...filas.map(f => f.valor), 1);
    return (
        <ul className="space-y-2.5">
            {filas.map(f => (
                <li key={f.etiqueta} className="group" title={`${f.etiqueta}: ${formato(f.valor)}${f.detalle ? ' · ' + f.detalle : ''}`}>
                    <div className="flex justify-between gap-3 text-xs mb-1">
                        <span className="font-semibold text-hotel-dark truncate">{f.etiqueta}</span>
                        <span className="text-hotel-textMuted whitespace-nowrap">
                            <strong className="text-hotel-dark">{formato(f.valor)}</strong>
                            {f.detalle && ` · ${f.detalle}`}
                        </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#EDE8DC] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-hotel-primary group-hover:bg-hotel-dark transition-colors"
                            style={{ width: `${Math.max(2, (f.valor / max) * 100)}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Columnas por día (reportadas). Una serie; el número aparece al pasar el cursor y en la tabla. */
/** Completa los días sin solicitudes con 0 para que el eje de tiempo sea continuo. */
function completarDias(datos: { dia: string; reportadas: number; resueltas: number }[], total: number) {
    const mapa = new Map(datos.map(d => [d.dia, d]));
    const out = [];
    const hoy = new Date();
    for (let i = total - 1; i >= 0; i--) {
        const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
        const dia = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
        const d = mapa.get(dia);
        out.push({ dia, reportadas: Number(d?.reportadas || 0), resueltas: Number(d?.resueltas || 0) });
    }
    return out;
}

function Tendencia({ dias }: { dias: { dia: string; reportadas: number; resueltas: number }[] }) {
    const [foco, setFoco] = useState<number | null>(null);
    if (!dias.length) return <Vacio>Sin datos en este periodo.</Vacio>;
    const max = Math.max(...dias.map(d => d.reportadas), 1);
    const f = foco !== null ? dias[foco] : null;
    return (
        <div className="space-y-2">
            <p className="text-xs text-hotel-textMuted h-4">
                {f ? (
                    <>
                        <strong className="text-hotel-dark">{f.dia.split('-').reverse().join('/')}</strong>: {f.reportadas} reportadas · {f.resueltas} resueltas
                    </>
                ) : (
                    'Pasa el cursor o toca una barra para ver el detalle.'
                )}
            </p>
            <div className="flex items-end gap-[2px] h-40 border-b border-[#D8D0BE]" role="img" aria-label="Solicitudes reportadas por día">
                {dias.map((d, i) => (
                    <button
                        key={d.dia}
                        type="button"
                        onMouseEnter={() => setFoco(i)}
                        onFocus={() => setFoco(i)}
                        onClick={() => setFoco(i)}
                        onMouseLeave={() => setFoco(null)}
                        className="flex-1 h-full flex items-end min-w-[4px]"
                        aria-label={`${d.dia}: ${d.reportadas} reportadas, ${d.resueltas} resueltas`}
                    >
                        <span
                            className={'w-full rounded-t-[4px] ' + (foco === i ? 'bg-hotel-dark' : 'bg-hotel-primary')}
                            style={{ height: `${(d.reportadas / max) * 100}%` }}
                        />
                    </button>
                ))}
            </div>
            <div className="flex justify-between text-[11px] text-hotel-textMuted">
                <span>{dias[0].dia.split('-').reverse().join('/')}</span>
                <span>{dias[dias.length - 1].dia.split('-').reverse().join('/')}</span>
            </div>
        </div>
    );
}

export default function Indicadores() {
    const [dias, setDias] = useState<'7' | '30' | '90'>('30');
    const { data: d, isLoading, error, refetch } = useIndicadores(Number(dias));
    const { avisar } = useAvisos();
    const [exportando, setExportando] = useState(false);

    async function exportar() {
        setExportando(true);
        try {
            await descargar(`/indicadores/excel?dias=${dias}`, `indicadores-${dias}d.xlsx`);
            avisar('Excel descargado.');
        } catch (e) {
            avisar((e as Error).message, 'error');
        } finally {
            setExportando(false);
        }
    }

    return (
        <Pagina
            titulo="Indicadores"
            subtitulo="Tiempos medidos desde que la mucama reporta. MTTR = tiempo medio de reparación (inicio → resuelto)."
            acciones={
                <Boton variante="dorado" cargando={exportando} onClick={() => void exportar()} title="Descarga todos los datos del periodo elegido">
                    <FileSpreadsheet size={16} /> Exportar a Excel
                </Boton>
            }
        >
            <Pestanas
                valor={dias}
                onChange={setDias}
                opciones={[
                    { valor: '7', texto: '7 días' },
                    { valor: '30', texto: '30 días' },
                    { valor: '90', texto: '90 días' }
                ]}
            />
            {isLoading ? (
                <Cargando />
            ) : error || !d ? (
                <ErrorCarga error={error} reintentar={refetch} />
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            ['Solicitudes', d.resumen.total ?? 0, `${d.resumen.resueltas ?? 0} resueltas · ${d.resumen.abiertas ?? 0} abiertas`],
                            ['Hasta asignar', duracion(d.resumen.min_hasta_asignar), 'promedio desde el reporte'],
                            ['Hasta resolver', duracion(d.resumen.min_hasta_resolver), 'promedio desde el reporte'],
                            ['MTTR', duracion(d.resumen.mttr), 'inicio → resuelto']
                        ].map(([t, v, s]) => (
                            <section key={t} className="beta-card !p-4 border-t-4 border-t-hotel-accent">
                                <p className="text-xs text-hotel-textMuted">{t}</p>
                                <strong className="font-serif text-2xl xl:text-3xl text-hotel-dark block whitespace-nowrap">{v}</strong>
                                <p className="text-[11px] text-hotel-textMuted">{s}</p>
                            </section>
                        ))}
                    </div>

                    {d.stockBajo.length > 0 && (
                        <div className="rounded-xl border border-[#F0B7B1] bg-[#FFF4F2] p-3 text-sm flex gap-2 items-start" role="status">
                            <AlertTriangle size={18} className="text-red-700 shrink-0" />
                            <span>
                                <strong>Stock bajo:</strong> {d.stockBajo.map((m: any) => `${m.nombre} (${cantidad(m.stock)} ${m.unidad})`).join(', ')}
                            </span>
                        </div>
                    )}

                    <Panel titulo="Solicitudes reportadas por día">
                        <Tendencia dias={d.porDia.length ? completarDias(d.porDia, Number(dias)) : []} />
                    </Panel>

                    <div className="grid lg:grid-cols-2 gap-5">
                        <Panel titulo="Por especialidad">
                            <Barras
                                filas={d.porEspecialidad.map((e: any) => ({
                                    etiqueta: e.nombre,
                                    valor: Number(e.cantidad),
                                    detalle: e.mttr !== null ? `MTTR ${duracion(e.mttr)}` : undefined
                                }))}
                            />
                        </Panel>
                        <Panel titulo="Habitaciones más reportadas">
                            <Barras filas={d.habitaciones.map((h: any) => ({ etiqueta: `Hab ${h.numero} · Bloque ${h.bloque}`, valor: Number(h.cantidad) }))} />
                        </Panel>
                        <Panel titulo="Carga por técnico">
                            <Barras
                                filas={d.tecnicos.map((t: any) => ({
                                    etiqueta: `${t.nombre}${t.turno ? ' · ' + t.turno : ''}`,
                                    valor: Number(t.resueltas),
                                    detalle: `${t.activas} activas${t.mttr !== null ? ' · MTTR ' + duracion(t.mttr) : ''}`
                                }))}
                                formato={n => `${n} resueltas`}
                            />
                        </Panel>
                        <Panel titulo="Solicitudes por turno de reporte">
                            <Barras
                                filas={['Mañana', 'Tarde', 'Noche'].map(t => ({
                                    etiqueta: t,
                                    valor: Number(d.porTurno.find((x: any) => x.turno === t)?.cantidad || 0)
                                }))}
                            />
                        </Panel>
                        <Panel titulo="Materiales más usados" className="lg:col-span-2">
                            <Barras
                                filas={d.materiales.map((m: any) => ({
                                    etiqueta: m.nombre,
                                    valor: Number(m.cantidad),
                                    detalle: m.stock !== null ? `stock ${cantidad(m.stock)}` : undefined
                                }))}
                                formato={n => cantidad(n)}
                            />
                        </Panel>
                    </div>
                </>
            )}
        </Pagina>
    );
}
