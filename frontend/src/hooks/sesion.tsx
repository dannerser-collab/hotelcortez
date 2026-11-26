import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, token } from '../lib/api';
import type { Usuario } from '../types';

type Sesion = {
    usuario: Usuario | null;
    cargando: boolean;
    aviso: string;
    entrar: (codigo: string, password: string) => Promise<void>;
    salir: () => Promise<void>;
    actualizar: () => Promise<void>;
};

const Ctx = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [cargando, setCargando] = useState(Boolean(token.leer()));
    const [aviso, setAviso] = useState('');
    const qc = useQueryClient();

    useEffect(() => {
        const expirada = () => {
            token.borrar();
            setUsuario(null);
            qc.clear();
            setAviso('Tu sesión terminó. Vuelve a ingresar.');
        };
        window.addEventListener('hc-sesion-expirada', expirada);
        if (token.leer())
            api<{ usuario: Usuario }>('/auth/yo')
                .then(r => setUsuario(r.usuario))
                .catch(e => setAviso(e.status === 401 ? '' : e.message))
                .finally(() => setCargando(false));
        return () => window.removeEventListener('hc-sesion-expirada', expirada);
    }, [qc]);

    const valor: Sesion = {
        usuario,
        cargando,
        aviso,
        async entrar(codigo, password) {
            const r = await api<{ token: string; usuario: Usuario }>('/auth/login', { cuerpo: { codigo, password } });
            token.guardar(r.token);
            setAviso('');
            qc.clear();
            setUsuario(r.usuario);
        },
        async salir() {
            await api('/auth/logout', { cuerpo: {} }).catch(() => undefined);
            token.borrar();
            qc.clear();
            setUsuario(null);
        },
        async actualizar() {
            const r = await api<{ usuario: Usuario }>('/auth/yo');
            setUsuario(r.usuario);
        }
    };
    return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion() {
    const s = useContext(Ctx);
    if (!s) throw new Error('useSesion fuera de ProveedorSesion');
    return s;
}

/** Usuario garantizado (para páginas dentro del área autenticada). */
export function useUsuario(): Usuario {
    const { usuario } = useSesion();
    if (!usuario) throw new Error('Sin sesión');
    return usuario;
}
