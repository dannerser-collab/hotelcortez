// Avisos en tiempo real por Server-Sent Events (SSE).
// Cada cambio emite el nombre de lo que cambió; el frontend vuelve a pedir solo eso.
import type { Response } from 'express';
import type { Usuario } from '../modules/auth/auth.js';

export type Tema = 'solicitudes' | 'habitaciones' | 'personal' | 'catalogos' | 'modificaciones';

type Cliente = { res: Response; usuario: Usuario };
const clientes = new Set<Cliente>();

export function conectar(res: Response, usuario: Usuario) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.write('retry: 5000\n\n');
    const cliente = { res, usuario };
    clientes.add(cliente);
    const latido = setInterval(() => res.write(': latido\n\n'), 25000);
    res.on('close', () => {
        clearInterval(latido);
        clientes.delete(cliente);
    });
}

/** Notifica a los clientes conectados. `para` filtra destinatarios (por defecto, todos). */
export function avisar(tema: Tema, datos: Record<string, unknown> = {}, para?: (u: Usuario) => boolean) {
    const msg = `event: cambio\ndata: ${JSON.stringify({ tema, ...datos })}\n\n`;
    for (const c of clientes) if (!para || para(c.usuario)) c.res.write(msg);
}

export function clientesConectados() {
    return clientes.size;
}
