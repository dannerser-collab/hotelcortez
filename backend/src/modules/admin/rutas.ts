// Administración (supervisor): habitaciones, personal, turnos y materiales.
// Perfil propio: cualquier empleado.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { fila, filas, ejecutar, transaccion } from '../../db/pool.js';
import { falla, ruta, validar, idValido, texto } from '../../lib/http.js';
import { avisar } from '../../lib/tiempoReal.js';
import { codigoEmpleado, normalizarMaterial, ubicacionHabitacion } from '../../domain/reglas.js';
import { permitir, usuario } from '../auth/auth.js';

export const rutasAdmin = Router();
const soloSupervisor = permitir('SUPERVISOR');
const idOpcional = z.coerce.number().int().positive().optional().nullable();

// ---------- Perfil propio ----------
rutasAdmin.get(
    '/perfil',
    ruta(async (_req, res) => {
        const f = await fila(
            `SELECT e.id_empleado, e.ci, e.nombre, e.apellido, e.telefono, e.rol, t.codigo AS turno, t.nombre AS turno_nombre, a.nombre_area AS area
         FROM empleado e LEFT JOIN turno t USING (id_turno) JOIN area a USING (id_area) WHERE e.id_empleado = ?`,
            [usuario(res).id_empleado]
        );
        res.json({ ...f, codigo: codigoEmpleado(f.id_empleado) });
    })
);

rutasAdmin.patch(
    '/perfil',
    ruta(async (req, res) => {
        const d = validar(
            z.object({
                nombre: texto(60, 'el nombre').optional(),
                apellido: texto(60, 'el apellido').optional(),
                telefono: z
                    .string()
                    .trim()
                    .regex(/^\+?\d{6,15}$/, 'Teléfono inválido.')
                    .optional()
            }),
            req.body
        );
        await ejecutar(
            'UPDATE empleado SET nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido), telefono = COALESCE(?, telefono) WHERE id_empleado = ?',
            [d.nombre ?? null, d.apellido ?? null, d.telefono ?? null, usuario(res).id_empleado]
        );
        avisar('personal');
        res.json({ ok: true });
    })
);

// ---------- Habitaciones ----------
rutasAdmin.post(
    '/habitaciones',
    soloSupervisor,
    ruta(async (req, res) => {
        const d = validar(
            z.object({
                numero: z
                    .string()
                    .trim()
                    .regex(/^\d{3,5}$/, 'Número de habitación inválido (ej. 354).'),
                piso: z.coerce.number().int().min(0).max(99).optional(),
                id_tipo_hab: idOpcional,
                id_mucama: idOpcional
            }),
            req.body
        );
        const ubic = ubicacionHabitacion(d.numero);
        const bloque = ubic.bloque;
        const piso = d.piso ?? ubic.piso;
        await transaccion(async c => {
            if (await fila('SELECT 1 FROM habitacion WHERE numero = ?', [d.numero], c)) falla(409, `La habitación ${d.numero} ya existe.`);
            await ejecutar('INSERT IGNORE INTO bloque (bloque) VALUES (?)', [bloque], c);
            await ejecutar(
                'INSERT INTO habitacion (id_bloque, numero, piso, id_tipo_hab, id_mucama, estado) SELECT id_bloque, ?, ?, ?, ?, TRUE FROM bloque WHERE bloque = ?',
                [d.numero, piso, d.id_tipo_hab ?? null, d.id_mucama ?? null, bloque],
                c
            );
        });
        avisar('catalogos');
        avisar('habitaciones');
        res.status(201).json({ ok: true });
    })
);

rutasAdmin.patch(
    '/habitaciones/:id',
    soloSupervisor,
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(z.object({ id_mucama: idOpcional, id_tipo_hab: idOpcional }), req.body);
        if (d.id_mucama && !(await fila("SELECT 1 FROM empleado WHERE id_empleado = ? AND rol = 'MUCAMA' AND id_estado_empleado = 1", [d.id_mucama])))
            falla(400, 'Selecciona una mucama activa.');
        const sets: string[] = [];
        const p: unknown[] = [];
        if (d.id_mucama !== undefined) {
            sets.push('id_mucama = ?');
            p.push(d.id_mucama);
        }
        if (d.id_tipo_hab !== undefined) {
            sets.push('id_tipo_hab = ?');
            p.push(d.id_tipo_hab);
        }
        if (!sets.length) falla(400, 'No hay cambios.');
        const r = await ejecutar(`UPDATE habitacion SET ${sets.join(', ')} WHERE id_habitacion = ?`, [...p, id]);
        if (!r.affectedRows) falla(404, 'Habitación no encontrada.');
        avisar('catalogos');
        res.json({ ok: true });
    })
);

