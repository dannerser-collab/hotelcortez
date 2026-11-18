import React, { useState, useEffect } from 'react';
import { Building2, ClipboardList, Wrench, Package, Clock, CheckCircle2, AlertTriangle, Users, Search, RefreshCw } from 'lucide-react';

export const VistaSupervisor: React.FC = () => {
  const [tab, setTab] = useState<'rack' | 'incidentes' | 'solicitudes' | 'asignaciones'>('rack');
  const [data, setData] = useState<any>({
    kpis: { total: 0, operativas: 0, mantenimiento: 0, porcentaje_ocupacion: 78 },
    habitaciones: [],
    incidentes: [],
    solicitudes: [],
    asignaciones: []
  });
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarDashboard = () => {
    setCargando(true);
    fetch('/api/supervisor/dashboard')
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success') {
          setData(resData);
        }
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner de Identificación del Rol */}
      <div className="bg-[#0B2521] text-white p-5 rounded-2xl shadow-md border border-[#143B35]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold text-lg flex items-center justify-center">
              RP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base">Ing. Roberto Paz</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C2A661] text-[#0B2521]">Supervisor</span>
              </div>
              <p className="text-xs text-[#8BA4A0]">Supervisión General · Control de Operaciones</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-[#123832] border border-[#1F4A42] text-[#C2A661] rounded-lg font-mono">
            Jerarquía: Acceso Total a Incidentes, Solicitudes y Asignaciones
          </span>
        </div>
      </div>

      {/* Tarjetas Superiores de KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-[#E6E3DB] shadow-sm">
          <p className="text-[11px] font-bold text-[#7E8D8A] uppercase">Total Habitaciones</p>
          <p className="text-2xl font-serif font-bold text-[#102C26] mt-1">{data.kpis?.total || 14}</p>
          <span className="text-[10px] text-[#7E8D8A]">Hotel Cortéz</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E6E3DB] shadow-sm">
          <p className="text-[11px] font-bold text-[#10B981] uppercase">Operativas / Disponibles</p>
          <p className="text-2xl font-serif font-bold text-[#10B981] mt-1">{data.kpis?.operativas || 0}</p>
          <span className="text-[10px] text-[#10B981] font-semibold">Listas para huésped</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E6E3DB] shadow-sm">
          <p className="text-[11px] font-bold text-[#EF4444] uppercase">En Mantenimiento</p>
          <p className="text-2xl font-serif font-bold text-[#EF4444] mt-1">{data.kpis?.mantenimiento || 0}</p>
          <span className="text-[10px] text-[#EF4444] font-semibold">Bloqueadas para venta</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E6E3DB] shadow-sm">
          <p className="text-[11px] font-bold text-[#C2A661] uppercase">Ocupación Estimada</p>
          <p className="text-2xl font-serif font-bold text-[#C2A661] mt-1">{data.kpis?.porcentaje_ocupacion || 78}%</p>
          <span className="text-[10px] text-[#7E8D8A]">Control de Check-ins</span>
        </div>
      </div>

      {/* Selector de Pestañas de la Jerarquía */}
      <div className="flex items-center justify-between border-b border-[#DDD9CE] pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setTab('rack')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'rack' ? 'bg-[#0E332E] text-white shadow-sm' : 'bg-white text-[#4A5C58] border border-[#E6E3DB]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Rack de Habitaciones</span>
          </button>

          <button
            onClick={() => setTab('incidentes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'incidentes' ? 'bg-[#0E332E] text-white shadow-sm' : 'bg-white text-[#4A5C58] border border-[#E6E3DB]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Resumen de Incidentes ({data.incidentes?.length || 0})</span>
          </button>

          <button
            onClick={() => setTab('solicitudes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'solicitudes' ? 'bg-[#0E332E] text-white shadow-sm' : 'bg-white text-[#4A5C58] border border-[#E6E3DB]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Solicitudes de Mucamas ({data.solicitudes?.length || 0})</span>
          </button>

          <button
            onClick={() => setTab('asignaciones')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'asignaciones' ? 'bg-[#0E332E] text-white shadow-sm' : 'bg-white text-[#4A5C58] border border-[#E6E3DB]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Asignaciones de Técnicos ({data.asignaciones?.length || 0})</span>
          </button>
        </div>

        <button
          onClick={cargarDashboard}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#DDD9CE] rounded-lg text-[#4A5C58] hover:bg-[#F8F7F4]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 1. PESTAÑA: RACK DE HABITACIONES */}
      {tab === 'rack' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#102C26]">Monitor de Habitaciones por Bloque y Piso</h3>
            <span className="text-xs text-[#7E8D8A]">Haz clic en cualquier habitación para ver el detalle de avería</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {data.habitaciones?.map((hab: any) => {
              const esOperativa = hab.estado === 1 || hab.estado === true;
              return (
                <div
                  key={hab.id_habitacion}
                  className={`p-4 rounded-xl border transition-all ${
                    esOperativa
                      ? 'bg-white border-[#E6E3DB] hover:border-[#10B981]'
                      : 'bg-[#0B2521] text-white border-2 border-[#C2A661] shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`font-serif text-2xl font-bold ${esOperativa ? 'text-[#1C2826]' : 'text-white'}`}>
                        {hab.numero}
                      </span>
                      <p className={`text-[11px] ${esOperativa ? 'text-[#7E8D8A]' : 'text-[#8BA4A0]'}`}>
                        Bloque {hab.bloque} · Piso {hab.piso}
                      </p>
                    </div>

                    {esOperativa ? (
                      <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                    ) : (
                      <span className="px-2 py-0.5 bg-[#EF4444] text-white text-[10px] font-bold rounded">
                        Mantenimiento
                      </span>
                    )}
                  </div>

                  {!esOperativa && hab.problema && (
                    <div className="mt-2.5 pt-2 border-t border-[#163D36] text-[11px] text-[#A0BCB8]">
                      <p className="line-clamp-2">"{hab.problema}"</p>
                      {hab.tecnico_nombre && (
                        <p className="text-[10px] text-[#C2A661] mt-1 font-semibold">Técnico: {hab.tecnico_nombre}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PESTAÑA: RESUMEN DE INCIDENTES (Control Supervisor) */}
      {tab === 'incidentes' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#102C26]">Resumen General de Incidentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F7F4] text-[#7E8D8A] uppercase text-[10px] border-b border-[#E6E3DB]">
                <tr>
                  <th className="p-3"># Ticket</th>
                  <th className="p-3">Habitación</th>
                  <th className="p-3">Especialidad</th>
                  <th className="p-3">Mucama (Solicitante)</th>
                  <th className="p-3">Técnico Asignado</th>
                  <th className="p-3">Prioridad</th>
                  <th className="p-3">Materiales Usados</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E3DB]">
                {data.incidentes?.map((inc: any) => (
                  <tr key={inc.id_incidente} className="hover:bg-[#F8F7F4]/50">
                    <td className="p-3 font-mono font-bold text-[#0E332E]">#TK-{inc.id_incidente}</td>
                    <td className="p-3 font-bold">Hab {inc.habitacion} (Bloque {inc.bloque})</td>
                    <td className="p-3">{inc.nombre_especialidad}</td>
                    <td className="p-3">{inc.mucama_nombre}</td>
                    <td className="p-3 font-semibold text-[#0E332E]">{inc.tecnico_nombre || 'Sin asignar'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.nivel_prioridad === 1 ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#B45309]'
                      }`}>
                        {inc.nivel_prioridad === 1 ? 'Alta / Bloquea' : 'Media'}
                      </span>
                    </td>
                    <td className="p-3 text-[#4A5C58]">{inc.materiales_utilizados || 'Ninguno'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inc.resuelto === 1 ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]'
                      }`}>
                        {inc.resuelto === 1 ? 'Resuelto' : 'En Proceso'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PESTAÑA: SOLICITUDES DE MUCAMAS */}
      {tab === 'solicitudes' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#102C26]">Registro de Solicitudes Emitidas por Mucamas</h3>
          <div className="space-y-3">
            {data.solicitudes?.map((s: any) => (
              <div key={s.id_solicitud} className="p-4 bg-[#F8F7F4] border border-[#E6E3DB] rounded-xl flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-[#0E332E] text-white rounded font-bold text-xs">
                      Hab {s.habitacion}
                    </span>
                    <span className="text-xs font-semibold text-[#0E332E]">Bloque {s.bloque}</span>
                    <span className="text-xs text-[#7E8D8A]">Reportado por <strong>{s.reportado_por}</strong></span>
                  </div>
                  <p className="text-xs text-[#1C2826] mt-2 font-medium">"{s.problema}"</p>
                </div>
                <div className="text-right text-[11px] text-[#7E8D8A]">
                  <p>{s.fecha?.split('T')[0]}</p>
                  <p>{s.hora_inicial}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PESTAÑA: ASIGNACIONES DE TÉCNICOS */}
      {tab === 'asignaciones' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#102C26]">Registro de Asignaciones y Horas de Técnicos</h3>
          <div className="space-y-3">
            {data.asignaciones?.map((a: any) => (
              <div key={a.id_asignacion} className="p-4 bg-[#F8F7F4] border border-[#E6E3DB] rounded-xl flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-[#123832] text-[#C2A661] rounded font-bold text-xs">
                      Asignación #{a.id_asignacion}
                    </span>
                    <span className="text-xs font-bold text-[#1C2826]">Técnico: {a.tecnico_nombre} {a.tecnico_apellido}</span>
                  </div>
                  <p className="text-xs text-[#4A5C58] mt-2">{a.observaciones}</p>
                </div>
                <div className="text-right text-[11px] text-[#7E8D8A]">
                  <p>Asignado: {a.fecha_asignacion?.split('T')[0]} ({a.hora_asignacion})</p>
                  <p className="font-semibold text-[#10B981]">{a.fecha_fin ? `Fin: ${a.fecha_fin?.split('T')[0]} ${a.hora_fin}` : 'En ejecución'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

