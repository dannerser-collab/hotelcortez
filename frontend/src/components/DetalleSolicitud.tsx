// Bloques de detalle compartidos por técnico y supervisor.
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EVENTO, OCUPACION, TURNO } from '../lib/dominio';
import { cantidad, fechaHora } from '../lib/formato';
import type { DetalleSolicitud, Reporte } from '../types';
import { Foto } from './Foto';
import { Dato, InsigniaEstado, InsigniaPrioridad, Panel } from './ui';

export function Volver({ a }: { a: string }) {
    const navegar = useNavigate();
    return (
        <button onClick={() => (history.length > 1 ? navegar(-1) : navegar(a))} className="beta-secondary">
            <ArrowLeft size={14} /> Volver
        </button>
    );
}

export function DatosSolicitud({ s, conMucama = false }: { s: DetalleSolicitud; conMucama?: boolean }) {
    return (
        <Panel
            titulo="Datos de la solicitud"
            acciones={
                <div className="flex gap-2">
                    <InsigniaPrioridad nivel={s.nivel_prioridad} />
                    <InsigniaEstado estado={s.estado} />
                </div>
            }
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {conMucama && (
                    <Dato etiqueta="Mucama">
                        {s.mucama}
                        {s.turno_mucama ? ` · ${TURNO[s.turno_mucama]}` : ''}
                    </Dato>
                )}
                <Dato etiqueta="Habitación">{s.numero}</Dato>
                <Dato etiqueta="Bloque / Piso">
                    {s.bloque} / {s.piso}
                </Dato>
                <Dato etiqueta="Tipo">{s.tipo_habitacion || '—'}</Dato>
                <Dato etiqueta="Estado de la hab.">{OCUPACION[s.ocupacion]}</Dato>
                <Dato etiqueta="Fecha y hora">{fechaHora(s.creada_en)}</Dato>
                {s.dificultad && <Dato etiqueta="Dificultad">{s.dificultad}</Dato>}
                {s.especialidad && <Dato etiqueta="Especialidad">{s.especialidad}</Dato>}
                {s.tecnico && <Dato etiqueta="Técnico">{s.tecnico}</Dato>}
            </div>
            <p className="rounded-xl bg-[#FAF8F4] border border-[#E2DCCE] p-3 text-sm whitespace-pre-wrap">{s.problema}</p>
            {s.diagnostico && <p className="text-xs text-hotel-textMuted whitespace-pre-wrap">Diagnóstico inicial: {s.diagnostico}</p>}
            {s.foto && <Foto archivo={s.foto} alt={'Foto de la solicitud ' + s.codigo} />}
        </Panel>
    );
}

export function ListaReportes({ reportes, acciones }: { reportes: Reporte[]; acciones?: (r: Reporte) => React.ReactNode }) {
    if (!reportes.length) return null;
    return (
        <Panel titulo={`Reportes (${reportes.length})`}>
            <ol className="space-y-3">
                {reportes.map(r => (
                    <li
                        key={r.id_reporte}
                        className={
                            'rounded-xl border p-3 space-y-1.5 ' + (r.resultado === 'HECHO' ? 'bg-[#F4FBF6] border-[#A9D9B9]' : 'bg-[#FFFBEA] border-[#EBD27A]')
                        }
                    >
                        <div className="flex flex-wrap justify-between gap-2 text-xs">
                            <strong className={r.resultado === 'HECHO' ? 'text-emerald-800' : 'text-amber-900'}>
                                {r.resultado === 'HECHO' ? 'Hecho' : 'Pendiente'}
                            </strong>
                            <span className="text-hotel-textMuted">
                                {r.autor} · {fechaHora(r.creado_en)}
                                {r.actualizado_en && ' · editado por supervisor'}
                            </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{r.observacion}</p>
                        {r.motivo_pendiente && <p className="text-sm text-amber-900">Motivo: {r.motivo_pendiente}</p>}
                        <p className="text-xs text-hotel-textMuted">
                            Materiales: {r.materiales.length ? r.materiales.map(m => `${m.nombre_mat} ×${cantidad(m.cantidad)}`).join(', ') : 'ninguno'}
                        </p>
                        {acciones?.(r)}
                    </li>
                ))}
            </ol>
        </Panel>
    );
}

export function Historial({ eventos }: { eventos: DetalleSolicitud['eventos'] }) {
    return (
        <Panel titulo="Historial">
            <ol className="relative border-l-2 border-[#E2DCCE] ml-2 space-y-3">
                {eventos.map((e, i) => (
                    <li key={i} className="pl-4 relative">
                        <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-hotel-accent border-2 border-white" />
                        <p className="text-sm font-semibold text-hotel-dark">{EVENTO[e.tipo] || e.tipo}</p>
                        <p className="text-xs text-hotel-textMuted">
                            {fechaHora(e.creado_en)}
                            {e.empleado && ` · ${e.empleado}`}
                        </p>
                        {e.detalle && !e.detalle.startsWith('Técnico #') && <p className="text-xs text-hotel-dark mt-0.5">{e.detalle}</p>}
                    </li>
                ))}
            </ol>
        </Panel>
    );
}