rutasAdmin.post(
    '/tipos-habitacion',
    soloSupervisor,
    ruta(async (req, res) => {
        const { nombre } = validar(z.object({ nombre: texto(50, 'el tipo de habitación') }), req.body);
        await ejecutar('INSERT IGNORE INTO tipo_habitacion (nombre) VALUES (?)', [nombre]);
        avisar('catalogos');
        res.status(201).json({ ok: true });
    })
);

// ---------- Personal ----------
rutasAdmin.get(
    '/empleados',
    soloSupervisor,
    ruta(async (_req, res) => {
        const r = await filas(
            `SELECT e.id_empleado, e.ci, e.nombre, e.apellido, e.telefono, e.rol, e.id_estado_empleado, ee.nombre_estado AS estado,
                t.codigo AS turno, e.creado_en,
                TIME_FORMAT(COALESCE(e.hora_entrada, t.hora_inicio), '%H:%i') AS hora_entrada,
                TIME_FORMAT(COALESCE(e.hora_salida, t.hora_fin), '%H:%i') AS hora_salida,
                (SELECT GROUP_CONCAT(es.nombre_especialidad ORDER BY es.nombre_especialidad SEPARATOR ', ')
                   FROM tecnico_especialidad te JOIN especialidad es USING (id_especialidad) WHERE te.id_empleado = e.id_empleado) AS especialidades
         FROM empleado e JOIN estado_empleado ee USING (id_estado_empleado) LEFT JOIN turno t USING (id_turno)
         ORDER BY e.id_estado_empleado = 4 DESC, e.rol, e.nombre`
        );
        res.json(r.map(e => ({ ...e, codigo: codigoEmpleado(e.id_empleado) })));
    })
);

const horaValida = z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (usa HH:MM).');

const esquemaNuevoEmpleado = z
    .object({
        rol: z.enum(['MUCAMA', 'TECNICO'], { message: 'Elige si es mucama o técnico.' }),
        nombre: texto(60, 'el nombre'),
        apellido: texto(60, 'el apellido'),
        ci: z
            .string()
            .trim()
            .regex(/^[0-9A-Za-z-]{5,15}$/, 'CI inválido.'),
        telefono: z
            .string()
            .trim()
            .regex(/^\+?\d{6,15}$/, 'Teléfono inválido.'),
        turno: z.enum(['MANANA', 'TARDE', 'NOCHE'], { message: 'Elige un turno.' }),
        hora_entrada: horaValida,
        hora_salida: horaValida,
        especialidades: z.array(z.coerce.number().int().positive()).max(20).default([]),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').max(100)
    })
    .refine(d => d.hora_entrada !== d.hora_salida, { message: 'La hora de entrada y la de salida no pueden ser iguales.' })
    .refine(d => d.rol !== 'TECNICO' || d.especialidades.length > 0, { message: 'Elige al menos una especialidad para el técnico.' });

/** Alta directa de personal por el supervisor: la cuenta queda activa. */
rutasAdmin.post(
    '/empleados',
    soloSupervisor,
    ruta(async (req, res) => {
        const d = validar(esquemaNuevoEmpleado, req.body);
        const especialidades = d.rol === 'TECNICO' ? [...new Set(d.especialidades)] : [];
        const id = await transaccion(async c => {
            if (await fila('SELECT 1 FROM empleado WHERE ci = ? FOR UPDATE', [d.ci], c)) falla(409, 'Ya existe un empleado con ese CI.');
            if (especialidades.length) {
                const ok = await filas('SELECT id_especialidad FROM especialidad WHERE id_especialidad IN (?)', [especialidades], c);
                if (ok.length !== especialidades.length) falla(400, 'Alguna especialidad no existe.');
            }
            const ins = await ejecutar(
                `INSERT INTO empleado (id_area, id_estado_empleado, nombre, apellido, telefono, ci, rol, id_turno, hora_entrada, hora_salida, password_hash)
                 SELECT ?, 1, ?, ?, ?, ?, ?, id_turno, ?, ?, ? FROM turno WHERE codigo = ?`,
                [
                    d.rol === 'MUCAMA' ? 1 : 2,
                    d.nombre,
                    d.apellido,
                    d.telefono,
                    d.ci,
                    d.rol,
                    d.hora_entrada,
                    d.hora_salida,
                    await bcrypt.hash(d.password, 10),
                    d.turno
                ],
                c
            );
            if (!ins.insertId) falla(400, 'Turno inválido.');
            for (const esp of especialidades)
                await ejecutar('INSERT INTO tecnico_especialidad (id_empleado, id_especialidad) VALUES (?, ?)', [ins.insertId, esp], c);
            return ins.insertId;
        });
        avisar('personal');
        avisar('catalogos');
        res.status(201).json({ id_empleado: id, codigo: codigoEmpleado(id) });
    })
);

