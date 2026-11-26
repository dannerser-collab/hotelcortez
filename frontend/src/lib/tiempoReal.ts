// Escucha /api/eventos (Server-Sent Events) con el token en la cabecera.
// Cada aviso trae el "tema" que cambió; quien escucha decide qué refrescar.
import { token } from './api';

export type AvisoCambio = { tema: string; [k: string]: unknown };

export function escucharCambios(alCambio: (a: AvisoCambio) => void, alEstado: (conectado: boolean) => void) {
    let cancelado = false;
    let controlador: AbortController | null = null;

    async function conectar() {
        while (!cancelado) {
            controlador = new AbortController();
            try {
                const r = await fetch('/api/eventos', { headers: { Authorization: 'Bearer ' + token.leer() }, signal: controlador.signal });
                if (!r.ok || !r.body) throw new Error('sin flujo');
                alEstado(true);
                const lector = r.body.pipeThrough(new TextDecoderStream()).getReader();
                let buffer = '';
                for (;;) {
                    const { value, done } = await lector.read();
                    if (done) break;
                    buffer += value;
                    let corte;
                    while ((corte = buffer.indexOf('\n\n')) >= 0) {
                        const bloque = buffer.slice(0, corte);
                        buffer = buffer.slice(corte + 2);
                        const data = bloque.split('\n').find(l => l.startsWith('data: '));
                        if (data) {
                            try {
                                alCambio(JSON.parse(data.slice(6)));
                            } catch {
                                /* aviso ilegible: se ignora */
                            }
                        }
                    }
                }
            } catch {
                /* se reintenta abajo */
            }
            alEstado(false);
            if (!cancelado) await new Promise(r => setTimeout(r, 5000));
        }
    }
    void conectar();
    return () => {
        cancelado = true;
        controlador?.abort();
    };
}
