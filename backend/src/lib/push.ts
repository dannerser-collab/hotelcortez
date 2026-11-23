// Notificaciones push (llegan aunque la app esté cerrada).
// Requiere VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en .env y que la app se abra por HTTPS
// (o localhost). Sin claves, las funciones no hacen nada.
import * as webpush from 'web-push';
import { env } from '../config/env.js';
import { filas, ejecutar } from '../db/pool.js';

export const pushActivo = Boolean(env.vapid.publica && env.vapid.privada);
if (pushActivo) webpush.setVapidDetails(env.vapid.contacto, env.vapid.publica, env.vapid.privada);

export async function enviarPush(idEmpleados: number[], titulo: string, cuerpo: string, url = '/') {
    if (!pushActivo || !idEmpleados.length) return;
    const subs = await filas('SELECT * FROM push_suscripcion WHERE id_empleado IN (?)', [idEmpleados]);
    await Promise.all(
        subs.map(s =>
            webpush
                .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ titulo, cuerpo, url }))
                .catch(async (e: any) => {
                    // 404/410: la suscripción ya no existe en el navegador
                    if (e?.statusCode === 404 || e?.statusCode === 410)
                        await ejecutar('DELETE FROM push_suscripcion WHERE id_suscripcion = ?', [s.id_suscripcion]);
                })
        )
    );
}

/** Push a supervisores activos. */
export async function pushSupervisores(titulo: string, cuerpo: string, url = '/') {
    if (!pushActivo) return;
    const sup = await filas<{ id_empleado: number }>("SELECT id_empleado FROM empleado WHERE rol = 'SUPERVISOR' AND id_estado_empleado = 1");
    await enviarPush(
        sup.map(s => s.id_empleado),
        titulo,
        cuerpo,
        url
    );
}
