// Prueba de extremo a extremo sobre una base temporal que se crea y se borra.
// Requiere MySQL con las credenciales de backend/.env. No toca la base real.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import mysql from 'mysql2/promise';

const BASE = 'hc_prueba_' + process.pid;
process.env.DB_NAME = BASE;
const carpeta = await mkdtemp(path.join(os.tmpdir(), 'hc-fotos-'));
process.env.UPLOADS_DIR = carpeta;

const { env } = await import('../src/config/env.js');
const admin = await mysql.createConnection({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password });
await admin.query(`CREATE DATABASE \`${BASE}\` CHARACTER SET utf8mb4`);

const { pool } = await import('../src/db/pool.js');
const { migrar } = await import('../src/db/migrar.js');
const { sembrar, CLAVES_DEMO } = await import('../src/db/semilla.js');
const { crearApp } = await import('../src/app.js');

let server: Server;
let url = '';

before(async () => {
    await migrar(() => undefined);
    await sembrar({ demo: true });
    server = crearApp().listen(0);
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
    server?.close();
    await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${BASE}\``);
    await admin.end();
    await rm(carpeta, { recursive: true, force: true });
});

async function api(ruta: string, token?: string | null, body?: unknown, method = body ? 'POST' : 'GET') {
    const r = await fetch(url + ruta, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : null };
}

