// Estructura general: barra lateral en PC y barra inferior en celular (diseño nuevo),
// con la cabecera y colores oficiales del Hotel Cortéz.
import { Suspense, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useSesion, useUsuario } from '../hooks/sesion';
import { useAvisos } from '../hooks/avisos';
import { ROL, ROL_AREA, TURNO } from '../lib/dominio';
import { pantallasDe } from '../navegacion';
import { Cargando } from './ui';

export function Layout() {
    const u = useUsuario();
    const { salir } = useSesion();
    const { conectado } = useAvisos();
    const [menu, setMenu] = useState(false);
    const pantallas = pantallasDe(u.rol);
    const principales = pantallas.filter(p => p.principal).slice(0, 4);

    const enlace = (activo: boolean) =>
        'flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-semibold transition-colors ' +
        (activo ? 'bg-[#EAE1CC] text-hotel-dark shadow-[inset_3px_0_0_#B9A271]' : 'text-[#C7D9D4] hover:bg-white/10 hover:text-white');

    return (
        <div className="min-h-screen md:flex bg-hotel-cream">
            {/* Barra lateral (PC) */}
            <aside className="hidden md:flex w-64 shrink-0 flex-col bg-hotel-dark border-r-2 border-hotel-accent sticky top-0 h-screen">
                <div className="px-5 pt-5 pb-4 border-b border-hotel-accent/30">
                    <img src="/logo-cortez.png" alt="Hotel Cortéz" className="h-12 w-auto object-contain" />
                    <p className="mt-3 text-[11px] uppercase tracking-widest text-hotel-accent font-semibold">Gestión de incidentes</p>
                </div>
                <div className="px-5 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-hotel-accent">{ROL[u.rol]}</p>
                    <p className="text-white font-semibold truncate">
                        {u.nombre} {u.apellido}
                    </p>
                    <p className="text-[11px] text-[#C7D9D4]">
                        {u.codigo}
                        {u.turno && ` · Turno ${TURNO[u.turno].toLowerCase()}`}
                    </p>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 space-y-1" aria-label="Menú principal">
                    {pantallas.map(p => (
                        <NavLink key={p.ruta} to={p.ruta} className={({ isActive }) => enlace(isActive)}>
                            <p.icono size={20} /> {p.texto}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-3 border-t border-hotel-accent/30 space-y-2">
                    <EstadoConexion conectado={conectado} />
                    <button
                        onClick={() => void salir()}
                        className="w-full flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-semibold text-[#C7D9D4] hover:bg-white/10 hover:text-white"
                    >
                        <LogOut size={20} /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col">
                {/* Cabecera (celular) */}
                <header className="md:hidden sticky top-0 z-30 bg-hotel-dark text-white border-b-2 border-hotel-accent px-4 h-14 flex items-center justify-between">
                    <img src="/logo-cortez.png" alt="Hotel Cortéz" className="h-9 w-auto" />
                    <div className="text-right leading-tight">
                        <p className="text-[10px] uppercase tracking-wider text-hotel-accent font-bold">{ROL_AREA[u.rol]}</p>
                        <p className="text-xs font-semibold flex items-center justify-end gap-1.5">
                            <span className={'w-2 h-2 rounded-full ' + (conectado ? 'bg-[#61CE70]' : 'bg-amber-400')} />
                            {u.nombre}
                        </p>
                    </div>
                </header>

                <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-5 md:py-8 pb-24 md:pb-10">
                    <Suspense fallback={<Cargando />}>
                        <Outlet />
                    </Suspense>
                </main>

                {/* Barra inferior (celular) */}
                <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t border-[#E2DCCE] flex" aria-label="Navegación">
                    {principales.map(p => (
                        <NavLink
                            key={p.ruta}
                            to={p.ruta}
                            className={({ isActive }) =>
                                'flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ' +
                                (isActive ? 'text-hotel-primary' : 'text-hotel-textMuted')
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={'px-4 py-1 rounded-full ' + (isActive ? 'bg-[#EAE1CC]' : '')}>
                                        <p.icono size={20} />
                                    </span>
                                    {p.texto.split(' ')[0] === 'Mis' ? p.texto : p.texto.split(' ')[0]}
                                </>
                            )}
                        </NavLink>
                    ))}
                    {/* "Más" siempre: contiene el resto de pantallas, perfil y cerrar sesión */}
                    <button
                        onClick={() => setMenu(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-hotel-textMuted"
                    >
                        <span className="px-4 py-1">
                            <Menu size={20} />
                        </span>
                        Más
                    </button>
                </nav>

                {menu && (
                    <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMenu(false)}>
                        <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-4 pb-6 space-y-1" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between pb-2">
                                <div>
                                    <p className="font-bold text-hotel-dark">
                                        {u.nombre} {u.apellido}
                                    </p>
                                    <p className="text-xs text-hotel-textMuted">
                                        {u.codigo} · {ROL[u.rol]}
                                    </p>
                                </div>
                                <button onClick={() => setMenu(false)} aria-label="Cerrar menú" className="p-2">
                                    <X size={20} />
                                </button>
                            </div>
                            {pantallas
                                .filter(p => !principales.includes(p))
                                .map(p => (
                                    <NavLink
                                        key={p.ruta}
                                        to={p.ruta}
                                        onClick={() => setMenu(false)}
                                        className={({ isActive }) =>
                                            'flex items-center gap-3 h-12 px-3 rounded-xl font-semibold ' +
                                            (isActive ? 'bg-[#EAE1CC] text-hotel-dark' : 'text-hotel-dark')
                                        }
                                    >
                                        <p.icono size={20} /> {p.texto}
                                    </NavLink>
                                ))}
                            <EstadoConexion conectado={conectado} claro />
                            <button onClick={() => void salir()} className="w-full flex items-center gap-3 h-12 px-3 rounded-xl font-semibold text-red-700">
                                <LogOut size={20} /> Cerrar sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function EstadoConexion({ conectado, claro }: { conectado: boolean; claro?: boolean }) {
    return (
        <p className={'flex items-center gap-2 px-3 text-[11px] ' + (claro ? 'text-hotel-textMuted' : 'text-[#C7D9D4]')}>
            <span className={'w-2 h-2 rounded-full ' + (conectado ? 'bg-[#61CE70]' : 'bg-amber-400 animate-pulse')} />
            {conectado ? 'Actualización en tiempo real' : 'Reconectando…'}
        </p>
    );
}
