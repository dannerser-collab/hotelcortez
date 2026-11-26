// PWA: service worker (instalación y caché básica) y notificaciones push.
// El navegador solo permite ambos en HTTPS o en localhost.
import { useEffect } from 'react';
import { api } from './api';
import { useCatalogos } from '../hooks/datos';

export function registrarServiceWorker() {
    if ('serviceWorker' in navigator && window.isSecureContext && import.meta.env.PROD)
        window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}

export const pushDisponible = () => 'serviceWorker' in navigator && 'PushManager' in window && window.isSecureContext;

function claveBytes(base64: string) {
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/** Suscribe este dispositivo si el usuario ya dio permiso (no pregunta por sí solo). */
export function useNotificacionesPush() {
    const { data } = useCatalogos();
    useEffect(() => {
        if (!data?.push || !pushDisponible() || Notification.permission !== 'granted') return;
        void suscribir(data.push).catch(() => undefined);
    }, [data?.push]);
}

export async function suscribir(clavePublica: string) {
    const reg = await navigator.serviceWorker.ready;
    const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBytes(clavePublica) }));
    await api('/push/suscribir', { cuerpo: sub.toJSON() });
}

/** Pide permiso y suscribe. Llamar desde un botón (los navegadores lo exigen). */
export async function activarNotificaciones(clavePublica: string | null) {
    if (!clavePublica) throw new Error('Las notificaciones no están configuradas en el servidor.');
    if (!pushDisponible()) throw new Error('Este navegador solo permite notificaciones si el sistema se abre por HTTPS.');
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('No se concedió el permiso de notificaciones.');
    await suscribir(clavePublica);
}