async function login(codigo: string, rol: string) {
    const r = await api('/auth/login', null, { codigo, password: CLAVES_DEMO[rol] });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data.token as string;
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

test('flujo completo: reportar, asignar, pendiente, resolver, modificar', async () => {
    // Autenticación
    assert.equal((await api('/salud')).status, 200);
    assert.equal((await api('/catalogos')).status, 401);
    assert.equal((await api('/auth/login', null, { codigo: 'E-0001', password: 'mala' })).status, 401);
    const mucama = await login('E-0001', 'MUCAMA');
    const tec1 = await login('2', 'TECNICO');
    const tec2 = await login('E-0003', 'TECNICO');
    const sup = await login('E-0005', 'SUPERVISOR');

    // Permisos por rol
    assert.equal((await api('/solicitudes', sup, { numero_habitacion: '101', problema: 'x', ocupacion: 'LIBRE' })).status, 403);
    assert.equal((await api('/indicadores', mucama)).status, 403);

    // La mucama solo ve sus habitaciones; no se inventan habitaciones
    const cat = (await api('/catalogos', mucama)).data;
    assert.ok(cat.habitaciones.length > 0 && cat.habitaciones.every((h: any) => h.id_mucama === 1));
    assert.equal((await api('/solicitudes', mucama, { numero_habitacion: '999', problema: 'x', ocupacion: 'LIBRE' })).status, 404);
    assert.equal((await api('/solicitudes', mucama, { numero_habitacion: '501', problema: 'x', ocupacion: 'LIBRE' })).status, 403, 'hab. de otra mucama');

    // Ocupada → Urgente, con foto (se guarda en disco, no en la lista)
    const nueva = await api('/solicitudes', mucama, {
        numero_habitacion: '101',
        problema: 'Fuga de agua en el baño',
        ocupacion: 'OCUPADA',
        prioridad: 3,
        foto: PNG
    });
    assert.equal(nueva.status, 201, JSON.stringify(nueva.data));
    assert.equal(nueva.data.nivel_prioridad, 0);
    const id = nueva.data.id_solicitud;
    const lista = (await api('/solicitudes', sup)).data;
    const fila = lista.find((s: any) => s.id_solicitud === id);
    assert.ok(fila.tiene_foto && !String(fila.foto).startsWith('data:'));
    const foto = await fetch(url + '/fotos/' + fila.foto, { headers: { Authorization: 'Bearer ' + sup } });
    assert.equal(foto.status, 200);

    // La mucama modifica mientras está sin asignar
    assert.equal((await api('/solicitudes/' + id, mucama, { problema: 'Fuga de agua fuerte en el baño' }, 'PATCH')).status, 200);

    // Urgente: el técnico no puede tomarla
    assert.equal((await api(`/solicitudes/${id}/tomar`, tec1, {})).status, 403);
    // El supervisor asigna con dificultad y especialidad
    assert.equal((await api(`/solicitudes/${id}/asignar`, sup, { id_tecnico: 2, id_dificultad: 2, id_especialidad: 1 })).status, 200);
    assert.equal((await api('/solicitudes/' + id, mucama, { problema: 'otro' }, 'PATCH')).status, 409, 'ya asignada');

    // Otro técnico no puede reportar
    const rep = {
        resultado: 'PENDIENTE',
        observacion: 'Se cambió el empaque',
        motivo_pendiente: 'Falta la válvula',
        materiales: [{ nombre: ' empaque  nuevo ', cantidad: 1.5 }]
    };
    assert.equal((await api(`/solicitudes/${id}/reportes`, tec2, rep)).status, 403);
    assert.equal((await api(`/solicitudes/${id}/iniciar`, tec1, {})).status, 200);
    // Pendiente sin motivo → error
    assert.equal((await api(`/solicitudes/${id}/reportes`, tec1, { ...rep, motivo_pendiente: '' })).status, 400);
    const r1 = await api(`/solicitudes/${id}/reportes`, tec1, rep);
    assert.equal(r1.status, 201, JSON.stringify(r1.data));

    let det = (await api('/solicitudes/' + id, sup)).data;
    assert.equal(det.estado, 'PENDIENTE');
    assert.equal(det.dificultad, 'Medio');
    assert.equal(det.reportes[0].materiales[0].nombre_mat, 'Empaque nuevo');
    const habs = (await api('/catalogos', sup)).data.habitaciones;
    assert.equal(habs.find((h: any) => h.numero === '101').operativa, 0, 'habitación en mantenimiento');

    // Solicitud de modificación del técnico → supervisor edita y marca hecha
    assert.equal((await api(`/reportes/${r1.data.id_reporte}/modificaciones`, tec2, { detalle: 'x' })).status, 403);
    assert.equal((await api(`/reportes/${r1.data.id_reporte}/modificaciones`, tec1, { detalle: 'Eran 2 empaques' })).status, 201);
    const mods = (await api('/modificaciones', sup)).data;
    const mod = mods.find((m: any) => m.id_reporte === r1.data.id_reporte);
    assert.equal(mod.estado, 'PENDIENTE');
    assert.equal((await api(`/reportes/${r1.data.id_reporte}`, tec1, { observacion: 'x' }, 'PATCH')).status, 403);
    assert.equal((await api(`/reportes/${r1.data.id_reporte}`, sup, { materiales: [{ nombre: 'Empaque nuevo', cantidad: 2 }] }, 'PATCH')).status, 200);
    assert.equal((await api(`/modificaciones/${mod.id_modificacion}/hecha`, sup, {})).status, 200);
    assert.equal((await api(`/modificaciones/${mod.id_modificacion}/hecha`, sup, {})).status, 404);

    // Se resuelve
    assert.equal(
        (
            await api(`/solicitudes/${id}/reportes`, tec1, {
                resultado: 'HECHO',
                observacion: 'Válvula instalada',
                materiales: [{ id_material: 8, cantidad: 1 }]
            })
        ).status,
        201
    );
    det = (await api('/solicitudes/' + id, sup)).data;
    assert.equal(det.estado, 'RESUELTA');
    assert.ok(det.finalizada_en);
    assert.deepEqual(det.eventos.map((e: any) => e.tipo).slice(0, 5), ['REPORTADA', 'MODIFICADA', 'ASIGNADA', 'INICIADA', 'PENDIENTE']);
    assert.equal((await api(`/solicitudes/${id}/reportes`, tec1, { resultado: 'HECHO', observacion: 'otra vez' })).status, 409);
    const habs2 = (await api('/catalogos', sup)).data.habitaciones;
    assert.equal(habs2.find((h: any) => h.numero === '101').operativa, 1);

    // Indicadores
    const ind = (await api('/indicadores', sup)).data;
    assert.ok(ind.resumen.total >= 1 && ind.resumen.resueltas >= 1);
});

test('Media/Baja: un solo técnico puede tomarla (concurrencia)', async () => {
    const mucama = await login('E-0001', 'MUCAMA');
    const tec1 = await login('E-0002', 'TECNICO');
    const tec2 = await login('E-0003', 'TECNICO');
    const s = await api('/solicitudes', mucama, { numero_habitacion: '102', problema: 'Foco quemado', ocupacion: 'LIBRE', prioridad: 3 });
    assert.equal(s.data.nivel_prioridad, 3);
    const [a, b] = await Promise.all([api(`/solicitudes/${s.data.id_solicitud}/tomar`, tec1, {}), api(`/solicitudes/${s.data.id_solicitud}/tomar`, tec2, {})]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    // La mucama ya no puede anularla
    assert.equal((await api(`/solicitudes/${s.data.id_solicitud}/anular`, mucama, {})).status, 409);
});

test('registro de acceso requiere aprobación del supervisor', async () => {
    const reg = await api('/auth/registro', null, {
        nombre: 'Lucía',
        apellido: 'Mamani',
        telefono: '70012345',
        ci: '9988776',
        rol: 'MUCAMA',
        turno: 'MANANA',
        password: 'secreta1'
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.data));
    assert.equal((await api('/auth/login', null, { codigo: reg.data.codigo, password: 'secreta1' })).status, 403);
    const sup = await login('E-0005', 'SUPERVISOR');
    const emp = (await api('/empleados', sup)).data.find((e: any) => e.codigo === reg.data.codigo);
    assert.equal(emp.id_estado_empleado, 4);
    assert.equal((await api('/empleados/' + emp.id_empleado, sup, { id_estado_empleado: 1 }, 'PATCH')).status, 200);
    const ok = await api('/auth/login', null, { codigo: reg.data.codigo, password: 'secreta1' });
    assert.equal(ok.status, 200);
    // Logout invalida el token
    assert.equal((await api('/auth/logout', ok.data.token, {})).status, 200);
    assert.equal((await api('/auth/yo', ok.data.token)).status, 401);
});