rutasAdmin.patch(
    '/empleados/:id',
    soloSupervisor,
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(
            z.object({
                id_estado_empleado: z.coerce.number().int().min(1).max(4).optional(),
                turno: z.enum(['MANANA', 'TARDE', 'NOCHE']).optional(),
                rol: z.enum(['MUCAMA', 'TECNICO', 'SUPERVISOR']).optional()
            }),
            req.body
        );
        if (id === usuario(res).id_empleado && ((d.id_estado_empleado && d.id_estado_empleado !== 1) || (d.rol && d.rol !== 'SUPERVISOR')))
            falla(400, 'No puedes desactivar ni cambiar el rol de tu propia cuenta.');
        const r = await ejecutar(
            `UPDATE empleado SET id_estado_empleado = COALESCE(?, id_estado_empleado), rol = COALESCE(?, rol),
         id_turno = COALESCE((SELECT id_turno FROM turno WHERE codigo = ?), id_turno),
         -- Al cambiar de turno rige el horario del nuevo turno
         hora_entrada = IF(? IS NULL, hora_entrada, NULL), hora_salida = IF(? IS NULL, hora_salida, NULL) WHERE id_empleado = ?`,
            [d.id_estado_empleado ?? null, d.rol ?? null, d.turno ?? null, d.turno ?? null, d.turno ?? null, id]
        );
        if (!r.affectedRows) falla(404, 'Empleado no encontrado.');
        if (d.id_estado_empleado && d.id_estado_empleado !== 1) await ejecutar('DELETE FROM sesion WHERE id_empleado = ?', [id]);
        avisar('personal');
        avisar('catalogos');
        res.json({ ok: true });
    })
);

rutasAdmin.post(
    '/empleados/:id/clave',
    soloSupervisor,
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const { nueva } = validar(z.object({ nueva: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').max(100) }), req.body);
        const r = await ejecutar('UPDATE empleado SET password_hash = ? WHERE id_empleado = ?', [await bcrypt.hash(nueva, 10), id]);
        if (!r.affectedRows) falla(404, 'Empleado no encontrado.');
        await ejecutar('DELETE FROM sesion WHERE id_empleado = ?', [id]);
        res.json({ ok: true });
    })
);

// ---------- Materiales ----------
const esquemaMaterial = z.object({
    nombre: texto(80, 'el nombre del material').optional(),
    unidad: z.string().trim().min(1).max(20).optional(),
    stock: z.coerce.number().int('El stock debe ser un número entero.').min(0).max(999999).optional().nullable(),
    activo: z.boolean().optional()
});

rutasAdmin.post(
    '/materiales',
    soloSupervisor,
    ruta(async (req, res) => {
        const d = validar(esquemaMaterial.required({ nombre: true }), req.body);
        const nombre = normalizarMaterial(d.nombre!);
        if (await fila('SELECT 1 FROM material WHERE nombre_mat = ?', [nombre])) falla(409, 'Ese material ya existe.');
        await ejecutar('INSERT INTO material (nombre_mat, unidad, stock) VALUES (?, ?, ?)', [nombre, d.unidad || 'unidad', d.stock ?? null]);
        avisar('catalogos');
        res.status(201).json({ ok: true });
    })
);

rutasAdmin.patch(
    '/materiales/:id',
    soloSupervisor,
    ruta(async (req, res) => {
        const id = validar(idValido, req.params.id);
        const d = validar(esquemaMaterial, req.body);
        const sets: string[] = [];
        const p: unknown[] = [];
        if (d.nombre) {
            sets.push('nombre_mat = ?');
            p.push(normalizarMaterial(d.nombre));
        }
        if (d.unidad) {
            sets.push('unidad = ?');
            p.push(d.unidad);
        }
        if (d.stock !== undefined) {
            sets.push('stock = ?');
            p.push(d.stock);
        }
        if (d.activo !== undefined) {
            sets.push('activo = ?');
            p.push(d.activo);
        }
        if (!sets.length) falla(400, 'No hay cambios.');
        try {
            const r = await ejecutar(`UPDATE material SET ${sets.join(', ')} WHERE id_material = ?`, [...p, id]);
            if (!r.affectedRows) falla(404, 'Material no encontrado.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_ENTRY') falla(409, 'Ya existe un material con ese nombre.');
            throw e;
        }
        avisar('catalogos');
        res.json({ ok: true });
    })
);
