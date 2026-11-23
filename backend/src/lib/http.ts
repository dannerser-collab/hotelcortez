import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';

export class HttpError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
    }
}

export const falla = (status: number, mensaje: string): never => {
    throw new HttpError(status, mensaje);
};

/** Envuelve un handler async para que los errores lleguen al manejador central. */
export const ruta =
    (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
    (req, res, next: NextFunction) => {
        Promise.resolve(fn(req, res)).catch(next);
    };

/** Valida y convierte datos de entrada; responde 400 con un mensaje claro. */
export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
    try {
        return esquema.parse(datos);
    } catch (e) {
        if (e instanceof ZodError) {
            const p = e.issues[0];
            throw new HttpError(400, p?.message || 'Datos inválidos.');
        }
        throw e;
    }
}

// Piezas de validación reutilizables
export const idValido = z.coerce.number({ message: 'Identificador inválido.' }).int().positive('Identificador inválido.');
export const texto = (max: number, nombre: string) =>
    z
        .string({ message: `Completa ${nombre}.` })
        .trim()
        .min(1, `Completa ${nombre}.`)
        .max(max, `${nombre} admite máximo ${max} caracteres.`);
export const textoOpcional = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .nullable()
        .transform(v => v || null);
export const fotoBase64 = z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, 'La foto debe ser JPG, PNG o WebP.')
    .max(1_400_000, 'La foto es demasiado grande (máximo 1 MB tras comprimirla).');
