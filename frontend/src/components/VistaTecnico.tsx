import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle, Clock, AlertTriangle, Package, Sparkles, Send, Check } from 'lucide-react';

export const VistaTecnico: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [catalogoMateriales, setCatalogoMateriales] = useState<any[]>([]);
  const [catalogoTipos, setCatalogoTipos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Solicitud en proceso de atención
  const [solicitudActiva, setSolicitudActiva] = useState<any | null>(null);
  const [idTipoIncidente, setIdTipoIncidente] = useState<number>(5);
  const [prioridad, setPrioridad] = useState<number>(1);
  const [observacionTecnico, setObservacionTecnico] = useState('');
  const [materialSeleccionado, setMaterialSeleccionado] = useState<number>(1);
  const [cantidadMaterial, setCantidadMaterial] = useState<number>(1);
  const [materialesAgregados, setMaterialesAgregados] = useState<{ id_material: number; nombre: string; cantidad: number }[]>([]);

  const [procesando, setProcesando] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarDatos = () => {
    setCargando(true);
    fetch('/api/tecnico/solicitudes')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setSolicitudes(data.solicitudes || []);
          setCatalogoMateriales(data.catalogo_materiales || []);
          setCatalogoTipos(data.catalogo_tipos_incidente || []);
          if (data.catalogo_tipos_incidente?.length > 0) {
            setIdTipoIncidente(data.catalogo_tipos_incidente[0].id_tipo_incidente);
          }
          if (data.catalogo_materiales?.length > 0) {
            setMaterialSeleccionado(data.catalogo_materiales[0].id_material);
          }
        }
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAgregarMaterial = () => {
    const mat = catalogoMateriales.find(m => m.id_material === Number(materialSeleccionado));
    if (!mat) return;

    setMaterialesAgregados(prev => [
      ...prev.filter(m => m.id_material !== mat.id_material),
      { id_material: mat.id_material, nombre: mat.nombre_mat, cantidad: Number(cantidadMaterial) }
    ]);
  };

  const handleRemoverMaterial = (id: number) => {
    setMaterialesAgregados(prev => prev.filter(m => m.id_material !== id));
  };

  // Generar Asignación / Reporte de Incidente
  const handleGuardarReporteIncidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitudActiva) return;

    setProcesando(true);
    try {
      const res = await fetch('/api/tecnico/atender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_solicitud: solicitudActiva.id_solicitud,
          id_empleado_tecnico: 2, // Jorge Paredes
          id_tipo_incidente: idTipoIncidente,
          nivel_prioridad: prioridad,
          observaciones_tecnico: observacionTecnico || 'Atendido por técnico de turno',
          materiales: materialesAgregados
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        setNotificacion(`¡Reporte e Incidente técnico creado para Habitación ${solicitudActiva.numero_habitacion}! 🔧`);
        setSolicitudActiva(null);
        setObservacionTecnico('');
        setMaterialesAgregados([]);
        cargarDatos();
        setTimeout(() => setNotificacion(null), 4000);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcesando(false);
    }
  };

  // Finalizar tarea y marcar habitación operativa
  const handleFinalizar = async (sol: any) => {
    if (!window.confirm(`¿Confirmas que la avería en la Habitación ${sol.numero_habitacion} fue resuelta y ya está operativa?`)) return;

    try {
      const res = await fetch('/api/tecnico/finalizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_asignacion: sol.id_asignacion,
          id_incidente: sol.id_incidente,
          id_habitacion: sol.id_habitacion
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificacion(`Habitación ${sol.numero_habitacion} marcada como Operativa y liberada con éxito ✅`);
        cargarDatos();
        setTimeout(() => setNotificacion(null), 4000);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner de Identificación del Rol */}
      <div className="bg-[#0B2521] text-white p-5 rounded-2xl shadow-md border border-[#143B35]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold text-lg flex items-center justify-center">
              JP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base">Jorge Paredes</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3B82F6] text-white">Técnico</span>
              </div>
              <p className="text-xs text-[#8BA4A0]">Mantenimiento · Especialidad A/C y Climatización</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-[#123832] border border-[#1F4A42] text-[#C2A661] rounded-lg font-mono">
            Jerarquía: Recibe Solicitudes, Crea Reportes y Materiales
          </span>
        </div>
      </div>

      {notificacion && (
        <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl text-xs text-[#15803D] font-bold flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-[#15803D]" />
          <span>{notificacion}</span>
        </div>
      )}

      {/* MODAL / FORMULARIO FLUIDO DE ATENCIÓN DE INCIDENTE */}
      {solicitudActiva && (
        <div className="bg-white p-6 rounded-2xl border-2 border-[#0E332E] shadow-xl space-y-5 animate-fadeIn">
          <div className="flex items-start justify-between pb-3 border-b border-[#E6E3DB]">
            <div>
              <span className="text-[11px] font-bold text-[#7E8D8A] uppercase">Generar Reporte de Incidente</span>
              <h3 className="font-serif text-2xl font-bold text-[#0E332E]">
                Atendiendo Habitación {solicitudActiva.numero_habitacion} (Bloque {solicitudActiva.bloque})
              </h3>
              <p className="text-xs text-[#556965] mt-1">
                Reportado por: <strong>{solicitudActiva.mucama_nombre} {solicitudActiva.mucama_apellido}</strong> — "{solicitudActiva.problema}"
              </p>
            </div>
            <button
              onClick={() => setSolicitudActiva(null)}
              className="px-3 py-1 bg-[#F2EFE8] text-xs font-semibold rounded-lg hover:bg-[#E4DFD3]"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleGuardarReporteIncidente} className="space-y-4">
            {/* 1. Atributos del Incidente */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C2826]">Tipo de Avería Detectada:</label>
                <select
                  value={idTipoIncidente}
                  onChange={e => setIdTipoIncidente(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F8F7F4] border border-[#DDD9CE] rounded-xl text-xs font-semibold text-[#1C2826] focus:border-[#0E332E]"
                >
                  {catalogoTipos.map((t: any) => (
                    <option key={t.id_tipo_incidente} value={t.id_tipo_incidente}>
                      {t.nombre_especialidad} — {t.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C2826]">Nivel de Prioridad:</label>
                <select
                  value={prioridad}
                  onChange={e => setPrioridad(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F8F7F4] border border-[#DDD9CE] rounded-xl text-xs font-semibold text-[#1C2826] focus:border-[#0E332E]"
                >
                  <option value={1}>Alta (Emergencia · Bloquea Check-in)</option>
                  <option value={2}>Media (Atender durante el día)</option>
                  <option value={3}>Baja (Detalle estético / fin de turno)</option>
                </select>
              </div>
            </div>

            {/* 2. Observaciones Técnicas */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C2826]">Diagnóstico / Observaciones Técnicas:</label>
              <textarea
                rows={2}
                value={observacionTecnico}
                onChange={e => setObservacionTecnico(e.target.value)}
                placeholder="Indica qué trabajo técnico realizarás (ej: cambio de empaque de lavabo, limpieza de filtro A/C)..."
                className="w-full p-3 text-xs bg-[#F8F7F4] border border-[#DDD9CE] rounded-xl text-[#1C2826] focus:border-[#0E332E]"
              />
            </div>

            {/* 3. Selección y Registro de Materiales */}
            <div className="p-4 bg-[#F8F7F4] border border-[#DDD9CE] rounded-xl space-y-3">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-[#0E332E]" />
                <span className="text-xs font-bold text-[#0E332E]">Materiales y Repuestos Utilizados</span>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={materialSeleccionado}
                  onChange={e => setMaterialSeleccionado(Number(e.target.value))}
                  className="flex-1 p-2 bg-white border border-[#DDD9CE] rounded-lg text-xs"
                >
                  {catalogoMateriales.map((m: any) => (
                    <option key={m.id_material} value={m.id_material}>
                      {m.nombre_mat}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max="50"
                  value={cantidadMaterial}
                  onChange={e => setCantidadMaterial(Number(e.target.value))}
                  className="w-20 p-2 bg-white border border-[#DDD9CE] rounded-lg text-xs font-bold text-center"
                />

                <button
                  type="button"
                  onClick={handleAgregarMaterial}
                  className="px-3 py-2 bg-[#0E332E] text-white text-xs font-bold rounded-lg hover:bg-[#072420]"
                >
                  + Agregar
                </button>
              </div>

              {materialesAgregados.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {materialesAgregados.map(m => (
                    <span
                      key={m.id_material}
                      className="px-2.5 py-1 bg-white border border-[#C2A661] text-[#0E332E] text-xs font-semibold rounded-lg flex items-center space-x-1.5"
                    >
                      <span>{m.nombre} (x{m.cantidad})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverMaterial(m.id_material)}
                        className="text-[#EF4444] font-bold ml-1 hover:text-[#991B1B]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Botón de Enviar Reporte */}
            <button
              type="submit"
              disabled={procesando}
              className="w-full py-3.5 bg-[#0E332E] hover:bg-[#072420] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md"
            >
              <Wrench className="w-4 h-4 text-[#C2A661]" />
              <span>{procesando ? 'Guardando...' : 'Crear Asignación e Incidente Técnico'}</span>
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE SOLICITUDES DE MUCAMAS PARA ATENCIÓN */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#102C26]">Solicitudes Recibidas de las Mucamas</h3>
            <p className="text-xs text-[#7E8D8A]">Revisa los reportes, genera las asignaciones y documenta los materiales.</p>
          </div>
          <button
            onClick={cargarDatos}
            className="text-xs px-3 py-1.5 bg-[#F8F7F4] border border-[#DDD9CE] rounded-lg font-semibold text-[#4A5C58] hover:bg-white"
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="text-xs text-[#7E8D8A] py-6 text-center">Cargando solicitudes...</p>
        ) : solicitudes.length === 0 ? (
          <p className="text-xs text-[#7E8D8A] py-6 text-center">No hay solicitudes pendientes en este momento.</p>
        ) : (
          <div className="space-y-3">
            {solicitudes.map(sol => {
              const tieneIncidente = !!sol.id_incidente;
              const resuelto = sol.incidente_resuelto === 1;

              return (
                <div
                  key={sol.id_solicitud}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between ${
                    resuelto
                      ? 'bg-[#F0FDF4] border-[#86EFAC]'
                      : tieneIncidente
                      ? 'bg-[#FFFBEB] border-[#FDE68A]'
                      : 'bg-white border-[#E6E3DB] shadow-sm'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-[#0B2521] text-white font-serif font-bold text-sm rounded">
                        Hab {sol.numero_habitacion}
                      </span>
                      <span className="text-xs font-semibold text-[#0E332E]">
                        Bloque {sol.bloque} · Piso {sol.piso} ({sol.tipo_hab})
                      </span>
                    </div>

                    <p className="text-xs text-[#1C2826] font-medium leading-relaxed">
                      "{sol.problema}"
                    </p>

                    <p className="text-[11px] text-[#7E8D8A]">
                      Reportado por <strong>{sol.mucama_nombre} {sol.mucama_apellido}</strong> el {sol.fecha?.split('T')[0]} a las {sol.hora_inicial}
                    </p>
                  </div>

                  {/* Acciones del Técnico */}
                  <div className="flex flex-col space-y-2 shrink-0 items-end">
                    {resuelto ? (
                      <span className="px-3 py-1 bg-[#10B981] text-white rounded-lg text-xs font-bold flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Resuelto</span>
                      </span>
                    ) : tieneIncidente ? (
                      <div className="flex flex-col space-y-2 items-end">
                        <span className="px-2.5 py-0.5 bg-[#F59E0B] text-white rounded text-[10px] font-bold">
                          En Reparación
                        </span>
                        <button
                          onClick={() => handleFinalizar(sol)}
                          className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Finalizar y Liberar Hab.</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSolicitudActiva(sol);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-2 bg-[#0E332E] hover:bg-[#072420] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5 text-[#C2A661]" />
                        <span>Atender Solicitud</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
