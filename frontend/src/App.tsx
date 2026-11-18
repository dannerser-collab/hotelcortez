import React, { useEffect, useRef, useState } from 'react';
import { Bell, Building2, LogOut, Wrench, Send, Shield, Camera, PanelLeft, X, Search, Plus } from 'lucide-react';

type User = {
    id_empleado: number;
    nombre: string;
    apellido: string;
    rol: string;
};

const labels: Record<string, string> = {
    MUCAMA: 'Gobernanza · Mucama',
    TECNICO: 'Mantenimiento · Técnico',
    SUPERVISOR: 'Supervisión General'
};

// Normaliza cualquier texto que pudiera venir con caracteres mal codificados
function cleanText(text: string | undefined | null): string {
    if (!text) return '';
    return String(text)
        .replace(/Mar├â┬¡a/g, 'María')
        .replace(/L├â┬│pez/g, 'López')
        .replace(/├â┬¡/g, 'í')
        .replace(/├â┬│/g, 'ó')
        .replace(/├â┬á/g, 'á')
        .replace(/├â┬©/g, 'é')
        .replace(/├â┬║/g, 'ú')
        .replace(/├â┬±/g, 'ñ')
        .replace(/├óÔé¼ÔÇØ/g, '—')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ');
}

async function api(path: string, body?: any, method = 'GET') {
    const response = await fetch('/api' + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + (sessionStorage.getItem('hc-token') || '')
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(12000)
    });
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401 && path !== '/auth/login')
            window.dispatchEvent(new Event('hc-expired'));
        throw new Error(data.mensaje || 'No se pudo completar la operación.');
    }
    return data;
}

const status = (s: any) => s.resuelto ? 'Resuelto' : s.id_incidente ? 'En reparación' : 'Esperando técnico';
const date = (value: string) => value ? String(value).split('T')[0] : '';

