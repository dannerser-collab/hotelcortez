import React, { useState } from 'react';
import { RackPC } from './components/RackPC';
import { ReporteMovil } from './components/ReporteMovil';
import { Monitor, Smartphone, Columns2 } from 'lucide-react';

export default function App() {
  const [modoVista, setModoVista] = useState<'pc' | 'movil' | 'dual'>('pc');

  return (
    <div className="min-h-screen flex flex-col bg-[#EBE7DF]">
      {/* Barra de Control Superior para Alternar Vistas */}
      <header className="bg-[#0B2521] text-white px-6 py-2.5 flex items-center justify-between border-b border-[#143B35] z-50 sticky top-0 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold flex items-center justify-center text-xs">
            HC
          </div>
          <span className="font-serif font-semibold text-sm tracking-wide">Hotel Cortéz CMMS</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#143B35] text-[#C2A661] font-mono">v1.0 (Demo en vivo)</span>
        </div>

        {/* Switcher de Vistas */}
        <div className="flex items-center bg-[#071815] p-1 rounded-xl border border-[#19453E] space-x-1">
          <button
            onClick={() => setModoVista('pc')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              modoVista === 'pc' ? 'bg-[#0E332E] text-white shadow' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>Vista PC (Rack)</span>
          </button>

          <button
            onClick={() => setModoVista('movil')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              modoVista === 'movil' ? 'bg-[#0E332E] text-white shadow' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>Vista Celular (Mucama)</span>
          </button>

          <button
            onClick={() => setModoVista('dual')}
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              modoVista === 'dual' ? 'bg-[#0E332E] text-white shadow' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>Vista Dual (PC + Celular)</span>
          </button>
        </div>
      </header>

      {/* Contenido según el Modo Seleccionado */}
      <div className="flex-1">
        {modoVista === 'pc' && (
          <RackPC />
        )}

        {modoVista === 'movil' && (
          <div className="py-6 bg-[#E5E2D9]">
            <ReporteMovil />
          </div>
        )}

        {modoVista === 'dual' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            {/* Vista PC en el lado izquierdo */}
            <div className="flex-1 border-r border-[#D9D5CA] overflow-auto">
              <RackPC />
            </div>

            {/* Vista Celular en el lado derecho */}
            <div className="w-full lg:w-[460px] p-6 bg-[#DCD8CD] flex justify-center items-start shrink-0">
              <div className="sticky top-14 w-full">
                <ReporteMovil />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
