import React, { useEffect, useRef, useState } from 'react';
import { Bell, Building2, LogOut, Wrench, Send, Camera, PanelLeft, X, Search, Plus } from 'lucide-react';

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
    let response: Response;
    try {
        response = await fetch('/api' + path, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + (sessionStorage.getItem('hc-token') || '')
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(12000)
        });
    } catch (err: any) {
        throw new Error('No se pudo conectar con el servidor Backend (puerto 3000). Asegúrate de que el backend esté iniciado.');
    }

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        if (response.status === 401 && path !== '/auth/login')
            window.dispatchEvent(new Event('hc-expired'));
        
        if (data && data.mensaje) {
            throw new Error(data.mensaje);
        }
        if (!contentType.includes('application/json')) {
            throw new Error('El backend (puerto 3000) no respondió correctamente. Verifica que el servidor Express y MySQL estén activos.');
        }
        throw new Error('No se pudo completar la operación (Error ' + response.status + ').');
    }

    if (data === null) {
        throw new Error('Respuesta inesperada del servidor.');
    }

    return data;
}

const status = (s: any) => s.resuelto ? 'Resuelto' : s.id_incidente ? 'En reparación' : s.tecnico_asignado ? 'Asignada a técnico' : 'Esperando técnico';
const date = (value: string) => value ? String(value).split('T')[0] : '';