export default function App() {
    const [user, setUser] = useState<User | null>(null), [checking, setChecking] = useState(true), [error, setError] = useState('');
    const [loginId, setLoginId] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false);

    useEffect(() => {
        const expired = () => {
            sessionStorage.removeItem('hc-token');
            setUser(null);
            setError('La sesión terminó. Inicia sesión nuevamente.');
        };
        window.addEventListener('hc-expired', expired);
        if (sessionStorage.getItem('hc-token'))
            api('/auth/me').then(d => setUser(d.user)).catch(e => setError(e.message)).finally(() => setChecking(false));
        else
            setChecking(false);
        return () => window.removeEventListener('hc-expired', expired);
    }, []);

    async function login(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const d = await api('/auth/login', { id: loginId, password }, 'POST');
            sessionStorage.setItem('hc-token', d.token);
            setUser(d.user);
            setPassword('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        setBusy(true);
        try {
            await api('/auth/logout', {}, 'POST');
            sessionStorage.removeItem('hc-token');
            setUser(null);
            setError('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    if (checking)
        return <main className="p-8">Verificando sesión…</main>;

    return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#1C2826]">
            <header className="bg-[#0B2521] text-white px-4 sm:px-8 py-4 flex justify-between items-center gap-3">
                <div className="flex gap-3 items-center">
                    <span className="rounded-full bg-[#C2A661] text-[#0B2521] w-10 h-10 grid place-items-center font-serif font-bold">
                        HC
                    </span>
                    <div>
                        <h1 className="font-serif font-semibold">Hotel Cortéz CMMS</h1>
                        <p className="text-xs text-[#8BA4A0]">Sistema de Control de Mantenimiento</p>
                    </div>
                </div>
                {user && (
                    <button className="beta-secondary" disabled={busy} onClick={logout}>
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                )}
            </header>

            {!user ? (
                <main className="max-w-md mx-auto px-4 py-12 sm:py-20">
                    <section className="beta-card space-y-5">
                        <Shield className="text-[#C2A661]" size={32} />
                        <div>
                            <p className="text-xs uppercase tracking-widest text-[#7E8D8A]">Acceso del personal · Beta</p>
                            <h2 className="font-serif text-3xl font-bold text-[#0E332E] mt-2">Bienvenido al Hotel Cortéz</h2>
                            <p className="text-sm mt-2 text-[#6F7F7C]">Ingresa tus credenciales para acceder a tu área de trabajo.</p>
                        </div>
                        <form onSubmit={login} className="space-y-4">
                            <label className="beta-label">
                                ID de empleado
                                <input autoComplete="username" inputMode="numeric" required value={loginId} onChange={e => setLoginId(e.target.value)} />
                            </label>
                            <label className="beta-label">
                                Contraseña
                                <input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                            </label>
                            {error && <p role="alert" className="beta-error">{error}</p>}
                            <button className="beta-primary w-full" disabled={busy}>
                                {busy ? 'Verificando…' : 'Iniciar sesión'}
                            </button>
                        </form>
                    </section>
                </main>
            ) : (
                <>
                    {error && <p role="alert" className="beta-error m-4">{error}</p>}
                    <Workspace key={user.id_empleado} user={user} />
                </>
            )}
        </div>
    );
}

function Workspace({ user }: { user: User }) {
    const [data, setData] = useState<any>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
    const [tab, setTab] = useState('rack'), [search, setSearch] = useState(''), [floor, setFloor] = useState(''), [onlyFaults, setOnlyFaults] = useState(false), [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [room, setRoom] = useState(''), [problem, setProblem] = useState(''), [photo, setPhoto] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [active, setActive] = useState<any>(null), [type, setType] = useState(''), [priority, setPriority] = useState('2'), [diagnosis, setDiagnosis] = useState('');
    const [materialRows, setMaterialRows] = useState<{ nombre: string; cantidad: string }[]>([{ nombre: '', cantidad: '1' }]);
    const lastId = useRef<number | null>(null), mounted = useRef(true), loading = useRef(false);

    // Cálculo automático del Bloque y Piso a partir del número de habitación ingresado (ej: 134 -> Bloque 100, 423 -> Bloque 400)
    const cleanRoomNumber = room.trim().replace(/\D/g, '');
    const firstDigit = cleanRoomNumber.length > 0 ? parseInt(cleanRoomNumber.charAt(0), 10) : 0;
    const bloqueDetectado = firstDigit > 0 ? firstDigit * 100 : null;
    const pisoDetectado = firstDigit > 0 ? firstDigit : null;

    async function load() {
        if (loading.current) return;
        loading.current = true;
        try {
            const d = await api('/datos');
            if (!mounted.current) return;
            const max = Math.max(0, ...d.solicitudes.map((s: any) => s.id_solicitud));
            if (user.rol === 'TECNICO' && lastId.current !== null && max > lastId.current) {
                const incoming = d.solicitudes.filter((s: any) => s.id_solicitud > lastId.current!);
                setNotice('Nueva solicitud: ' + incoming.map((s: any) => 'Hab. ' + s.numero + ' — ' + cleanText(s.problema)).join(' · '));
            }
            lastId.current = max;
            setData(d);
            setError('');
        } catch (e: any) {
            if (mounted.current) setError(e.message);
        } finally {
            loading.current = false;
        }
    }

    useEffect(() => {
        mounted.current = true;
        void load();
        const timer = setInterval(load, 3000);
        return () => {
            mounted.current = false;
            clearInterval(timer);
        };
    }, []);

    async function action(path: string, body: any, method: string, success: string) {
        setBusy(true);
        setError('');
        try {
            await api(path, body, method);
            setNotice(success);
            await load();
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function report(e: React.FormEvent) {
        e.preventDefault();
        if (!cleanRoomNumber) {
            setError('Ingresa un número de habitación válido (ej: 134, 354, 423).');
            return;
        }
        if (await action('/mucama/reportar', { numero_habitacion: cleanRoomNumber, problema: problem, foto: photo }, 'POST', `Solicitud enviada para Hab. ${cleanRoomNumber} (Bloque ${bloqueDetectado}). Mantenimiento ya puede consultarla.`)) {
            setRoom('');
            setProblem('');
            setPhoto('');
        }
    }

    async function attend(e: React.FormEvent) {
        e.preventDefault();
        const materialesLimpios = materialRows
            .filter(r => r.nombre.trim().length > 0)
            .map(r => ({
                nombre: r.nombre.trim(),
                cantidad: Math.max(1, parseInt(r.cantidad, 10) || 1)
            }));
        if (await action('/tecnico/atender', {
            id_solicitud: active.id_solicitud,
            id_tipo_incidente: type,
            nivel_prioridad: priority,
            observaciones_tecnico: diagnosis,
            materiales: materialesLimpios
        }, 'POST', 'Asignación e incidente registrados.')) {
            setActive(null);
            setDiagnosis('');
            setMaterialRows([{ nombre: '', cantidad: '1' }]);
        }
    }

    async function readPhoto(file?: File) {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setError('Usa una foto JPG, PNG o WebP de hasta 2 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setPhoto(String(reader.result));
        reader.onerror = () => setError('No se pudo leer la foto.');
        reader.readAsDataURL(file);
    }

    const solicitudes = data?.solicitudes || [];
    const rooms = data?.habitaciones || [];
    const filtered = solicitudes.filter((s: any) =>
        (s.numero + ' ' + cleanText(s.problema) + ' ' + cleanText(s.reportado_por) + ' ' + cleanText(s.tecnico || '')).toLowerCase().includes(search.toLowerCase())
    );

    const fullName = cleanText(`${user.nombre} ${user.apellido}`);

    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 relative">
            {/* Banner de usuario con tipografía limpia y botón de barra lateral para la Mucama */}
            <section className="bg-[#0B2521] text-white rounded-2xl p-5 flex flex-wrap justify-between gap-4 items-center shadow-md border border-[#143B35]">
                <div className="flex items-center gap-3.5">
                    {user.rol === 'MUCAMA' && (
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(prev => !prev)}
                            title={sidebarOpen ? 'Ocultar historial de solicitudes' : 'Mostrar historial de solicitudes'}
                            aria-label="Alternar barra lateral de historial"
                            className="relative p-2.5 rounded-xl bg-[#123832] hover:bg-[#194A42] text-[#C2A661] border border-[#1F4A42] transition-all shadow-sm"
                        >
                            <PanelLeft size={22} strokeWidth={2} />
                            {solicitudes.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#C2A661] text-[#0B2521] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    {solicitudes.length}
                                </span>
                            )}
                        </button>
                    )}
                    <div>
                        <p className="text-[#C2A661] text-xs font-semibold uppercase tracking-wider">{labels[user.rol]}</p>
                        <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">{fullName}</h2>
                        <p className="text-xs text-[#9BB5B0] mt-0.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
                            <span>ID {user.id_empleado} · Sincronizado en tiempo real</span>
                        </p>
                    </div>
                </div>

                {user.rol === 'MUCAMA' && (
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(prev => !prev)}
                            className="beta-secondary flex items-center gap-2"
                        >
                            <PanelLeft size={16} />
                            <span>{sidebarOpen ? 'Cerrar historial' : `Mis solicitudes (${solicitudes.length})`}</span>
                        </button>
                    </div>
                )}
            </section>

            {error && <p className="beta-error" role="alert">{error}</p>}
            {notice && (
                <div role="status" aria-live="polite" className="bg-[#DCFCE7] border border-[#86EFAC] rounded-xl p-4 flex gap-3 items-start text-sm text-[#14532D] font-medium">
                    <Bell size={20} className="shrink-0" />
                    <span className="flex-1">{notice}</span>
                    <button onClick={() => setNotice('')} aria-label="Cerrar aviso" className="font-bold text-lg leading-none">×</button>
                </div>
            )}

            {!data ? (
                <p>{error ? 'No se cargaron los datos. Pulsa Actualizar para reintentar.' : 'Cargando datos de MySQL…'}</p>
            ) : (
                <>
                    {/* ========================================================= */}
                    {/* VISTA MUCAMA: Barra Lateral Desplegable + Formulario       */}
                    {/* ========================================================= */}
                    {user.rol === 'MUCAMA' && (
                        <div className="relative flex items-start gap-6">
                            {/* Overlay oscuro en pantallas pequeñas cuando la barra lateral está abierta */}
                            {sidebarOpen && (
                                <div
                                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                                    onClick={() => setSidebarOpen(false)}
                                />
                            )}

                            {/* Barra Lateral Desplegable con el Historial de Solicitudes de la Mucama */}
                            <aside
                                className={`fixed lg:static top-0 left-0 z-50 lg:z-auto h-full lg:h-auto bg-white border border-[#E6E3DB] rounded-r-2xl lg:rounded-2xl shadow-2xl lg:shadow-sm transition-all duration-300 overflow-hidden shrink-0 ${
                                    sidebarOpen
                                        ? 'w-80 sm:w-96 p-5 opacity-100 translate-x-0'
                                        : 'w-0 p-0 opacity-0 -translate-x-full lg:translate-x-0 border-0 pointer-events-none'
                                }`}
                            >
                                <div className="space-y-4 w-72 sm:w-80">
                                    <div className="flex items-center justify-between pb-3 border-b border-[#E6E3DB]">
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setSidebarOpen(false)}
                                                className="p-1.5 rounded-lg bg-[#F8F7F4] hover:bg-[#EFECE6] text-[#0E332E]"
                                                title="Ocultar barra lateral"
                                            >
                                                <PanelLeft size={18} />
                                            </button>
                                            <div>
                                                <h3 className="font-sans text-base font-bold text-[#0E332E]">Mis solicitudes</h3>
                                                <p className="text-[11px] text-[#6F7F7C]">{solicitudes.length} registradas en total</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSidebarOpen(false)}
                                            className="p-1.5 rounded-lg text-[#6F7F7C] hover:text-[#1C2826] hover:bg-[#F8F7F4]"
                                            aria-label="Cerrar historial"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Buscador rápido en la barra lateral */}
                                    <div className="relative flex items-center">
                                        <Search size={15} className="absolute left-3.5 text-[#7E8D8A] pointer-events-none" />
                                        <input
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Buscar hab. o problema…"
                                            className="w-full !pl-10 !pr-3 !py-2.5 text-xs"
                                        />
                                    </div>

                                    {/* Lista desplazable de solicitudes */}
                                    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                                        {filtered.length === 0 ? (
                                            <p className="text-xs text-[#6F7F7C] py-6 text-center">No hay solicitudes para mostrar.</p>
                                        ) : (
                                            filtered.map((s: any) => <Ticket key={s.id_solicitud} s={s} />)
                                        )}
                                    </div>
                                </div>
                            </aside>

                            {/* Formulario Principal de Registro de Solicitud */}
                            <section className="beta-card flex-1 max-w-xl mx-auto space-y-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-sans text-2xl font-bold text-[#0E332E]">Registrar solicitud de habitación</h3>
                                        <p className="text-xs text-[#6F7F7C] mt-1">
                                            Escribe únicamente el número de la habitación. El bloque y piso se calculan de forma automática.
                                        </p>
                                    </div>
                                    {!sidebarOpen && (
                                        <button
                                            type="button"
                                            onClick={() => setSidebarOpen(true)}
                                            className="p-2.5 rounded-xl bg-[#F8F7F4] hover:bg-[#EFECE6] border border-[#DDD9CE] text-[#0E332E] shrink-0"
                                            title="Abrir barra lateral de historial"
                                        >
                                            <PanelLeft size={20} />
                                        </button>
                                    )}
                                </div>

                                <form className="space-y-4" onSubmit={report}>
                                    <div className="space-y-2">
                                        <label className="beta-label">
                                            Número de habitación
                                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[1-9][0-9]{2}"
                                                    maxLength={3}
                                                    required
                                                    value={room}
                                                    onChange={e => setRoom(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                    placeholder="Ej: 134, 354, 423"
                                                    className="text-lg font-bold tracking-wider text-[#0E332E] sm:w-48"
                                                />

                                                {/* Indicador automático de Bloque y Piso */}
                                                {bloqueDetectado ? (
                                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0B2521] text-white border border-[#C2A661]">
                                                        <Building2 size={20} className="text-[#C2A661] shrink-0" />
                                                        <div className="text-xs">
                                                            <span className="text-[#C2A661] font-bold block">
                                                                Hab. {cleanRoomNumber} → Bloque {bloqueDetectado}
                                                            </span>
                                                            <span className="text-[#9BB5B0]">
                                                                Piso {pisoDetectado} detectado automáticamente
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 px-4 py-3 rounded-xl bg-[#F8F7F4] border border-dashed border-[#DDD9CE] text-xs text-[#6F7F7C]">
                                                        Escribe el nro. de habitación (ej. <strong>134</strong> → Bloque 100, <strong>423</strong> → Bloque 400)
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    <label className="beta-label">
                                        Problema / falla observada
                                        <textarea
                                            required
                                            maxLength={8000}
                                            rows={4}
                                            value={problem}
                                            onChange={e => setProblem(e.target.value)}
                                            placeholder="Describe qué ocurre, dónde y cualquier detalle útil para mantenimiento"
                                        />
                                    </label>

                                    <label className="beta-label">
                                        <span className="flex gap-2 items-center">
                                            <Camera size={16} />
                                            Adjuntar foto (opcional, hasta 2 MB)
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={e => void readPhoto(e.target.files?.[0])}
                                        />
                                    </label>

                                    {photo && (
                                        <div>
                                            <img className="rounded-xl max-h-48" src={photo} alt="Foto del problema" />
                                            <button type="button" className="beta-secondary mt-2" onClick={() => setPhoto('')}>
                                                Quitar foto
                                            </button>
                                        </div>
                                    )}

                                    <button className="beta-primary w-full" disabled={busy || !cleanRoomNumber || !problem.trim()}>
                                        <Send size={16} />
                                        {busy ? 'Enviando…' : 'Enviar solicitud a mantenimiento'}
                                    </button>
                                </form>
                            </section>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* VISTA SUPERVISOR Y TÉCNICO                                 */}
                    {/* ========================================================= */}
                    {user.rol === 'SUPERVISOR' && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    ['Habitaciones', rooms.length],
                                    ['Operativas', rooms.filter((h: any) => h.estado).length],
                                    ['En mantenimiento', rooms.filter((h: any) => !h.estado).length],
                                    ['Solicitudes pendientes', solicitudes.filter((s: any) => !s.resuelto).length]
                                ].map(([label, value]) => (
                                    <section key={label} className="beta-card">
                                        <p className="text-xs text-[#6F7F7C]">{label}</p>
                                        <strong className="font-serif text-3xl text-[#0E332E]">{value}</strong>
                                    </section>
                                ))}
                            </div>
                            <nav className="flex flex-wrap gap-2">
                                {[
                                    ['rack', 'Rack de habitaciones'],
                                    ['solicitudes', 'Solicitudes'],
                                    ['incidentes', 'Incidentes'],
                                    ['asignaciones', 'Asignaciones'],
                                    ['habitaciones', 'Asignar habitaciones']
                                ].map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => { setTab(key); setSelectedRoom(null); }}
                                        className={tab === key ? 'beta-primary' : 'beta-secondary'}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </nav>
                        </>
                    )}

                    {user.rol === 'SUPERVISOR' && tab === 'habitaciones' ? (
                        <section className="beta-card space-y-4">
                            <h3 className="font-serif text-2xl">Asignar habitaciones a Gobernanza</h3>
                            {rooms.map((h: any) => (
                                <label key={h.id_habitacion} className="beta-label">
                                    Hab {h.numero} · Bloque {h.bloque}
                                    <select
                                        disabled={busy}
                                        value={h.mucama_id || ''}
                                        onChange={e => void action('/supervisor/asignar-habitacion', { id_habitacion: h.id_habitacion, id_empleado: Number(e.target.value) }, 'POST', 'Habitación asignada.')}
                                    >
                                        <option value="" disabled>Sin asignar</option>
                                        {data.mucamas.map((m: any) => (
                                            <option key={m.id_empleado} value={m.id_empleado}>
                                                {cleanText(m.nombre)} {cleanText(m.apellido)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ))}
                        </section>
                    ) : user.rol === 'SUPERVISOR' && tab === 'rack' ? (
                        <section className="beta-card space-y-4">
                            <h3 className="font-serif text-2xl text-[#0E332E] font-bold">Rack y monitor de habitaciones</h3>
                            <div className="flex flex-wrap gap-3">
                                <label className="beta-label flex-1">
                                    Buscar habitación
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ej: 437" />
                                </label>
                                <label className="beta-label">
                                    Piso
                                    <select value={floor} onChange={e => setFloor(e.target.value)}>
                                        <option value="">Todos</option>
                                        {Array.from(new Set(rooms.map((h: any) => String(h.piso)))).sort().map((p: any) => (
                                            <option key={p}>{p}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex gap-2 items-center text-sm">
                                    <input type="checkbox" checked={onlyFaults} onChange={e => setOnlyFaults(e.target.checked)} />
                                    Solo con fallas
                                </label>
                                <button className="beta-secondary" onClick={() => { setSearch(''); setFloor(''); setOnlyFaults(false); }}>
                                    Limpiar
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                                {rooms
                                    .filter((h: any) => h.numero.includes(search) && (!floor || String(h.piso) === floor) && (!onlyFaults || !h.estado))
                                    .map((h: any) => (
                                        <button
                                            key={h.id_habitacion}
                                            onClick={() => setSelectedRoom(h)}
                                            className={'text-left rounded-xl border p-4 ' + (h.estado ? 'bg-white border-[#E6E3DB]' : 'bg-[#0B2521] text-white border-[#C2A661]')}
                                        >
                                            <Building2 size={18} className="text-[#C2A661]" />
                                            <strong className="font-serif text-2xl">{h.numero}</strong>
                                            <p className="text-xs">Bloque {h.bloque} · Piso {h.piso}</p>
                                            <p className="text-xs mt-2">{h.estado ? 'Operativa' : 'Mantenimiento'}</p>
                                        </button>
                                    ))}
                            </div>
                            {selectedRoom && (
                                <section className="rounded-xl bg-[#F8F7F4] p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold">Historial · Hab {selectedRoom.numero}</h4>
                                        <button className="beta-secondary" onClick={() => setSelectedRoom(null)}>Cerrar</button>
                                    </div>
                                    {solicitudes.filter((s: any) => s.id_habitacion === selectedRoom.id_habitacion).length === 0 && (
                                        <p>Sin solicitudes registradas.</p>
                                    )}
                                    {solicitudes
                                        .filter((s: any) => s.id_habitacion === selectedRoom.id_habitacion)
                                        .map((s: any) => <Ticket key={s.id_solicitud} s={s} />)}
                                </section>
                            )}
                        </section>
                    ) : user.rol !== 'MUCAMA' ? (
                        <section className="beta-card space-y-4">
                            <div className="flex flex-wrap justify-between gap-3">
                                <h3 className="font-serif text-2xl font-bold text-[#0E332E]">
                                    {user.rol === 'TECNICO'
                                        ? 'Solicitudes recibidas'
                                        : tab === 'incidentes'
                                        ? 'Resumen de incidentes'
                                        : tab === 'asignaciones'
                                        ? 'Asignaciones de técnicos'
                                        : 'Solicitudes de Gobernanza'}
                                </h3>
                                <label className="beta-label">
                                    Buscar
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Habitación, problema o persona" />
                                </label>
                            </div>
                            {filtered.filter((s: any) => user.rol !== 'SUPERVISOR' || tab === 'solicitudes' || s.id_incidente).length === 0 && (
                                <p className="text-sm text-[#6F7F7C]">No hay registros para mostrar.</p>
                            )}
                            {filtered
                                .filter((s: any) => user.rol !== 'SUPERVISOR' || tab === 'solicitudes' || s.id_incidente)
                                .map((s: any) => (
                                    <Ticket key={s.id_solicitud} s={s}>
                                        {user.rol === 'TECNICO' && !s.resuelto && (
                                            !s.id_incidente ? (
                                                <button
                                                    className="beta-primary"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        setActive(s);
                                                        setType(String(data.tipos[0]?.id_tipo_incidente || ''));
                                                        setPriority('2');
                                                        setDiagnosis('');
                                                        setMaterialRows([{ nombre: '', cantidad: '1' }]);
                                                    }}
                                                >
                                                    Atender solicitud
                                                </button>
                                            ) : s.tecnico_id === user.id_empleado ? (
                                                <button
                                                    className="beta-primary"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        if (window.confirm('¿Confirmas que la falla está resuelta?'))
                                                            void action('/tecnico/finalizar', { id_incidente: s.id_incidente }, 'PATCH', 'Reparación finalizada. El estado de la habitación fue actualizado.');
                                                    }}
                                                >
                                                    Finalizar reparación
                                                </button>
                                            ) : (
                                                <p className="text-xs">Asignada a otro técnico</p>
                                            )
                                        )}
                                    </Ticket>
                                ))}
                        </section>
                    ) : null}

                    {active && (
                        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Atender solicitud">
                            <section className="beta-card max-w-2xl mx-auto my-6">
                                <h3 className="font-serif text-2xl font-bold text-[#0E332E]">Atender habitación {active.numero}</h3>
                                <p className="text-sm mt-2">{cleanText(active.problema)}</p>
                                <form onSubmit={attend} className="space-y-4 mt-5">
                                    <label className="beta-label">
                                        Tipo de avería
                                        <select required value={type} onChange={e => setType(e.target.value)}>
                                            {data.tipos.map((t: any) => (
                                                <option key={t.id_tipo_incidente} value={t.id_tipo_incidente}>
                                                    {cleanText(t.descripcion)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="beta-label">
                                        Prioridad
                                        <select value={priority} onChange={e => setPriority(e.target.value)}>
                                            <option value="1">Alta</option>
                                            <option value="2">Media</option>
                                            <option value="3">Baja</option>
                                        </select>
                                    </label>
                                    <label className="beta-label">
                                        Diagnóstico / trabajo técnico
                                        <textarea required rows={3} maxLength={8000} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                                    </label>
                                    <fieldset className="space-y-2.5">
                                        <legend className="text-xs font-semibold text-[#1C2826] mb-1">
                                            Materiales utilizados (nombre, cantidad entera y + para añadir otro)
                                        </legend>
                                        <datalist id="lista-materiales">
                                            {data.materiales.map((m: any) => (
                                                <option key={m.id_material} value={cleanText(m.nombre_mat)} />
                                            ))}
                                        </datalist>
                                        {materialRows.map((row, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    list="lista-materiales"
                                                    maxLength={50}
                                                    value={row.nombre}
                                                    onChange={e => {
                                                        const next = [...materialRows];
                                                        next[index] = { ...next[index], nombre: e.target.value };
                                                        setMaterialRows(next);
                                                    }}
                                                    placeholder="Nombre del material (ej. Foco LED 12W)"
                                                    className="flex-1"
                                                />
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="1"
                                                    max="999"
                                                    step="1"
                                                    value={row.cantidad}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        const next = [...materialRows];
                                                        next[index] = { ...next[index], cantidad: val };
                                                        setMaterialRows(next);
                                                    }}
                                                    placeholder="Cant."
                                                    aria-label="Cantidad en número entero"
                                                    className="w-24 text-center font-semibold"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setMaterialRows([...materialRows, { nombre: '', cantidad: '1' }])}
                                                    title="Añadir otro material"
                                                    aria-label="Añadir otro material"
                                                    className="p-3 rounded-xl bg-[#0E332E] hover:bg-[#072420] text-[#C2A661] font-bold shrink-0 transition-all"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                                {materialRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMaterialRows(materialRows.filter((_, i) => i !== index))}
                                                        title="Quitar material"
                                                        aria-label="Quitar material"
                                                        className="p-3 rounded-xl bg-[#F8F7F4] hover:bg-red-50 text-[#6F7F7C] hover:text-red-700 border border-[#DDD9CE] shrink-0 transition-all"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </fieldset>
                                    <div className="flex gap-3">
                                        <button disabled={busy} className="beta-primary">
                                            <Wrench size={16} />
                                            {busy ? 'Guardando…' : 'Crear asignación e incidente'}
                                        </button>
                                        <button type="button" disabled={busy} onClick={() => setActive(null)} className="beta-secondary">
                                            Cancelar
                                        </button>
                                    </div>
                                    {error && <p role="alert" className="beta-error">{error}</p>}
                                </form>
                            </section>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}

function Ticket({ s, children }: { s: any; children?: React.ReactNode }) {
    return (
        <article className="rounded-xl border border-[#E6E3DB] bg-[#F8F7F4] p-4 space-y-2">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-2">
                    <strong className="bg-[#0E332E] text-white rounded px-2 py-0.5 text-xs font-bold">
                        Hab. {s.numero}
                    </strong>
                    <span className="text-xs font-medium text-[#4A5C58]">
                        Bloque {s.bloque} · Piso {s.piso}
                    </span>
                </div>
                <span className={'text-[11px] font-semibold px-2 py-0.5 rounded-full ' + (s.resuelto ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
                    {status(s)}
                </span>
            </div>
            <p className="text-xs sm:text-sm text-[#1C2826] whitespace-pre-wrap">{cleanText(s.problema)}</p>
            <p className="text-[11px] text-[#6F7F7C]">
                #{s.id_solicitud} · {cleanText(s.reportado_por)} · {date(s.fecha)} · {s.hora_inicial}
            </p>
            {s.foto && <img className="max-h-48 rounded-lg" src={s.foto} alt={'Evidencia de solicitud ' + s.id_solicitud} />}
            {s.id_incidente && (
                <div className="text-xs space-y-1 border-t border-[#E6E3DB] pt-2 text-[#3A4B48]">
                    <p><strong>Incidente #{s.id_incidente}</strong> · {cleanText(s.tipo_averia)} · Técnico: {cleanText(s.tecnico)}</p>
                    <p className="whitespace-pre-wrap">{cleanText(s.observacion)}</p>
                    <p>Prioridad: {({ 1: 'Alta', 2: 'Media', 3: 'Baja' } as Record<number, string>)[s.nivel_prioridad] || 'Sin definir'}</p>
                    <p>Asignación #{s.id_asignacion} · {date(s.fecha_asignacion)} · {s.hora_asignacion}</p>
                    <p>Materiales: {cleanText(s.materiales) || 'Ninguno'}</p>
                    <p>{s.fecha_fin ? 'Finalizado: ' + date(s.fecha_fin) + ' ' + s.hora_fin : 'En ejecución'}</p>
                </div>
            )}
            {children}
        </article>
    );
}
