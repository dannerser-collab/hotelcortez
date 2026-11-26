// Avisos flotantes (éxito, error, información) y conexión en tiempo real.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { escucharCambios } from '../lib/tiempoReal';
import { TEMA_A_CLAVES } from './datos';

type Tipo = 'ok' | 'error' | 'info';
type Aviso = { id: number; tipo: Tipo; texto: string };

const Ctx = createContext<{ avisar: (texto: string, tipo?: Tipo) => void; conectado: boolean } | null>(null);

export function ProveedorAvisos({ children, enLinea }: { children: ReactNode; enLinea: boolean }) {
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    const [conectado, setConectado] = useState(false);
    const qc = useQueryClient();
    const n = useRef(0);

    const avisar = useCallback((texto: string, tipo: Tipo = 'ok') => {
        const id = ++n.current;
        setAvisos(a => [...a.slice(-2), { id, tipo, texto }]);
        setTimeout(() => setAvisos(a => a.filter(x => x.id !== id)), tipo === 'error' ? 8000 : 5000);
    }, []);

    // Tiempo real: refresca solo lo que cambió
    useEffect(() => {
        if (!enLinea) return;
        let espera: ReturnType<typeof setTimeout> | null = null;
        const pendientes = new Set<string>();
        return escucharCambios(
            a => {
                pendientes.add(a.tema);
                if (espera) return;
                espera = setTimeout(() => {
                    espera = null;
                    for (const tema of pendientes) for (const k of TEMA_A_CLAVES[tema] || []) void qc.invalidateQueries({ queryKey: k });
                    pendientes.clear();
                }, 300);
            },
            ok => {
                setConectado(ok);
                if (ok) void qc.invalidateQueries();
            }
        );
    }, [enLinea, qc]);

    return (
        <Ctx.Provider value={{ avisar, conectado }}>
            {children}
            <div className="fixed z-[60] bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 flex flex-col gap-2 pointer-events-none" aria-live="polite">
                {avisos.map(a => (
                    <div
                        key={a.id}
                        role={a.tipo === 'error' ? 'alert' : 'status'}
                        className={
                            'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-sm font-medium shadow-lg ' +
                            (a.tipo === 'error'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : a.tipo === 'info'
                                  ? 'bg-white border-hotel-accent text-hotel-dark'
                                  : 'bg-[#DCFCE7] border-[#86EFAC] text-[#14532D]')
                        }
                    >
                        {a.tipo === 'error' ? (
                            <AlertTriangle size={18} className="shrink-0" />
                        ) : a.tipo === 'info' ? (
                            <Bell size={18} className="shrink-0 text-hotel-accent" />
                        ) : (
                            <CheckCircle2 size={18} className="shrink-0" />
                        )}
                        <span className="flex-1">{a.texto}</span>
                        <button onClick={() => setAvisos(x => x.filter(y => y.id !== a.id))} aria-label="Cerrar aviso">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </Ctx.Provider>
    );
}

export function useAvisos() {
    const c = useContext(Ctx);
    if (!c) throw new Error('useAvisos fuera de ProveedorAvisos');
    return c;
}
