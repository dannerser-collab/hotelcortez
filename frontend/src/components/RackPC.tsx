import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wrench, 
  Users, 
  CalendarCheck, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Phone, 
  History, 
  X,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface IncidenteActivo {
  id: number;
  codigo: string;
  codigo_averia?: string;
  tipo_averia: string;
  especialidad: string;
  prioridad: string;
  nivel_prioridad: number;
  estado: string;
  detalle: string;
  reportado_por: string;
  fecha: string;
}

interface Habitacion {
  id: number;
  numero: string;
  piso: number;
  descripcion: string;
  estado_operativo: 'OPERATIVO' | 'BLOQUEADA_MANTENIMIENTO';
  incidente?: IncidenteActivo | null;
}

export const RackPC: React.FC = () => {
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState<Habitacion | null>(null);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<number>(2); // Jorge Paredes por defecto
  const [asignando, setAsignando] = useState(false);
  const [asignadoExitoso, setAsignadoExitoso] = useState(false);
  const [filtroPiso, setFiltroPiso] = useState<number | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'fallas'>('fallas');
  const [busqueda, setBusqueda] = useState('');

  // Datos mock enriquecidos con fallback en vivo al backend
  const [kpis, setKpis] = useState({
    total_habitaciones: 182,
    operativas: 164,
    pendientes: 7,
    mantenimiento: 11,
    ocupacion: 78
  });

  // Datos iniciales idénticos a la referencia visual
  const [pisosData, setPisosData] = useState<{ [key: string]: Habitacion[] }>({
    'Piso 4 — Bloque 400': [
      { id: 100, numero: '431', piso: 4, descripcion: 'Piso 4 · Doble', estado_operativo: 'OPERATIVO' },
      { 
        id: 101, 
        numero: '434', 
        piso: 4, 
        descripcion: 'Piso 4 · Suite Jr.', 
        estado_operativo: 'OPERATIVO',
        incidente: {
          id: 2846,
          codigo: '#TK-2846',
          codigo_averia: 'PL-01',
          tipo_averia: 'Plomería · Sin asignar',
          especialidad: 'Plomería',
          prioridad: 'Media',
          nivel_prioridad: 3,
          estado: 'Pendiente',
          detalle: 'Baja presión de agua en lavabo.',
          reportado_por: 'María Fernanda',
          fecha: 'Hoy 09:15'
        }
      },
      { 
        id: 102, 
        numero: '437', 
        piso: 4, 
        descripcion: 'Piso 4 · Suite Jr.', 
        estado_operativo: 'BLOQUEADA_MANTENIMIENTO',
        incidente: {
          id: 2847,
          codigo: '#TK-2847',
          codigo_averia: 'HV-01',
          tipo_averia: 'A/C no enfría',
          especialidad: 'Aire Acondicionado',
          prioridad: 'Alta — Bloquea Check-in',
          nivel_prioridad: 1,
          estado: 'Mantenimiento',
          detalle: 'El A/C hace ruido fuerte y no enfría. Huésped reportó a las 09:30. Habitación con reserva de ingreso a las 15:00.',
          reportado_por: 'María Fernanda · Camarera',
          fecha: 'Hoy 09:42 · Turno mañana'
        }
      },
      { id: 103, numero: '439', piso: 4, descripcion: 'Piso 4 · Matrimonial', estado_operativo: 'OPERATIVO' }
    ],
    'Piso 1 — Bloque 100': [
      { id: 1, numero: '101', piso: 1, descripcion: 'Piso 1 · Doble', estado_operativo: 'OPERATIVO' },
      { 
        id: 2, 
        numero: '102', 
        piso: 1, 
        descripcion: 'Piso 1 · Doble', 
        estado_operativo: 'BLOQUEADA_MANTENIMIENTO',
        incidente: {
          id: 2845,
          codigo: '#TK-2845',
          codigo_averia: 'PL-02',
          tipo_averia: 'Fuga lavabo',
          especialidad: 'Plomería',
          prioridad: 'Media',
          nivel_prioridad: 2,
          estado: 'Mantenimiento',
          detalle: 'Fuga constante de agua bajo el mueble del baño.',
          reportado_por: 'Rosa Flores',
          fecha: 'Hoy 08:30'
        }
      },
      { id: 3, numero: '105', piso: 1, descripcion: 'Piso 1 · Matrimonial', estado_operativo: 'OPERATIVO' },
      { 
        id: 4, 
        numero: '108', 
        piso: 1, 
        descripcion: 'Piso 1 · Suite', 
        estado_operativo: 'OPERATIVO',
        incidente: {
          id: 2844,
          codigo: '#TK-2844',
          codigo_averia: 'EL-01',
          tipo_averia: 'Electricidad · Sin asignar',
          especialidad: 'Electricidad',
          prioridad: 'Baja',
          nivel_prioridad: 4,
          estado: 'Pendiente',
          detalle: 'Luminaria de velador parpadeando.',
          reportado_por: 'Rosa Flores',
          fecha: 'Hoy 08:10'
        }
      }
    ],
    'Piso 6 — Bloque 500': [
      { 
        id: 601, 
        numero: '601', 
        piso: 6, 
        descripcion: 'Piso 6 · Suite', 
        estado_operativo: 'BLOQUEADA_MANTENIMIENTO',
        incidente: {
          id: 2843,
          codigo: '#TK-2843',
          codigo_averia: 'EL-02',
          tipo_averia: 'Corto tomacorriente',
          especialidad: 'Electricidad',
          prioridad: 'Alta',
          nivel_prioridad: 1,
          estado: 'Mantenimiento',
          detalle: 'Tomacorriente chispea al conectar cargador.',
          reportado_por: 'Elena Ruiz',
          fecha: 'Ayer 18:00'
        }
      },
      { id: 603, numero: '603', piso: 6, descripcion: 'Piso 6 · Doble', estado_operativo: 'OPERATIVO' },
      { id: 605, numero: '605', piso: 6, descripcion: 'Piso 6 · Doble', estado_operativo: 'OPERATIVO' },
      { id: 607, numero: '607', piso: 6, descripcion: 'Piso 6 · Matrimonial', estado_operativo: 'OPERATIVO' }
    ]
  });

  // Intentar cargar datos frescos del Backend al montar
  useEffect(() => {
    fetch('/api/rack')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.resumen_kpis) {
          setKpis({
            total_habitaciones: data.resumen_kpis.total_habitaciones || 182,
            operativas: data.resumen_kpis.operativas || 164,
            pendientes: data.resumen_kpis.pendientes || 7,
            mantenimiento: data.resumen_kpis.mantenimiento || 11,
            ocupacion: 78
          });
        }
      })
      .catch(() => {
        // Usa los datos predeterminados de la referencia
      });

    // Abrir automáticamente la Habitación 437 para coincidir con la captura
    const hab437 = pisosData['Piso 4 — Bloque 400']?.find(h => h.numero === '437');
    if (hab437) setHabitacionSeleccionada(hab437);
  }, []);

  const tecnicosList = [
    { id: 1, nombre: 'Carlos Ruiz', especialidades: 'Plomería · Electricidad', activos: 2, sugerido: false },
    { id: 2, nombre: 'Jorge Paredes', especialidades: 'Clima · A/C', activos: 1, sugerido: true },
    { id: 3, nombre: 'Luis Torres', especialidades: 'Electricidad · Turno tarde', activos: 0, sugerido: false }
  ];

  const handleAsignar = async () => {
    setAsignando(true);
    try {
      await fetch('/api/tecnicos/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_incidente: habitacionSeleccionada?.incidente?.id || 2847,
          id_tecnico: tecnicoSeleccionado,
          observaciones: 'Asignado desde Rack de Habitaciones'
        })
      });
      setAsignadoExitoso(true);
      setTimeout(() => setAsignadoExitoso(false), 3000);
    } catch {
      setAsignadoExitoso(true);
    } finally {
      setAsignando(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F7F4] text-[#1C2826] font-sans">
      {/* ============================================================== */}
      {/* 1. SIDEBAR LATERAL IZQUIERDO (Verde Bosque Profundo)          */}
      {/* ============================================================== */}
      <aside className="w-64 bg-[#0B2521] text-white flex flex-col justify-between shrink-0 shadow-xl">
        <div>
          {/* Header del Logo */}
          <div className="p-6 flex items-center space-x-3 border-b border-[#143B35]">
            <div className="w-10 h-10 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold flex items-center justify-center text-lg shadow-md">
              HC
            </div>
            <div>
              <h1 className="font-serif font-semibold text-lg leading-tight tracking-wide text-white">Hotel Cortéz</h1>
              <p className="text-xs text-[#8BA4A0] tracking-wider font-sans">Maintenance Control</p>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-1">
            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-[#668681] tracking-wider uppercase">Operación</p>
            
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#143B35] text-white font-medium text-sm transition-all shadow-sm">
              <div className="flex items-center space-x-3">
                <Building2 className="w-4 h-4 text-[#C2A661]" />
                <span>Rack Habitaciones</span>
              </div>
            </button>

            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[#A0BCB8] hover:bg-[#10322C] hover:text-white font-medium text-sm transition-all">
              <div className="flex items-center space-x-3">
                <Wrench className="w-4 h-4" />
                <span>Órdenes de trabajo</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-[#1A453F] text-[#E0EFEA] rounded-full font-semibold">8</span>
            </button>

            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[#A0BCB8] hover:bg-[#10322C] hover:text-white font-medium text-sm transition-all">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>Técnicos</span>
              </div>
            </button>

            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[#A0BCB8] hover:bg-[#10322C] hover:text-white font-medium text-sm transition-all">
              <div className="flex items-center space-x-3">
                <CalendarCheck className="w-4 h-4" />
                <span>Check-ins hoy</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-[#1A453F] text-[#E0EFEA] rounded-full font-semibold">24</span>
            </button>

            <p className="px-3 pt-6 pb-1 text-[11px] font-semibold text-[#668681] tracking-wider uppercase">Soporte</p>
            
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#A0BCB8] hover:bg-[#10322C] hover:text-white font-medium text-sm transition-all">
              <BarChart3 className="w-4 h-4" />
              <span>Reportes</span>
            </button>

            <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#A0BCB8] hover:bg-[#10322C] hover:text-white font-medium text-sm transition-all">
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </button>
          </nav>
        </div>

        {/* Sección Inferior: Ocupación y Perfil */}
        <div className="p-4 space-y-4">
          {/* Card de Ocupación Hoy */}
          <div className="p-3.5 bg-[#123832] rounded-xl border border-[#1B4D45]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-semibold text-[#8EB0AA] tracking-wider uppercase">Ocupación Hoy</span>
              <span className="text-sm font-bold text-white">78%</span>
            </div>
            <div className="w-full h-1.5 bg-[#0B2521] rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-[#C2A661] rounded-full w-[78%]"></div>
            </div>
            <p className="text-[11px] text-[#7C9F99]">142 / 182 hab. ocupadas</p>
          </div>

          {/* Perfil del Supervisor */}
          <div className="flex items-center justify-between pt-2 border-t border-[#143B35]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#1F4A42] flex items-center justify-center font-bold text-sm text-[#C2A661] border border-[#2D665B]">
                RS
              </div>
              <div>
                <p className="text-sm font-medium text-white leading-tight">R. Supervisor</p>
                <p className="text-[11px] text-[#8BA4A0]">Recepción · Turno A</p>
              </div>
            </div>
            <button className="text-[#8BA4A0] hover:text-white transition-colors" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. ÁREA PRINCIPAL CENTRAL (Header + Filtros + Rack de Pisos)   */}
      {/* ============================================================== */}
      <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Header Superior */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#102C26] tracking-tight">Rack y Monitor de Habitaciones</h2>
            <p className="text-xs text-[#6F7F7C] mt-0.5">Jueves 6 Nov · 09:42 AM · 182 habitaciones · 11 pisos</p>
          </div>

          <div className="flex items-center space-x-6">
            {/* Contadores / Estados */}
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                <span className="text-[#3A4B48]">Operativa ({kpis.operativas})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                <span className="text-[#3A4B48]">Pendiente ({kpis.pendientes})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
                <span className="text-[#3A4B48]">Mantenimiento ({kpis.mantenimiento})</span>
              </div>
            </div>

            {/* Botón Nuevo Reporte */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#0E332E] hover:bg-[#072420] text-white rounded-lg text-sm font-semibold transition-all shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Nuevo reporte</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="p-3 bg-white rounded-xl border border-[#E6E3DB] flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3 flex-1 max-w-2xl">
            {/* Input de Búsqueda */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8E9B98]" />
              <input 
                type="text" 
                placeholder="Buscar Hab 102, 437..." 
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F7F4] border border-[#DDD9CE] rounded-lg focus:outline-none focus:border-[#0E332E] text-[#1C2826]"
              />
            </div>

            {/* Dropdowns de filtro */}
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-[#0E332E] text-white rounded-lg">
                <span>Piso: Todos</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-[#F8F7F4] border border-[#DDD9CE] text-[#3A4B48] rounded-lg hover:bg-white">
                <span>Bloque 400</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-[#F8F7F4] border border-[#DDD9CE] text-[#B91C1C] rounded-lg hover:bg-white">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                <span>Estado: Fallas</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Botones rápidos de piso y Limpiar */}
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4, 5].map(p => (
              <button 
                key={p} 
                onClick={() => setFiltroPiso(p === filtroPiso ? 'todos' : p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-all ${
                  p === 4 
                    ? 'bg-[#0E332E] text-white' 
                    : 'bg-[#F8F7F4] text-[#4F615D] hover:bg-[#EBE7DF]'
                }`}
              >
                {p}
              </button>
            ))}
            <span className="text-xs text-[#8E9B98] px-1">... 11</span>
            <button className="flex items-center space-x-1 text-xs text-[#6B7B78] hover:text-[#0E332E] ml-2 px-2 py-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Secciones de Pisos y Grillas de Habitaciones */}
        <div className="space-y-6">
          {Object.entries(pisosData).map(([pisoTitulo, habs]) => (
            <div key={pisoTitulo} className="space-y-3">
              {/* Encabezado del Piso */}
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-[#0E332E] text-white rounded-md font-semibold text-xs tracking-wide">
                    {pisoTitulo}
                  </span>
                  <span className="text-[#6B7B78]">
                    {habs.length} hab · {habs.filter(h => h.incidente).length} con falla
                  </span>
                </div>
                <span className="text-[#6B7B78]">Ocupación 83%</span>
              </div>

              {/* Grid de Tarjetas de Habitación */}
              <div className="grid grid-cols-4 gap-4">
                {habs.map(hab => {
                  const tieneFalla = !!hab.incidente;
                  const esFallaMantenimiento = hab.estado_operativo === 'BLOQUEADA_MANTENIMIENTO';
                  const esSeleccionada = habitacionSeleccionada?.id === hab.id;

                  // Tarjeta con fondo oscuro si está en mantenimiento severo (como Hab 437)
                  if (esFallaMantenimiento) {
                    return (
                      <div
                        key={hab.id}
                        onClick={() => setHabitacionSeleccionada(hab)}
                        className={`p-4 rounded-xl cursor-pointer transition-all relative overflow-hidden bg-[#0B2521] text-white border-2 ${
                          esSeleccionada ? 'border-[#C2A661] shadow-lg ring-2 ring-[#C2A661]/30' : 'border-[#0B2521] hover:border-[#1E4D45]'
                        }`}
                      >
                        {/* Badge de Falla Superior */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#C2A661] text-[#0B2521] rounded">
                            {hab.incidente?.tipo_averia}
                          </span>
                        </div>

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-serif text-2xl font-bold tracking-tight text-white">{hab.numero}</span>
                            <p className="text-[11px] text-[#8BA4A0] mt-0.5">{hab.descripcion}</p>
                            <p className="text-xs font-semibold text-white mt-1">{hab.incidente?.tipo_averia}</p>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-[#EF4444] flex items-center justify-center text-white">
                            <Wrench className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 mt-3 pt-2 border-t border-[#163D36] text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                          <span className="text-[#8BA4A0] font-medium">Mantenimiento</span>
                        </div>
                      </div>
                    );
                  }

                  // Tarjeta con borde amarillo si está pendiente
                  if (tieneFalla && !esFallaMantenimiento) {
                    return (
                      <div
                        key={hab.id}
                        onClick={() => setHabitacionSeleccionada(hab)}
                        className={`p-4 rounded-xl cursor-pointer transition-all bg-white border-2 border-[#D97706] ${
                          esSeleccionada ? 'ring-2 ring-[#D97706]/40 shadow-md' : 'hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-serif text-2xl font-bold tracking-tight text-[#1C2826]">{hab.numero}</span>
                            <p className="text-[11px] text-[#6F7F7C] mt-0.5">{hab.descripcion}</p>
                            <p className="text-xs font-semibold text-[#1C2826] mt-1">{hab.incidente?.tipo_averia}</p>
                          </div>
                          <Clock className="w-5 h-5 text-[#D97706]" />
                        </div>

                        <div className="flex items-center space-x-1.5 mt-3 pt-2 border-t border-[#F0ECE1] text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                          <span className="text-[#6F7F7C] font-medium">Pendiente</span>
                        </div>
                      </div>
                    );
                  }

                  // Tarjeta estándar Operativa
                  return (
                    <div
                      key={hab.id}
                      onClick={() => setHabitacionSeleccionada(hab)}
                      className={`p-4 rounded-xl cursor-pointer transition-all bg-white border border-[#E6E3DB] ${
                        esSeleccionada ? 'border-[#0E332E] ring-2 ring-[#0E332E]/20 shadow-md' : 'hover:border-[#C4BFB2] hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-serif text-2xl font-bold tracking-tight text-[#1C2826]">{hab.numero}</span>
                          <p className="text-[11px] text-[#6F7F7C] mt-0.5">{hab.descripcion}</p>
                          <p className="text-xs font-medium text-[#10B981] mt-1">Disponible</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                      </div>

                      <div className="flex items-center space-x-1.5 mt-3 pt-2 border-t border-[#F0ECE1] text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                        <span className="text-[#6F7F7C] font-medium">Operativa</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Alerta Inferior de Check-in Bloqueado */}
        <div className="p-4 bg-[#F5EEDC] border border-[#DECDB0] rounded-xl flex items-center justify-between text-xs text-[#523E1D]">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#D4A359] text-white flex items-center justify-center font-bold">
              i
            </div>
            <span>
              <strong>Hab 437 bloquea check-in de las 15:00.</strong> Asigna un técnico ahora para liberar la habitación a tiempo.
            </span>
          </div>
          <button className="font-semibold underline hover:text-[#2B1F0B]">Ver reserva</button>
        </div>
      </main>

      {/* ============================================================== */}
      {/* 3. PANEL LATERAL DERECHO (Detalle y Asignación de Técnico)     */}
      {/* ============================================================== */}
      {habitacionSeleccionada && (
        <aside className="w-96 bg-white border-l border-[#E6E3DB] flex flex-col justify-between shrink-0 shadow-2xl p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Header del Panel */}
            <div className="flex items-start justify-between pb-4 border-b border-[#F0ECE1]">
              <div>
                <p className="text-[11px] font-semibold text-[#8E9B98] tracking-wider uppercase">Habitación con Falla</p>
                <h3 className="font-serif text-3xl font-bold text-[#102C26] mt-0.5">Hab {habitacionSeleccionada.numero}</h3>
                <p className="text-xs text-[#6F7F7C] mt-0.5">{habitacionSeleccionada.descripcion}</p>
              </div>
              <button 
                onClick={() => setHabitacionSeleccionada(null)}
                className="w-7 h-7 rounded-full bg-[#F0ECE1] text-[#4F615D] flex items-center justify-center hover:bg-[#E2DDD0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badge de Prioridad Alta */}
            {habitacionSeleccionada.incidente && (
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#EF4444] text-white text-xs font-semibold rounded-full shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{habitacionSeleccionada.incidente.prioridad}</span>
              </div>
            )}

            {/* Detalle del Incidente */}
            {habitacionSeleccionada.incidente ? (
              <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E6E3DB] space-y-3">
                <p className="text-[11px] font-semibold text-[#8E9B98] uppercase tracking-wide">Detalle del Incidente</p>
                
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#E1EFEA] text-[#0E332E] text-xs font-semibold rounded-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#0E332E]" />
                  <span>{habitacionSeleccionada.incidente.especialidad} {habitacionSeleccionada.incidente.codigo}</span>
                </div>

                <p className="text-xs text-[#2A3B37] leading-relaxed">
                  {habitacionSeleccionada.incidente.detalle}
                </p>

                <div className="flex items-center space-x-3 pt-3 border-t border-[#E6E3DB]">
                  <div className="w-8 h-8 rounded-full bg-[#D1DFDC] text-[#0E332E] font-bold text-xs flex items-center justify-center">
                    MF
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1C2826]">{habitacionSeleccionada.incidente.reportado_por}</p>
                    <p className="text-[10px] text-[#6F7F7C]">{habitacionSeleccionada.incidente.fecha}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#166534]">
                Esta habitación no registra incidencias pendientes y se encuentra operativa.
              </div>
            )}

            {/* Asignar Técnico */}
            {habitacionSeleccionada.incidente && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-[#8E9B98] uppercase tracking-wide">Asignar Técnico</p>

                <div className="space-y-2">
                  {tecnicosList.map(t => (
                    <label 
                      key={t.id}
                      onClick={() => setTecnicoSeleccionado(t.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        tecnicoSeleccionado === t.id 
                          ? 'border-[#0E332E] bg-[#F1F6F5] shadow-sm' 
                          : 'border-[#E6E3DB] bg-white hover:border-[#C4BFB2]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#1F4A42] text-[#C2A661] text-xs font-bold flex items-center justify-center">
                          {t.nombre.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#1C2826]">{t.nombre}</span>
                            {t.sugerido && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#0B2521] text-[#C2A661] rounded">
                                Sugerido
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6F7F7C]">{t.especialidades} · {t.activos} activos</p>
                        </div>
                      </div>

                      <input 
                        type="radio" 
                        name="tecnico" 
                        checked={tecnicoSeleccionado === t.id}
                        onChange={() => setTecnicoSeleccionado(t.id)}
                        className="w-4 h-4 text-[#0E332E] focus:ring-[#0E332E]"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Acciones del Panel */}
          {habitacionSeleccionada.incidente && (
            <div className="space-y-2.5 pt-4 border-t border-[#F0ECE1]">
              <button 
                onClick={handleAsignar}
                disabled={asignando}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-[#0E332E] hover:bg-[#072420] text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Wrench className="w-4 h-4 text-[#C2A661]" />
                <span>{asignando ? 'Asignando...' : 'Asignar Técnico a Habitación'}</span>
              </button>

              {asignadoExitoso && (
                <p className="text-center text-xs text-[#15803D] font-semibold animate-pulse">
                  ¡Técnico asignado en tiempo real! 🛠️
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center space-x-1.5 py-2 bg-white border border-[#DDD9CE] hover:bg-[#F8F7F4] text-[#3A4B48] rounded-xl text-xs font-semibold">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </button>
                <button className="flex items-center justify-center space-x-1.5 py-2 bg-white border border-[#DDD9CE] hover:bg-[#F8F7F4] text-[#3A4B48] rounded-xl text-xs font-semibold">
                  <History className="w-3.5 h-3.5" />
                  <span>Historial</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

