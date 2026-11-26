// Cliente HTTP único. Toda llamada a la API pasa por aquí.
const CLAVE_TOKEN = 'hc-token';

export const token = {
    leer: () => localStorage.getItem(CLAVE_TOKEN) || '',
    guardar: (t: string) => localStorage.setItem(CLAVE_TOKEN, t),
    borrar: () => localStorage.removeItem(CLAVE_TOKEN)
};

export class ErrorApi extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
    }
}

export async function api<T = any>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; señal?: AbortSignal } = {}): Promise<T> {
    const metodo = opciones.metodo || (opciones.cuerpo !== undefined ? 'POST' : 'GET');
    let r: Response;
    try {
        r = await fetch('/api' + ruta, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', ...(token.leer() ? { Authorization: 'Bearer ' + token.leer() } : {}) },
            body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
            signal: opciones.señal ?? AbortSignal.timeout(15000)
        });
    } catch {
        throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa la red o que el sistema esté iniciado.');
    }
    const json = (r.headers.get('content-type') || '').includes('application/json') ? await r.json().catch(() => null) : null;
    if (!r.ok) {
        if (r.status === 401 && !ruta.startsWith('/auth/login')) window.dispatchEvent(new Event('hc-sesion-expirada'));
        throw new ErrorApi(r.status, json?.mensaje || `El servidor respondió con error ${r.status}.`);
    }
    return json as T;
}

/** Descarga un archivo de la API (con la sesión actual) y lo guarda en el equipo. */
export async function descargar(ruta: string, nombrePorDefecto: string) {
    let r: Response;
    try {
        r = await fetch('/api' + ruta, { headers: token.leer() ? { Authorization: 'Bearer ' + token.leer() } : {}, signal: AbortSignal.timeout(60000) });
    } catch {
        throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa la red o que el sistema esté iniciado.');
    }
    if (!r.ok) {
        const json = await r.json().catch(() => null);
        if (r.status === 401) window.dispatchEvent(new Event('hc-sesion-expirada'));
        throw new ErrorApi(r.status, json?.mensaje || `El servidor respondió con error ${r.status}.`);
    }
    const nombre = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') || '')?.[1] || nombrePorDefecto;
    const url = URL.createObjectURL(await r.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** URL de query string sin valores vacíos. */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v === true ? 1 : v));
    const s = p.toString();
    return s ? '?' + s : '';
}
