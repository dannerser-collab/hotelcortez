import React, { useState, useEffect } from 'react';
import { Bed, Send, Clock, CheckCircle2, AlertCircle, Camera, Check, Building2, Sparkles } from 'lucide-react';

export const VistaMucama: React.FC = () => {
  const [numeroHab, setNumeroHab] = useState('354');
  const [problema, setProblema] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [solicitudesRecientes, setSolicitudesRecientes] = useState<any[]>([]);

  // Deducción automática del bloque y piso según el número de habitación (Ej: 354 -> Bloque 300, Piso 3)
  const numLimpio = numeroHab.replace(/\D/g, '');
  const primerDigito = numLimpio.charAt(0) ? parseInt(numLimpio.charAt(0), 10) : 1;
  const bloqueCalculado = primerDigito * 100;
  const pisoCalculado = primerDigito;

  const cargarSolicitudes = () => {
    fetch('/api/tecnico/solicitudes')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          // Filtrar las reportadas por María Fernanda (id_empleado = 1)
          setSolicitudesRecientes(data.solicitudes || []);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroHab || !problema.trim()) return;

    setEnviando(true);
    setMensajeExito(null);

    try {
      const res = await fetch('/api/mucama/reportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_habitacion: numeroHab,
          problema: problema.trim(),
          id_empleado: 1 // María Fernanda
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        setMensajeExito(`¡Solicitud enviada a Mantenimiento! Habitación ${numeroHab} asignada a Bloque ${bloqueCalculado} (Piso ${pisoCalculado}).`);
        setProblema('');
        cargarSolicitudes();
      } else {
        alert(data.mensaje || 'Error al reportar');
      }
    } catch (err: any) {
      alert('Error de conexión con el servidor: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Banner de Identificación del Rol */}
      <div className="bg-[#0B2521] text-white p-5 rounded-2xl shadow-md border border-[#143B35]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold text-lg flex items-center justify-center">
              MF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base">María Fernanda López</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981] text-white">Mucama</span>
              </div>
              <p className="text-xs text-[#8BA4A0]">Gobernanza · Turno Mañana</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-[#123832] border border-[#1F4A42] text-[#C2A661] rounded-lg font-mono">
            Jerarquía: Genera Solicitudes
          </span>
        </div>
      </div>

      {/* Formulario Principal de Reporte */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-5">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#102C26]">Registrar Solicitud de Habitación</h2>
          <p className="text-xs text-[#6F7F7C] mt-1">
            Solo indica la habitación y el problema detectado. El sistema asignará el bloque y piso de forma automática.
          </p>
        </div>

        <form onSubmit={handleEnviarSolicitud} className="space-y-4">
          {/* Campo de Número de Habitación */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1C2826] flex items-center justify-between">
              <span>Número de Habitación:</span>
              <span className="text-[11px] text-[#7E8D8A] font-normal">Ejemplos: 354, 437, 102</span>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={numeroHab}
                onChange={e => setNumeroHab(e.target.value)}
                placeholder="Ej: 354"
                className="w-36 px-4 py-2.5 text-lg font-mono font-bold bg-[#F8F7F4] border border-[#DDD9CE] rounded-xl text-[#0E332E] focus:outline-none focus:border-[#0E332E]"
                required
              />

              {/* Detección automática en vivo del Bloque */}
              {numeroHab && (
                <div className="flex-1 p-2.5 bg-[#F1F6F5] border border-[#D0E2DE] rounded-xl flex items-center space-x-3 text-xs text-[#0E332E]">
                  <Building2 className="w-5 h-5 text-[#C2A661] shrink-0" />
                  <div>
                    <p className="font-bold">Detección Automática:</p>
                    <p className="text-[11px] text-[#4A5C58]">
                      Bloque <strong className="text-[#0E332E]">{bloqueCalculado}</strong> · Piso <strong className="text-[#0E332E]">{pisoCalculado}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Accesos rápidos de habitaciones */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-[11px] text-[#7E8D8A]">Accesos rápidos:</span>
              {['354', '437', '102', '204'].map(habNum => (
                <button
                  key={habNum}
                  type="button"
                  onClick={() => setNumeroHab(habNum)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    numeroHab === habNum ? 'bg-[#0E332E] text-white border-[#0E332E]' : 'bg-white text-[#556965] border-[#E6E3DB] hover:bg-[#F2EFE8]'
                  }`}
                >
                  Hab {habNum}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Descripción del Problema */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1C2826]">Problema / Falla Observada:</label>
            <textarea
              rows={3}
              value={problema}
              onChange={e => setProblema(e.target.value)}
              placeholder="Describe detalladamente qué falla presenta la habitación (ej: fuga de agua en inodoro, aire no enfría, cerradura trabada)..."
              className="w-full p-3.5 text-xs bg-[#F8F7F4] border border-[#DDD9CE] rounded-xl text-[#1C2826] focus:outline-none focus:border-[#0E332E] resize-none"
              required
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              className="px-4 py-3 bg-[#F8F7F4] border border-[#DDD9CE] hover:bg-[#EFECE6] text-[#4A5C58] rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
            >
              <Camera className="w-4 h-4 text-[#0E332E]" />
              <span>Adjuntar Foto</span>
            </button>

            <button
              type="submit"
              disabled={enviando || !problema.trim()}
              className="flex-1 py-3.5 bg-[#0E332E] hover:bg-[#072420] disabled:bg-[#7E8D8A] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md"
            >
              <Send className="w-4 h-4 text-[#C2A661]" />
              <span>{enviando ? 'Enviando...' : 'Enviar Solicitud a Mantenimiento'}</span>
            </button>
          </div>
        </form>

        {mensajeExito && (
          <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl text-xs text-[#15803D] font-semibold flex items-center space-x-2 animate-fadeIn">
            <Check className="w-4 h-4 shrink-0 text-[#15803D]" />
            <span>{mensajeExito}</span>
          </div>
        )}
      </div>

      {/* Historial de Solicitudes Recientes */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E3DB] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-[#102C26]">Solicitudes Realizadas por Gobernanza</h3>
          <span className="text-xs text-[#7E8D8A]">{solicitudesRecientes.length} registradas</span>
        </div>

        <div className="space-y-2.5">
          {solicitudesRecientes.slice(0, 5).map((sol: any) => (
            <div key={sol.id_solicitud} className="p-3.5 bg-[#F8F7F4] border border-[#E6E3DB] rounded-xl flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-[#0E332E] text-white rounded text-[11px] font-bold">
                    Hab {sol.numero_habitacion}
                  </span>
                  <span className="text-xs text-[#7E8D8A]">Bloque {sol.bloque} · Piso {sol.piso}</span>
                </div>
                <p className="text-xs text-[#1C2826] font-medium leading-relaxed">{sol.problema}</p>
                <p className="text-[10px] text-[#7E8D8A] flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{sol.fecha?.split('T')[0]} a las {sol.hora_inicial}</span>
                </p>
              </div>

              <div>
                {sol.id_incidente ? (
                  <span className="px-2 py-1 bg-[#FEF3C7] text-[#B45309] rounded-lg text-[10px] font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>En Técnico</span>
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-[#F1F6F5] text-[#0E332E] border border-[#D0E2DE] rounded-lg text-[10px] font-bold flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Esperando Técnico</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
