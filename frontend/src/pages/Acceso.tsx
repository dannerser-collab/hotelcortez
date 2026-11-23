// Inicio de sesión y solicitud de acceso (diseño "Inicio de sesión" y "Registro").
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useSesion } from '../hooks/sesion';
import { Boton, Campo, Segmentado } from '../components/ui';
import type { CodigoTurno, Rol } from '../types';

export default function Acceso() {
    const [modo, setModo] = useState<'ingresar' | 'registro'>('ingresar');
    return (
        <div className="min-h-screen bg-hotel-cream flex items-center justify-center p-4 sm:p-8">
            <section className="w-full max-w-lg bg-white rounded-2xl border border-[#E2DCCE] shadow-lg overflow-hidden">
                <div className="bg-gradient-to-b from-hotel-primary to-hotel-dark px-6 py-7 flex flex-col items-center text-center border-b-2 border-hotel-accent">
                    <img src="/logo-cortez-03.png" alt="Hotel Cortéz · Legacy Hotel" className="h-24 w-auto object-contain mb-3 select-none" />
                    <span className="inline-block px-3 py-0.5 rounded-full bg-hotel-accent/20 border border-hotel-accent/50 text-[#EAE1CC] text-[10px] font-semibold uppercase tracking-widest">
                        Gestión de incidentes · Personal
                    </span>
                </div>
                <div className="p-6 sm:p-8">
                    {modo === 'ingresar' ? <Ingresar irARegistro={() => setModo('registro')} /> : <Registro irAIngresar={() => setModo('ingresar')} />}
                </div>
            </section>
        </div>
    );
}

function Ingresar({ irARegistro }: { irARegistro: () => void }) {
    const { entrar, aviso } = useSesion();
    const [codigo, setCodigo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    async function enviar(e: FormEvent) {
        e.preventDefault();
        setCargando(true);
        setError('');
        try {
            await entrar(codigo, password);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setCargando(false);
        }
    }

    return (
        <form onSubmit={enviar} className="space-y-4">
            <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-hotel-dark">Ingresar</h1>
                <p className="text-sm mt-1 text-hotel-textMuted">Usa tu código de empleado y tu contraseña.</p>
            </div>
            {aviso && !error && <p className="rounded-xl bg-[#FFFBEA] border border-[#EBD27A] p-3 text-sm text-amber-900">{aviso}</p>}
            <Campo etiqueta="Código de empleado" ayuda="Ejemplo: E-0001 (también puedes escribir solo el número).">
                <input
                    autoComplete="username"
                    required
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                    placeholder="E-0001"
                    autoCapitalize="characters"
                />
            </Campo>
            <Campo etiqueta="Contraseña">
                <input
                    autoComplete="current-password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </Campo>
            {error && (
                <p role="alert" className="beta-error">
                    {error}
                </p>
            )}
            <Boton className="w-full" cargando={cargando}>
                {cargando ? 'Verificando…' : 'Ingresar'}
            </Boton>
            <p className="text-center text-sm text-hotel-textMuted">
                ¿Aún no tienes acceso?{' '}
                <button type="button" onClick={irARegistro} className="font-semibold text-hotel-primary underline-offset-2 hover:underline">
                    Solicitar acceso
                </button>
            </p>
        </form>
    );
}

function Registro({ irAIngresar }: { irAIngresar: () => void }) {
    const [d, setD] = useState({ nombre: '', apellido: '', telefono: '', ci: '', password: '' });
    const [rol, setRol] = useState<Rol>('MUCAMA');
    const [turno, setTurno] = useState<CodigoTurno>('MANANA');
    const [error, setError] = useState('');
    const [listo, setListo] = useState('');
    const [cargando, setCargando] = useState(false);
    const campo = (k: keyof typeof d) => ({ value: d[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value }) });

    async function enviar(e: FormEvent) {
        e.preventDefault();
        setCargando(true);
        setError('');
        try {
            const r = await api<{ codigo: string }>('/auth/registro', { cuerpo: { ...d, rol, turno } });
            setListo(r.codigo);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setCargando(false);
        }
    }

    if (listo)
        return (
            <div className="space-y-4 text-center">
                <h1 className="font-serif text-2xl font-bold text-hotel-dark">Solicitud enviada</h1>
                <p className="text-sm text-hotel-textMuted">Tu código de empleado es:</p>
                <p className="text-3xl font-bold tracking-wider text-hotel-primary">{listo}</p>
                <p className="text-sm text-hotel-textMuted">Anótalo. Podrás ingresar cuando el supervisor apruebe tu acceso.</p>
                <Boton className="w-full" onClick={irAIngresar}>
                    Ir a ingresar
                </Boton>
            </div>
        );

    return (
        <form onSubmit={enviar} className="space-y-4">
            <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-hotel-dark">Solicitar acceso</h1>
                <p className="text-sm mt-1 text-hotel-textMuted">El supervisor revisará tus datos antes de activar la cuenta.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                <Campo etiqueta="Nombre">
                    <input required maxLength={60} autoComplete="given-name" {...campo('nombre')} />
                </Campo>
                <Campo etiqueta="Apellido">
                    <input required maxLength={60} autoComplete="family-name" {...campo('apellido')} />
                </Campo>
                <Campo etiqueta="Teléfono">
                    <input required inputMode="tel" autoComplete="tel" pattern="\+?\d{6,15}" {...campo('telefono')} />
                </Campo>
                <Campo etiqueta="CI">
                    <input required maxLength={15} {...campo('ci')} />
                </Campo>
            </div>
            <div className="beta-label">
                <span>Cargo</span>
                <Segmentado
                    etiqueta="Cargo"
                    valor={rol}
                    onChange={setRol}
                    opciones={[
                        { valor: 'MUCAMA', texto: 'Mucama' },
                        { valor: 'TECNICO', texto: 'Técnico' },
                        { valor: 'SUPERVISOR', texto: 'Supervisor' }
                    ]}
                />
            </div>
            <div className="beta-label">
                <span>Turno</span>
                <Segmentado
                    etiqueta="Turno"
                    valor={turno}
                    onChange={setTurno}
                    opciones={[
                        { valor: 'MANANA', texto: 'Mañana' },
                        { valor: 'TARDE', texto: 'Tarde' },
                        { valor: 'NOCHE', texto: 'Noche' }
                    ]}
                />
            </div>
            <Campo etiqueta="Contraseña" ayuda="Mínimo 6 caracteres.">
                <input required type="password" minLength={6} autoComplete="new-password" {...campo('password')} />
            </Campo>
            {error && (
                <p role="alert" className="beta-error">
                    {error}
                </p>
            )}
            <Boton className="w-full" cargando={cargando}>
                Solicitar acceso
            </Boton>
            <p className="text-center text-sm text-hotel-textMuted">
                ¿Ya tienes acceso?{' '}
                <button type="button" onClick={irAIngresar} className="font-semibold text-hotel-primary hover:underline">
                    Ingresar
                </button>
            </p>
        </form>
    );
}
