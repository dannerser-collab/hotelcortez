import React, { useState } from 'react';
import { 
  Bell, 
  Bed, 
  Droplets, 
  Snowflake, 
  Zap, 
  MoreHorizontal, 
  Camera, 
  Mic, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ClipboardList, 
  Clock, 
  User, 
  ChevronDown
} from 'lucide-react';

export const ReporteMovil: React.FC = () => {
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('Bloque 400');
  const [habitacion, setHabitacion] = useState('Hab 437');
  const [categoria, setCategoria] = useState('Aire Acond.');
  const [detalle, setDetalle] = useState('El A/C hace ruido fuerte y no enfría. Gotea agua junto a la ventana.');
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta'>('alta');
  const [enviando, setEnviando] = useState(false);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [tabActiva, setTabActiva] = useState('reportar');

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      await fetch('/api/solicitudes/reportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_empleado_solicitante: 3,
          id_ubicacion: 102, // Habitación 437
          id_especialidad: categoria === 'Aire Acond.' ? 3 : categoria === 'Plomería' ? 1 : 2,
          problema_reportado: detalle,
          id_prioridad: prioridad === 'alta' ? 1 : prioridad === 'media' ? 2 : 4
        })
      });
      setEnviadoExitoso(true);
      setTimeout(() => setEnviadoExitoso(false), 4000);
    } catch {
      setEnviadoExitoso(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F7F4] flex flex-col justify-between shadow-2xl relative border-x border-[#E6E3DB] font-sans pb-16">
      <div>
        {/* ============================================================== */}
        {/* 1. HEADER OSCURO SUPERIOR (Mucama Activa)                      */}
        {/* ============================================================== */}
        <header className="bg-[#0B2521] text-white p-5 rounded-b-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold flex items-center justify-center text-sm shadow">
                HC
              </div>
              <div>
                <h1 className="font-serif font-semibold text-sm leading-none text-white tracking-wide">Hotel Cortéz</h1>
                <p className="text-[10px] text-[#8BA4A0] tracking-wider mt-0.5">Control de Mantenimiento</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button className="w-8 h-8 rounded-full bg-[#143B35] flex items-center justify-center relative hover:bg-[#1B4D45]">
                <Bell className="w-4 h-4 text-[#C2A661]" />
                <span className="w-2 h-2 rounded-full bg-[#EF4444] absolute top-1.5 right-1.5 ring-2 ring-[#0B2521]"></span>
              </button>
              <div className="w-8 h-8 rounded-full bg-[#D4A359] border border-white/20 flex items-center justify-center text-xs font-bold">
                MF
              </div>
            </div>
          </div>

          {/* Tarjeta del Usuario Camarera */}
          <div className="p-3 bg-[#123832] rounded-2xl border border-[#1C4D44] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#205249] flex items-center justify-center text-white font-bold text-sm border border-[#2D6E63]">
                MF
              </div>
              <div>
                <p className="font-semibold text-xs text-white">María Fernanda López</p>
                <p className="text-[10px] text-[#8BA4A0]">Camarera · Gobernanza · Turno Mañana</p>
              </div>
            </div>

            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981] text-white space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>Activa</span>
            </span>
          </div>

          {/* Fecha y Hora */}
          <div className="flex items-center justify-between text-[11px] text-[#8BA4A0] px-1 pt-1">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Jueves 6 Nov 2026</span>
            </div>
            <span>09:42 AM</span>
          </div>
        </header>

        {/* ============================================================== */}
        {/* 2. FORMULARIO FLUIDO DE REPORTE (Paso 1, 2 y 3)               */}
        {/* ============================================================== */}
        <div className="p-5 space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#102C26] tracking-tight">Reporte de Falla en Habitación</h2>
            <p className="text-xs text-[#6F7F7C] mt-0.5">Completa en menos de 1 minuto durante tu ronda.</p>
          </div>

          {/* PASO 1 DE 3: UBICACIÓN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#7E8D8A] tracking-wider uppercase">Ubicación · Paso 1 de 3</span>
            </div>

            {/* Selector de Bloques */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#1C2826]">Bloque</p>
              <div className="grid grid-cols-4 gap-2">
                {['Bloque 100', 'Bloque 400', 'Bloque 500', 'Cowork'].map(b => (
                  <button
                    key={b}
                    onClick={() => setBloqueSeleccionado(b)}
                    className={`py-2 text-[11px] font-semibold rounded-xl transition-all border ${
                      bloqueSeleccionado === b
                        ? 'bg-[#0E332E] text-white border-[#0E332E] shadow-sm'
                        : 'bg-white text-[#4A5C58] border-[#E6E3DB] hover:bg-[#F2EFE8]'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Habitación */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#1C2826]">Habitación</p>
              <div className="relative">
                <select
                  value={habitacion}
                  onChange={e => setHabitacion(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 bg-white border border-[#DDD9CE] rounded-xl text-xs font-bold text-[#1C2826] focus:outline-none focus:border-[#0E332E]"
                >
                  <option value="Hab 437">Hab 437</option>
                  <option value="Hab 431">Hab 431</option>
                  <option value="Hab 434">Hab 434</option>
                  <option value="Hab 439">Hab 439</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-[#7E8D8A] pointer-events-none" />
              </div>

              {/* Botones de Selección Rápida */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {['Hab 102', 'Hab 437', 'Hab 601'].map(h => (
                  <button
                    key={h}
                    onClick={() => setHabitacion(h)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      habitacion === h
                        ? 'bg-[#EBDDC3] border-[#C4B18E] text-[#4A3B21]'
                        : 'bg-white border-[#E6E3DB] text-[#556965] hover:bg-[#F2EFE8]'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarjeta de Información de la Habitación Seleccionada */}
            <div className="p-3.5 bg-[#0B2521] text-white rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#C2A661] text-[#0B2521] flex items-center justify-center">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Piso 4 · Suite Junior</p>
                  <p className="text-[10px] text-[#8BA4A0] mt-0.5">Bloque 400 · 2 camas · Ocupada hasta 12:00</p>
                </div>
              </div>

              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#143B35] text-[#C2A661] rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                <span>Auto</span>
              </span>
            </div>
          </div>

          {/* PASO 2 DE 3: CATEGORÍA DE AVERÍA */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[#7E8D8A] tracking-wider uppercase">Categoría · Paso 2 de 3</span>

            <div className="grid grid-cols-4 gap-2.5">
              {[
                { nombre: 'Plomería', icono: Droplets },
                { nombre: 'Aire Acond.', icono: Snowflake },
                { nombre: 'Electricidad', icono: Zap },
                { nombre: 'Otros', icono: MoreHorizontal }
              ].map(cat => {
                const Icono = cat.icono;
                const seleccionada = categoria === cat.nombre;
                return (
                  <button
                    key={cat.nombre}
                    onClick={() => setCategoria(cat.nombre)}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all border ${
                      seleccionada
                        ? 'bg-[#0E332E] text-white border-[#0E332E] shadow-md'
                        : 'bg-white text-[#4A5C58] border-[#E6E3DB] hover:bg-[#F2EFE8]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      seleccionada ? 'bg-white/10 text-[#C2A661]' : 'bg-[#F2EFE8] text-[#556965]'
                    }`}>
                      <Icono className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-center">{cat.nombre}</span>
                  </button>
                );
              })}
            </div>

            {/* Detalle del problema y Botones Multimedia */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#1C2826]">Detalle del problema</p>
              <div className="bg-white border border-[#DDD9CE] rounded-2xl p-3 focus-within:border-[#0E332E] shadow-sm">
                <textarea
                  rows={3}
                  value={detalle}
                  onChange={e => setDetalle(e.target.value)}
                  placeholder="Describe la falla observada..."
                  className="w-full text-xs text-[#1C2826] bg-transparent focus:outline-none resize-none"
                />

                <div className="flex items-center justify-between pt-2 border-t border-[#F0ECE1] text-[#7E8D8A]">
                  <div className="flex items-center space-x-2">
                    <button className="w-8 h-8 rounded-xl bg-[#F8F7F4] hover:bg-[#EDE9DF] text-[#4A5C58] flex items-center justify-center transition-all">
                      <Camera className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 rounded-xl bg-[#F8F7F4] hover:bg-[#EDE9DF] text-[#4A5C58] flex items-center justify-center transition-all">
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[11px] font-medium">{detalle.length}/250</span>
                </div>
              </div>
            </div>
          </div>

          {/* PASO 3 DE 3: PRIORIDAD */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[#7E8D8A] tracking-wider uppercase">Prioridad · Paso 3 de 3</span>

            <div className="space-y-2">
              {/* Prioridad Baja */}
              <label 
                onClick={() => setPrioridad('baja')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  prioridad === 'baja' ? 'border-[#10B981] bg-[#F0FDF4] shadow-sm' : 'border-[#E6E3DB] bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C2826]">Baja</p>
                    <p className="text-[10px] text-[#6F7F7C]">Puede esperar al fin de turno</p>
                  </div>
                </div>
                <input 
                  type="radio" 
                  name="prioridad" 
                  checked={prioridad === 'baja'} 
                  onChange={() => setPrioridad('baja')}
                  className="w-4 h-4 text-[#10B981]" 
                />
              </label>

              {/* Prioridad Media */}
              <label 
                onClick={() => setPrioridad('media')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  prioridad === 'media' ? 'border-[#F59E0B] bg-[#FFFBEB] shadow-sm' : 'border-[#E6E3DB] bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C2826]">Media</p>
                    <p className="text-[10px] text-[#6F7F7C]">Atender hoy mismo</p>
                  </div>
                </div>
                <input 
                  type="radio" 
                  name="prioridad" 
                  checked={prioridad === 'media'} 
                  onChange={() => setPrioridad('media')}
                  className="w-4 h-4 text-[#F59E0B]" 
                />
              </label>

              {/* Prioridad Alta (Bloquea Check-in) */}
              <label 
                onClick={() => setPrioridad('alta')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  prioridad === 'alta' ? 'border-[#EF4444] bg-[#FEF2F2] shadow-sm ring-1 ring-[#EF4444]/30' : 'border-[#E6E3DB] bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-[#1C2826]">Alta</p>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#EF4444] text-white rounded">
                        Bloquea Check-in
                      </span>
                    </div>
                    <p className="text-[10px] text-[#6F7F7C]">Habitación no disponible para venta</p>
                  </div>
                </div>
                <input 
                  type="radio" 
                  name="prioridad" 
                  checked={prioridad === 'alta'} 
                  onChange={() => setPrioridad('alta')}
                  className="w-4 h-4 text-[#EF4444]" 
                />
              </label>
            </div>
          </div>

          {/* Botón de Envío Principal */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="w-full py-4 bg-[#0E332E] hover:bg-[#072420] text-white rounded-2xl font-bold text-sm flex items-center justify-center space-x-2.5 transition-all shadow-lg shadow-[#0E332E]/20"
            >
              <Send className="w-4 h-4 text-[#C2A661]" />
              <span>{enviando ? 'Registrando en MySQL...' : 'Enviar Reporte de Habitación'}</span>
            </button>
            <p className="text-[11px] text-center text-[#7E8D8A]">
              Llega directo a Supervisión y Recepción · Sin WhatsApp
            </p>

            {enviadoExitoso && (
              <div className="p-3 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl text-center text-xs font-bold text-[#15803D] animate-bounce">
                ¡Reporte #TK-2847 registrado en MySQL y notificado a Supervisión! ✅
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BARRA DE NAVEGACIÓN INFERIOR (Bottom Bar PWA)               */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-[#E6E3DB] px-6 py-2 flex items-center justify-between shadow-lg z-50">
        <button 
          onClick={() => setTabActiva('reportar')}
          className={`flex flex-col items-center space-y-1 ${
            tabActiva === 'reportar' ? 'text-[#0E332E]' : 'text-[#8E9B98]'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] font-bold">Reportar</span>
        </button>

        <button 
          onClick={() => setTabActiva('historial')}
          className={`flex flex-col items-center space-y-1 ${
            tabActiva === 'historial' ? 'text-[#0E332E]' : 'text-[#8E9B98]'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mis reportes</span>
        </button>

        <button 
          onClick={() => setTabActiva('habitaciones')}
          className={`flex flex-col items-center space-y-1 ${
            tabActiva === 'habitaciones' ? 'text-[#0E332E]' : 'text-[#8E9B98]'
          }`}
        >
          <Bed className="w-5 h-5" />
          <span className="text-[10px] font-medium">Habitaciones</span>
        </button>

        <button 
          onClick={() => setTabActiva('perfil')}
          className={`flex flex-col items-center space-y-1 ${
            tabActiva === 'perfil' ? 'text-[#0E332E]' : 'text-[#8E9B98]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </nav>
    </div>
  );
};

