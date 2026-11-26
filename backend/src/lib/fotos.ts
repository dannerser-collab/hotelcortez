// Fotos en disco (carpeta uploads/). En la base solo se guarda el nombre del archivo.
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { falla } from './http.js';

const EXT: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };
export const NOMBRE_FOTO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function guardarFoto(dataUrl: string): Promise<string> {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/s.exec(dataUrl);
    if (!m) falla(400, 'Foto inválida.');
    const datos = Buffer.from(m![2], 'base64');
    if (datos.length > 1024 * 1024) falla(400, 'La foto supera 1 MB tras comprimirla.');
    await mkdir(env.carpetaFotos, { recursive: true });
    const nombre = `${randomUUID()}.${EXT[m![1]]}`;
    await writeFile(path.join(env.carpetaFotos, nombre), datos);
    return nombre;
}

export async function borrarFoto(nombre?: string | null) {
    if (nombre && NOMBRE_FOTO.test(nombre)) await unlink(path.join(env.carpetaFotos, nombre)).catch(() => undefined);
}

export function rutaFoto(nombre: string) {
    if (!NOMBRE_FOTO.test(nombre)) falla(404, 'Foto no encontrada.');
    return path.join(env.carpetaFotos, nombre);
}
