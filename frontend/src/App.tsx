import React, { useState } from 'react';
import { VistaMucama } from './components/VistaMucama';
import { VistaTecnico } from './components/VistaTecnico';
import { VistaSupervisor } from './components/VistaSupervisor';
import { RackPC } from './components/RackPC';
import { Sparkles, Wrench, Shield, Columns3, Building2, Brush } from 'lucide-react';

export default function App() {
  const [rolActivo, setRolActivo] = useState<'mucama' | 'tecnico' | 'supervisor' | 'rack' | 'comparativa'>('mucama');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] font-sans">
      {/* Barra de Control Superior con la Jerarquía de Roles */}
      <header className="bg-[#0B2521] text-white px-6 py-3 flex items-center justify-between border-b border-[#143B35] z-50 sticky top-0 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#C2A661] text-[#0B2521] font-serif font-bold flex items-center justify-center text-sm shadow">
            HC
          </div>
          <div>
            <span className="font-serif font-semibold text-sm tracking-wide">Hotel Cortéz CMMS</span>
            <span className="block text-[10px] text-[#8BA4A0]">Sistema de Control de Mantenimiento</span>
          </div>
        </div>

        {/* Switcher de Roles según la Jerarquía */}
        <div className="flex items-center bg-[#071815] p-1 rounded-xl border border-[#19453E] space-x-1">
          <button
            onClick={() => setRolActivo('mucama')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              rolActivo === 'mucama' ? 'bg-[#0E332E] text-white shadow ring-1 ring-[#C2A661]' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Brush className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>1. Mucama (Gobernanza)</span>
          </button>

          <button
            onClick={() => setRolActivo('tecnico')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              rolActivo === 'tecnico' ? 'bg-[#0E332E] text-white shadow ring-1 ring-[#C2A661]' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>2. Técnico (Atención + Materiales)</span>
          </button>

          <button
            onClick={() => setRolActivo('supervisor')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              rolActivo === 'supervisor' ? 'bg-[#0E332E] text-white shadow ring-1 ring-[#C2A661]' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>3. Supervisor (Acceso Total)</span>
          </button>

          <button
            onClick={() => setRolActivo('rack')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              rolActivo === 'rack' ? 'bg-[#0E332E] text-white shadow ring-1 ring-[#C2A661]' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>Rack PC</span>
          </button>

          <button
            onClick={() => setRolActivo('comparativa')}
            className={`hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              rolActivo === 'comparativa' ? 'bg-[#0E332E] text-white shadow ring-1 ring-[#C2A661]' : 'text-[#8BA4A0] hover:text-white'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5 text-[#C2A661]" />
            <span>Jerarquía en Paralelo</span>
          </button>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main className="flex-1 p-6">
        {rolActivo === 'mucama' && <VistaMucama />}
        {rolActivo === 'tecnico' && <VistaTecnico />}
        {rolActivo === 'supervisor' && <VistaSupervisor />}
        {rolActivo === 'rack' && <RackPC />}

        {rolActivo === 'comparativa' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="border border-[#DDD9CE] p-4 rounded-2xl bg-[#EBE7DF]/50">
              <div className="mb-4 pb-2 border-b border-[#DDD9CE]">
                <h4 className="font-serif font-bold text-base text-[#0E332E]">Paso 1: Rol Mucama</h4>
                <p className="text-[11px] text-[#7E8D8A]">Genera la solicitud indicando habitación</p>
              </div>
              <VistaMucama />
            </div>

            <div className="border border-[#DDD9CE] p-4 rounded-2xl bg-[#EBE7DF]/50">
              <div className="mb-4 pb-2 border-b border-[#DDD9CE]">
                <h4 className="font-serif font-bold text-base text-[#0E332E]">Paso 2: Rol Técnico</h4>
                <p className="text-[11px] text-[#7E8D8A]">Crea reporte, atributos y materiales</p>
              </div>
              <VistaTecnico />
            </div>

            <div className="border border-[#DDD9CE] p-4 rounded-2xl bg-[#EBE7DF]/50">
              <div className="mb-4 pb-2 border-b border-[#DDD9CE]">
                <h4 className="font-serif font-bold text-base text-[#0E332E]">Paso 3: Rol Supervisor</h4>
                <p className="text-[11px] text-[#7E8D8A]">Acceso global a incidentes y asignaciones</p>
              </div>
              <VistaSupervisor />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