// Prioridades: 0 Urgente (ocupada), 1 Alta (reservada), 2 Media / 3 Baja (vacía)
const PRIORIDAD: Record<number, { label: string; cls: string }> = {
    0: { label: 'Urgente', cls: 'bg-red-600 text-white' },
    1: { label: 'Alta', cls: 'bg-orange-500 text-white' },
    2: { label: 'Media', cls: 'bg-[#EAE1CC] text-[#004133]' },
    3: { label: 'Baja', cls: 'bg-slate-200 text-slate-700' }
};
const OCUPACION: Record<string, string> = { VACIA: 'Vacía', OCUPADA: 'Ocupada', RESERVADA: 'Reservada' };
const TURNO: Record<string, string> = { MANANA: 'Mañana (06:00–14:00)', TARDE: 'Tarde (14:00–22:00)', NOCHE: 'Noche (22:00–06:00)' };
const TURNO_CORTO: Record<string, string> = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };
const nivelDe = (s: any) => Number(s.nivel_solicitud ?? 2);
const requiereJefe = (s: any) => nivelDe(s) <= 1;

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
        <div className="min-h-screen bg-[#F6F4EE] text-[#004133]">
            <header className="bg-[#005D4F] text-white px-4 sm:px-8 py-3.5 flex justify-between items-center gap-3 border-b-2 border-[#B9A271] shadow-md">
                <div className="flex gap-4 items-center">
                    <img
                        src="/logo-cortez.png"
                        alt="Hotel Cortéz · Legacy Hotel 5 Estrellas"
                        className="h-11 sm:h-12 w-auto object-contain select-none"
                    />
                    <span className="hidden sm:block h-8 w-px bg-[#B9A271]/50" />
                    <div className="hidden sm:block">
                        <h1 className="font-serif font-semibold text-base tracking-wide text-white">Control de Mantenimiento</h1>
                        <p className="text-[11px] uppercase tracking-widest text-[#B9A271] font-medium">Sistema Operativo CMMS</p>
                    </div>
                </div>
                {user && (
                    <button
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#004133] hover:bg-[#B9A271] text-white border border-[#B9A271]/60 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                        disabled={busy}
                        onClick={logout}
                    >
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                )}
            </header>

            {!user ? (
                <main className="max-w-md mx-auto px-4 py-10 sm:py-16">
                    <section className="bg-white rounded-2xl border border-[#E2DCCE] shadow-lg overflow-hidden">
                        {/* Cabecera oficial con el logo vertical del Hotel Cortéz */}
                        <div className="bg-gradient-to-b from-[#005D4F] to-[#004133] px-6 py-7 flex flex-col items-center text-center border-b-2 border-[#B9A271]">
                            <img
                                src="/logo-cortez-03.png"
                                alt="Hotel Cortéz · Legacy Hotel"
                                className="h-24 w-auto object-contain mb-3 select-none"
                            />
                            <span className="inline-block px-3 py-0.5 rounded-full bg-[#B9A271]/20 border border-[#B9A271]/50 text-[#EAE1CC] text-[10px] font-semibold uppercase tracking-widest">
                                Acceso del Personal · CMMS
                            </span>
                        </div>

                        <div className="p-6 sm:p-7 space-y-5">
                            <div>
                                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#004133]">Bienvenido al Hotel Cortéz</h2>
                                <p className="text-sm mt-1.5 text-[#546A64]">Ingresa tus credenciales para acceder a tu área de trabajo.</p>
                            </div>
                            <form onSubmit={login} className="space-y-4">
                                <label className="beta-label">
                                    ID de empleado
                                    <input autoComplete="username" inputMode="numeric" required value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="Ej: 1, 2 o 3" />
                                </label>
                                <label className="beta-label">
                                    Contraseña
                                    <input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                                </label>
                                {error && <p role="alert" className="beta-error">{error}</p>}
                                <button className="beta-primary w-full" disabled={busy}>
                                    {busy ? 'Verificando…' : 'Iniciar sesión'}
                                </button>
                            </form>
                        </div>
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
    const [tab, setTab] = useState('asignar'), [search, setSearch] = useState(''), [floor, setFloor] = useState(''), [onlyFaults, setOnlyFaults] = useState(false), [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [room, setRoom] = useState(''), [problem, setProblem] = useState(''), [photo, setPhoto] = useState('');
    const [ocupacion, setOcupacion] = useState(''), [nivelVacia, setNivelVacia] = useState('2');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [active, setActive] = useState<any>(null), [type, setType] = useState(''), [priority, setPriority] = useState('2'), [diagnosis, setDiagnosis] = useState('');
    const [materialRows, setMaterialRows] = useState<{ nombre: string; cantidad: string }[]>([{ nombre: '', cantidad: '1' }]);
    const lastId = useRef<number | null>(null), mounted = useRef(true), loading = useRef(false);
    const lastAssigned = useRef<Set<number> | null>(null);
    const nivelCalculado = ocupacion === 'OCUPADA' ? 0 : ocupacion === 'RESERVADA' ? 1 : ocupacion === 'VACIA' ? Number(nivelVacia) : null;

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
            if (user.rol === 'TECNICO') {
                const mine = d.solicitudes.filter((s: any) => s.tecnico_asignado === user.id_empleado && !s.id_incidente);
                const ids = new Set<number>(mine.map((s: any) => s.id_solicitud));
                if (lastAssigned.current) {
                    const nuevas = mine.filter((s: any) => !lastAssigned.current!.has(s.id_solicitud));
                    if (nuevas.length)
                        setNotice('El jefe de mantenimiento te asignó: ' + nuevas.map((s: any) => `Hab. ${s.numero} (${PRIORIDAD[nivelDe(s)]?.label})`).join(' · '));
                }
                lastAssigned.current = ids;
            }
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
        if (!ocupacion) {
            setError('Indica si la habitación está vacía, ocupada o reservada.');
            return;
        }
        const etiqueta = PRIORIDAD[nivelCalculado ?? 2].label;
        if (await action('/mucama/reportar', { numero_habitacion: cleanRoomNumber, problema: problem, foto: photo, ocupacion, nivel_vacia: nivelVacia }, 'POST', `Solicitud enviada para Hab. ${cleanRoomNumber} (Bloque ${bloqueDetectado}) con prioridad ${etiqueta}.`)) {
            setRoom('');
            setProblem('');
            setPhoto('');
            setOcupacion('');
            setNivelVacia('2');
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
    // Técnico y supervisor: pendientes primero, ordenadas Urgente → Alta → Media → Baja
    if (user.rol !== 'MUCAMA')
        filtered.sort((a: any, b: any) => (Number(!!a.resuelto) - Number(!!b.resuelto)) || (nivelDe(a) - nivelDe(b)) || (b.id_solicitud - a.id_solicitud));
    const miTurno = data?.tecnicos?.find((t: any) => t.id_empleado === user.id_empleado)?.turno;

    const fullName = cleanText(`${user.nombre} ${user.apellido}`);

    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 relative">
            {/* Banner de usuario con los colores oficiales del Hotel Cortéz (#004133 / #005D4F / #B9A271) */}
            <section className="bg-gradient-to-r from-[#004133] to-[#005D4F] text-white rounded-2xl p-5 flex flex-wrap justify-between gap-4 items-center shadow-md border border-[#B9A271]/50">
                <div className="flex items-center gap-3.5">
                    {user.rol === 'MUCAMA' && (
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(prev => !prev)}
                            title={sidebarOpen ? 'Ocultar historial de solicitudes' : 'Mostrar historial de solicitudes'}
                            aria-label="Alternar barra lateral de historial"
                            className="relative p-2.5 rounded-xl bg-[#005D4F] hover:bg-[#004133] text-[#B9A271] border border-[#B9A271]/60 transition-all shadow-sm"
                        >
                            <PanelLeft size={22} strokeWidth={2} />
                            {solicitudes.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#B9A271] text-[#004133] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    {solicitudes.length}
                                </span>
                            )}
                        </button>
                    )}
                    <div>
                        <p className="text-[#B9A271] text-xs font-semibold uppercase tracking-wider">{labels[user.rol]}</p>
                        <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">{fullName}</h2>
                        <p className="text-xs text-[#C7D9D4] mt-0.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#61CE70] inline-block" />
                            <span>ID {user.id_empleado} · Sincronizado en tiempo real</span>
                        </p>
                        {user.rol === 'TECNICO' && miTurno && (
                            <p className="text-xs mt-1 text-[#EAE1CC]">
                                Tu turno: <strong>{TURNO[miTurno]}</strong>
                                {data?.turno_actual === miTurno ? ' · De turno ahora' : ' · Fuera de turno'}
                            </p>
                        )}
                    </div>
                </div>

                {user.rol === 'MUCAMA' && (
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(prev => !prev)}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#B9A271] hover:bg-[#A38B58] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
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
                                className={`fixed lg:static top-0 left-0 z-50 lg:z-auto h-full lg:h-auto bg-white border border-[#E2DCCE] rounded-r-2xl lg:rounded-2xl shadow-2xl lg:shadow-sm transition-all duration-300 overflow-hidden shrink-0 ${
                                    sidebarOpen
                                        ? 'w-80 sm:w-96 p-5 opacity-100 translate-x-0'
                                        : 'w-0 p-0 opacity-0 -translate-x-full lg:translate-x-0 border-0 pointer-events-none'
                                }`}
                            >
                                <div className="space-y-4 w-72 sm:w-80">
                                    <div className="flex items-center justify-between pb-3 border-b border-[#E2DCCE]">
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setSidebarOpen(false)}
                                                className="p-1.5 rounded-lg bg-[#FAF8F4] hover:bg-[#EDE8DC] text-[#005D4F]"
                                                title="Ocultar barra lateral"
                                            >
                                                <PanelLeft size={18} />
                                            </button>
                                            <div>
                                                <h3 className="font-sans text-base font-bold text-[#004133]">Mis solicitudes</h3>
                                                <p className="text-[11px] text-[#546A64]">{solicitudes.length} registradas en total</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSidebarOpen(false)}
                                            className="p-1.5 rounded-lg text-[#546A64] hover:text-[#004133] hover:bg-[#FAF8F4]"
                                            aria-label="Cerrar historial"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Buscador rápido en la barra lateral */}
                                    <div className="relative flex items-center">
                                        <Search size={15} className="absolute left-3.5 text-[#546A64] pointer-events-none" />
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
                                            <p className="text-xs text-[#546A64] py-6 text-center">No hay solicitudes para mostrar.</p>
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
                                        <h3 className="font-sans text-2xl font-bold text-[#004133]">Registrar solicitud de habitación</h3>
                                        <p className="text-xs text-[#546A64] mt-1">
                                            Escribe únicamente el número de la habitación. El bloque y piso se calculan de forma automática.
                                        </p>
                                    </div>
                                    {!sidebarOpen && (
                                        <button
                                            type="button"
                                            onClick={() => setSidebarOpen(true)}
                                            className="p-2.5 rounded-xl bg-[#FAF8F4] hover:bg-[#EDE8DC] border border-[#D8D0BE] text-[#005D4F] shrink-0"
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
                                                    className="text-lg font-bold tracking-wider text-[#004133] sm:w-48"
                                                />

                                                {/* Indicador automático de Bloque y Piso */}
                                                {bloqueDetectado ? (
                                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#005D4F] text-white border border-[#B9A271]">
                                                        <Building2 size={20} className="text-[#B9A271] shrink-0" />
                                                        <div className="text-xs">
                                                            <span className="text-[#B9A271] font-bold block">
                                                                Hab. {cleanRoomNumber} → Bloque {bloqueDetectado}
                                                            </span>
                                                            <span className="text-[#C7D9D4]">
                                                                Piso {pisoDetectado} detectado automáticamente
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 px-4 py-3 rounded-xl bg-[#FAF8F4] border border-dashed border-[#D8D0BE] text-xs text-[#546A64]">
                                                        Escribe el nro. de habitación (ej. <strong>134</strong> → Bloque 100, <strong>423</strong> → Bloque 400)
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    {/* Estado de la habitación -> prioridad automática */}
                                    <fieldset className="space-y-2.5">
                                        <legend className="text-xs font-semibold text-[#004133] mb-1">Estado actual de la habitación</legend>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                ['VACIA', 'Vacía', 'Media / Baja'],
                                                ['RESERVADA', 'Reservada', 'Alta'],
                                                ['OCUPADA', 'Ocupada', 'Urgente']
                                            ].map(([value, label, hint]) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setOcupacion(value)}
                                                    aria-pressed={ocupacion === value}
                                                    className={'rounded-xl border px-3 py-3 text-left transition-colors ' + (ocupacion === value
                                                        ? 'bg-[#005D4F] text-white border-[#B9A271] shadow-sm'
                                                        : 'bg-[#FAF8F4] text-[#004133] border-[#D8D0BE] hover:border-[#B9A271]')}
                                                >
                                                    <span className="block text-sm font-bold">{label}</span>
                                                    <span className={'block text-[11px] ' + (ocupacion === value ? 'text-[#EAE1CC]' : 'text-[#546A64]')}>Prioridad {hint}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {ocupacion === 'VACIA' && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-semibold text-[#004133]">Prioridad:</span>
                                                {[['2', 'Media'], ['3', 'Baja']].map(([v, l]) => (
                                                    <button
                                                        key={v}
                                                        type="button"
                                                        onClick={() => setNivelVacia(v)}
                                                        className={'px-3 py-1.5 rounded-lg border font-semibold ' + (nivelVacia === v ? 'bg-[#B9A271] text-white border-[#B9A271]' : 'bg-white text-[#004133] border-[#D8D0BE]')}
                                                    >
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {nivelCalculado !== null && (
                                            <div className="flex items-start gap-2 rounded-xl bg-[#FAF8F4] border border-[#E2DCCE] p-3 text-xs text-[#004133]">
                                                <span className={'shrink-0 px-2 py-0.5 rounded-full font-bold ' + PRIORIDAD[nivelCalculado].cls}>
                                                    {PRIORIDAD[nivelCalculado].label}
                                                </span>
                                                <span>
                                                    {nivelCalculado <= 1
                                                        ? 'El jefe de mantenimiento asignará esta solicitud al técnico de turno.'
                                                        : 'El técnico de turno podrá tomar esta solicitud directamente.'}
                                                </span>
                                            </div>
                                        )}
                                    </fieldset>

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

                                    <button className="beta-primary w-full" disabled={busy || !cleanRoomNumber || !problem.trim() || !ocupacion}>
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
                                    <section key={label} className="beta-card border-t-4 border-t-[#B9A271]">
                                        <p className="text-xs text-[#546A64]">{label}</p>
                                        <strong className="font-serif text-3xl text-[#004133]">{value}</strong>
                                    </section>
                                ))}
                            </div>
                            <nav className="flex flex-wrap gap-2">
                                {[
                                    ['asignar', 'Asignar a técnicos'],
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

                    {user.rol === 'SUPERVISOR' && tab === 'asignar' ? (
                        <AsignarPanel data={data} busy={busy} action={action} />
                    ) : user.rol === 'SUPERVISOR' && tab === 'habitaciones' ? (
                        <section className="beta-card space-y-4">
                            <h3 className="font-serif text-2xl text-[#004133] font-bold">Asignar habitaciones a Gobernanza</h3>
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
                            <h3 className="font-serif text-2xl text-[#004133] font-bold">Rack y monitor de habitaciones</h3>
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
                                            className={'text-left rounded-xl border p-4 transition-colors ' + (h.estado ? 'bg-white border-[#E2DCCE] hover:border-[#B9A271]' : 'bg-[#005D4F] text-white border-[#B9A271]')}
                                        >
                                            <Building2 size={18} className="text-[#B9A271]" />
                                            <strong className="font-serif text-2xl">{h.numero}</strong>
                                            <p className="text-xs">Bloque {h.bloque} · Piso {h.piso}</p>
                                            <p className="text-xs mt-2">{h.estado ? 'Operativa' : 'Mantenimiento'}</p>
                                        </button>
                                    ))}
                            </div>
                            {selectedRoom && (
                                <section className="rounded-xl bg-[#FAF8F4] border border-[#E2DCCE] p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-[#004133]">Historial · Hab {selectedRoom.numero}</h4>
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
                                <h3 className="font-serif text-2xl font-bold text-[#004133]">
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
                                <p className="text-sm text-[#546A64]">No hay registros para mostrar.</p>
                            )}
                            {filtered
                                .filter((s: any) => user.rol !== 'SUPERVISOR' || tab === 'solicitudes' || s.id_incidente)
                                .map((s: any) => (
                                    <Ticket key={s.id_solicitud} s={s}>
                                        {user.rol === 'TECNICO' && !s.resuelto && (
                                            !s.id_incidente ? (
                                                s.tecnico_asignado && s.tecnico_asignado !== user.id_empleado ? (
                                                    <p className="text-xs text-[#546A64]">Asignada por el jefe a {cleanText(s.tecnico_asignado_nombre)}</p>
                                                ) : requiereJefe(s) && s.tecnico_asignado !== user.id_empleado ? (
                                                    <p className="text-xs font-semibold text-orange-700">
                                                        Prioridad {PRIORIDAD[nivelDe(s)].label}: esperando que el jefe de mantenimiento la asigne.
                                                    </p>
                                                ) : (
                                                <button
                                                    className="beta-primary"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        setActive(s);
                                                        setType(String(data.tipos[0]?.id_tipo_incidente || ''));
                                                        setPriority(String(nivelDe(s)));
                                                        setDiagnosis('');
                                                        setMaterialRows([{ nombre: '', cantidad: '1' }]);
                                                    }}
                                                >
                                                    {s.tecnico_asignado === user.id_empleado ? 'Atender tarea asignada' : 'Tomar y atender solicitud'}
                                                </button>
                                                )
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
                                <h3 className="font-serif text-2xl font-bold text-[#004133]">Atender habitación {active.numero}</h3>
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
                                        {requiereJefe(active) ? (
                                            <span className="flex items-center gap-2 text-xs font-normal">
                                                <span className={'px-2 py-0.5 rounded-full font-bold ' + PRIORIDAD[nivelDe(active)].cls}>{PRIORIDAD[nivelDe(active)].label}</span>
                                                Definida por el estado de la habitación ({OCUPACION[active.ocupacion] || 'sin dato'}).
                                            </span>
                                        ) : (
                                            <select value={priority} onChange={e => setPriority(e.target.value)}>
                                                <option value="2">Media</option>
                                                <option value="3">Baja</option>
                                            </select>
                                        )}
                                    </label>
                                    <label className="beta-label">
                                        Diagnóstico / trabajo técnico
                                        <textarea required rows={3} maxLength={8000} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                                    </label>
                                    <fieldset className="space-y-2.5">
                                        <legend className="text-xs font-semibold text-[#004133] mb-1">
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
                                                    className="p-3 rounded-xl bg-[#005D4F] hover:bg-[#004133] text-[#B9A271] font-bold shrink-0 transition-all"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                                {materialRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMaterialRows(materialRows.filter((_, i) => i !== index))}
                                                        title="Quitar material"
                                                        aria-label="Quitar material"
                                                        className="p-3 rounded-xl bg-[#FAF8F4] hover:bg-red-50 text-[#546A64] hover:text-red-700 border border-[#D8D0BE] shrink-0 transition-all"
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
        <article className="rounded-xl border border-[#E2DCCE] bg-[#FAF8F4] p-4 space-y-2">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-2">
                    <strong className="bg-[#005D4F] text-white border border-[#B9A271]/50 rounded px-2 py-0.5 text-xs font-bold">
                        Hab. {s.numero}
                    </strong>
                    <span className="text-xs font-medium text-[#546A64]">
                        Bloque {s.bloque} · Piso {s.piso}{s.ocupacion ? ' · ' + OCUPACION[s.ocupacion] : ''}
                    </span>
                    <span className={'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ' + (PRIORIDAD[nivelDe(s)]?.cls || '')}>
                        {PRIORIDAD[nivelDe(s)]?.label}
                    </span>
                </div>
                <span className={'text-[11px] font-semibold px-2 py-0.5 rounded-full ' + (s.resuelto ? 'bg-green-100 text-green-800' : 'bg-[#EAE1CC] text-[#004133]')}>
                    {status(s)}
                </span>
            </div>
            <p className="text-xs sm:text-sm text-[#004133] whitespace-pre-wrap">{cleanText(s.problema)}</p>
            <p className="text-[11px] text-[#546A64]">
                #{s.id_solicitud} · {cleanText(s.reportado_por)} · {date(s.fecha)} · {s.hora_inicial}
            </p>
            {s.foto && <img className="max-h-48 rounded-lg" src={s.foto} alt={'Evidencia de solicitud ' + s.id_solicitud} />}
            {s.tecnico_asignado && !s.id_incidente && (
                <p className="text-[11px] text-[#004133]">
                    Asignada a <strong>{cleanText(s.tecnico_asignado_nombre)}</strong> por {cleanText(s.asignado_por_nombre)}
                </p>
            )}
            {s.id_incidente && (
                <div className="text-xs space-y-1 border-t border-[#E2DCCE] pt-2 text-[#004133]/90">
                    <p><strong>Incidente #{s.id_incidente}</strong> · {cleanText(s.tipo_averia)} · Técnico: {cleanText(s.tecnico)}</p>
                    <p className="whitespace-pre-wrap">{cleanText(s.observacion)}</p>
                    <p>Prioridad: {PRIORIDAD[s.nivel_prioridad]?.label || 'Sin definir'}</p>
                    <p>Asignación #{s.id_asignacion} · {date(s.fecha_asignacion)} · {s.hora_asignacion}</p>
                    <p>Materiales: {cleanText(s.materiales) || 'Ninguno'}</p>
                    <p>{s.fecha_fin ? 'Finalizado: ' + date(s.fecha_fin) + ' ' + s.hora_fin : 'En ejecución'}</p>
                </div>
            )}
            {children}
        </article>
    );
}


// Panel del jefe de mantenimiento: asigna solicitudes al técnico de turno y gestiona los turnos
function AsignarPanel({ data, busy, action }: { data: any; busy: boolean; action: (path: string, body: any, method: string, success: string) => Promise<boolean> }) {
    const tecnicos: any[] = data.tecnicos || [];
    const turnoActual: string = data.turno_actual;
    const deTurno = tecnicos.filter(t => t.turno === turnoActual);
    const pendientes = (data.solicitudes || [])
        .filter((s: any) => !s.id_incidente && !s.resuelto)
        .sort((a: any, b: any) => (nivelDe(a) - nivelDe(b)) || (a.id_solicitud - b.id_solicitud));
    const [seleccion, setSeleccion] = useState<Record<number, string>>({});

    // Sugerencia: técnico de turno con menos trabajos activos
    const sugerido = [...deTurno].sort((a, b) => Number(a.activos) - Number(b.activos))[0];

    return (
        <div className="grid lg:grid-cols-3 gap-5 items-start">
            <section className="beta-card space-y-4 lg:col-span-2">
                <div>
                    <h3 className="font-serif text-2xl font-bold text-[#004133]">Solicitudes por asignar</h3>
                    <p className="text-xs text-[#546A64] mt-1">
                        Urgente (habitación ocupada) y Alta (reservada) solo pueden ser asignadas por el jefe de mantenimiento.
                        Media y Baja también pueden ser tomadas por el técnico de turno.
                    </p>
                </div>
                {pendientes.length === 0 && <p className="text-sm text-[#546A64]">No hay solicitudes pendientes de asignación.</p>}
                {pendientes.map((s: any) => {
                    const valor = seleccion[s.id_solicitud] ?? String(s.tecnico_asignado || sugerido?.id_empleado || '');
                    return (
                        <Ticket key={s.id_solicitud} s={s}>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <select
                                    className="flex-1 min-w-[220px] !py-2"
                                    value={valor}
                                    onChange={e => setSeleccion({ ...seleccion, [s.id_solicitud]: e.target.value })}
                                    aria-label="Técnico a asignar"
                                >
                                    <option value="" disabled>Selecciona un técnico</option>
                                    {['MANANA', 'TARDE', 'NOCHE'].map(turno => {
                                        const grupo = tecnicos.filter(t => t.turno === turno);
                                        if (!grupo.length) return null;
                                        return (
                                            <optgroup key={turno} label={'Turno ' + TURNO_CORTO[turno] + (turno === turnoActual ? ' (de turno ahora)' : '')}>
                                                {grupo.map(t => (
                                                    <option key={t.id_empleado} value={t.id_empleado}>
                                                        {cleanText(t.nombre)} {cleanText(t.apellido)} · {t.activos} activo(s)
                                                    </option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}
                                </select>
                                <button
                                    className={requiereJefe(s) ? 'beta-gold' : 'beta-primary'}
                                    disabled={busy || !valor}
                                    onClick={() => void action('/supervisor/asignar-tecnico', { id_solicitud: s.id_solicitud, id_empleado: Number(valor) }, 'POST', `Hab. ${s.numero} asignada al técnico.`)}
                                >
                                    {s.tecnico_asignado ? 'Reasignar' : 'Asignar'}
                                </button>
                            </div>
                        </Ticket>
                    );
                })}
            </section>

            <section className="beta-card space-y-4">
                <div>
                    <h3 className="font-serif text-xl font-bold text-[#004133]">Turnos de técnicos</h3>
                    <p className="text-xs text-[#546A64] mt-1">
                        Turno actual: <strong className="text-[#004133]">{TURNO[turnoActual]}</strong>
                    </p>
                </div>
                {tecnicos.map(t => (
                    <label key={t.id_empleado} className="beta-label">
                        <span className="flex items-center justify-between">
                            <span>{cleanText(t.nombre)} {cleanText(t.apellido)}</span>
                            {t.turno === turnoActual && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#61CE70]/20 text-[#1f7a3a]">De turno</span>
                            )}
                        </span>
                        <select
                            disabled={busy}
                            value={t.turno}
                            onChange={e => void action('/supervisor/turno', { id_empleado: t.id_empleado, turno: e.target.value }, 'POST', 'Turno actualizado.')}
                        >
                            {Object.entries(TURNO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </label>
                ))}
            </section>
        </div>
    );
}
