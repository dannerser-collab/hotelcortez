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

// Reutiliza la sesión de cada cuenta demo: el login tiene límite de intentos (20 cada 15 min)
const sesiones = new Map<string, string>();
async function login(codigo: string, rol: string) {
    const id = String(Number(codigo.replace(/\D/g, '')));
    if (sesiones.has(id)) return sesiones.get(id)!;
    const r = await api('/auth/login', null, { codigo, password: CLAVES_DEMO[rol] });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    sesiones.set(id, r.data.token);
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

    // La mucama solo ve sus habitaciones; una habitación nueva se registra a su nombre con el bloque del número
    const cat = (await api('/catalogos', mucama)).data;
    assert.ok(cat.habitaciones.length > 0 && cat.habitaciones.every((h: any) => h.id_mucama === 1));
    const tipo = 'Habitación doble';
    // Fuera de los bloques 100–400 → habitación inexistente
    for (const n of ['12', '099', '500', '924', '1240'])
        assert.equal((await api('/solicitudes', mucama, { numero_habitacion: n, tipo_habitacion: tipo, problema: 'x', ocupacion: 'LIBRE' })).status, 400, n);
    // Sin tipo de habitación → error
    assert.equal((await api('/solicitudes', mucama, { numero_habitacion: '145', problema: 'x', ocupacion: 'LIBRE' })).status, 400);
    assert.equal(
        (await api('/solicitudes', mucama, { numero_habitacion: '145', tipo_habitacion: 'Suite ejecutiva', problema: 'x', ocupacion: 'LIBRE' })).status,
        201
    );
    const h145 = (await api('/catalogos', mucama)).data.habitaciones.find((h: any) => h.numero === '145');
    assert.equal(h145.bloque, 100);
    assert.equal(h145.piso, 1);
    assert.equal(h145.id_mucama, 1);
    assert.equal(h145.tipo_habitacion, 'Suite ejecutiva');
    // Cualquier mucama puede reportar una habitación de otra (los turnos se relevan)
    assert.equal(
        (await api('/solicitudes', mucama, { numero_habitacion: '431', tipo_habitacion: tipo, problema: 'x', ocupacion: 'LIBRE' })).status,
        201,
        'hab. de otra mucama'
    );

    // Ocupada → Urgente, con foto (se guarda en disco, no en la lista)
    const nueva = await api('/solicitudes', mucama, {
        numero_habitacion: '101',
        tipo_habitacion: tipo,
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
        materiales: [{ nombre: ' empaque  nuevo ', cantidad: 1 }]
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

    // Cantidades enteras y el stock nunca queda negativo (Válvula de paso: stock 5)
    const hecho = { resultado: 'HECHO', observacion: 'Válvula instalada' };
    assert.equal((await api(`/solicitudes/${id}/reportes`, tec1, { ...hecho, materiales: [{ id_material: 8, cantidad: 1.5 }] })).status, 400);
    assert.equal((await api(`/solicitudes/${id}/reportes`, tec1, { ...hecho, materiales: [{ id_material: 8, cantidad: 6 }] })).status, 409);
    assert.equal(
        (
            await api(`/solicitudes/${id}/reportes`, tec1, {
                ...hecho,
                materiales: [
                    { id_material: 8, cantidad: 3 },
                    { id_material: 8, cantidad: 3 }
                ]
            })
        ).status,
        409
    );
    assert.equal((await api('/solicitudes/' + id, sup)).data.estado, 'PENDIENTE', 'el rechazo no cambia nada');

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
    const s = await api('/solicitudes', mucama, {
        numero_habitacion: '102',
        tipo_habitacion: 'Habitación doble',
        problema: 'Foco quemado',
        ocupacion: 'LIBRE',
        prioridad: 3
    });
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

test('incidente repetido entre turnos: se reitera, sube la prioridad y no se duplica', async () => {
    const manana = await login('E-0001', 'MUCAMA');
    const tarde = await login('E-0006', 'MUCAMA');
    const tec = await login('E-0002', 'TECNICO');
    const sup = await login('E-0005', 'SUPERVISOR');
    const base = { numero_habitacion: '233', tipo_habitacion: 'Habitación ejecutiva', ocupacion: 'LIBRE' };

    // Mañana: reporta con prioridad Baja
    const s1 = await api('/solicitudes', manana, { ...base, problema: 'Gotea la ducha', prioridad: 3 });
    assert.equal(s1.status, 201, JSON.stringify(s1.data));
    const id = s1.data.id_solicitud;

    // Tarde: ve el incidente abierto de la otra mucama
    const ab = await api('/solicitudes/abiertas/233', tarde);
    assert.equal(ab.status, 200);
    assert.equal(ab.data.length, 1);
    assert.equal(ab.data[0].id_solicitud, id);
    assert.equal(ab.data[0].es_mia, false);
    assert.equal(ab.data[0].mucama, 'María Fernanda López');
    assert.equal((await api('/solicitudes/abiertas/233', tec)).status, 403, 'el técnico no usa este aviso');

    // Sin decidir no puede crear otro incidente en la misma habitación
    assert.equal((await api('/solicitudes', tarde, { ...base, problema: 'Gotea la ducha' })).status, 409);

    // Es el mismo: se reitera → Baja pasa a Media
    const r1 = await api(`/solicitudes/${id}/reiterar`, tarde, { comentario: 'Sigue goteando' });
    assert.equal(r1.status, 200, JSON.stringify(r1.data));
    assert.equal(r1.data.nivel_prioridad, 2);
    assert.equal(r1.data.prioridad_subio, true);
    assert.equal((await api(`/solicitudes/${id}/reiterar`, tarde, {})).status, 409, 'una sola vez por mucama');
    assert.equal((await api(`/solicitudes/${id}/reiterar`, tec, {})).status, 403);

    // En la base de datos: un solo incidente, prioridad actualizada y evento con autor y comentario
    const [enHab]: any = await pool.query('SELECT COUNT(*) AS n FROM solicitud s JOIN habitacion h USING (id_habitacion) WHERE h.numero = ?', ['233']);
    assert.equal(Number(enHab[0].n), 1);
    const [sol]: any = await pool.query('SELECT nivel_prioridad, ocupacion, id_empleado FROM solicitud WHERE id_solicitud = ?', [id]);
    assert.equal(sol[0].nivel_prioridad, 2);
    assert.equal(sol[0].id_empleado, 1, 'la autora original no cambia');
    const [ev]: any = await pool.query("SELECT id_empleado, detalle FROM solicitud_evento WHERE id_solicitud = ? AND tipo = 'REITERADA'", [id]);
    assert.equal(ev.length, 1);
    assert.equal(ev[0].id_empleado, 6);
    assert.equal(ev[0].detalle, 'Sigue goteando');
    const [hab]: any = await pool.query("SELECT h.id_mucama, b.bloque FROM habitacion h JOIN bloque b USING (id_bloque) WHERE h.numero = '233'");
    assert.equal(hab[0].id_mucama, 1);
    assert.equal(hab[0].bloque, 200);

    // La mucama de la tarde la ve en su lista, pero no puede modificarla ni anularla
    const lista = (await api('/solicitudes', tarde)).data;
    const enLista = lista.find((x: any) => x.id_solicitud === id);
    assert.ok(enLista, 'aparece en la lista de quien la reiteró');
    assert.equal(enLista.veces_reiterada, 1);
    assert.equal((await api('/solicitudes/' + id, tarde, { problema: 'otro' }, 'PATCH')).status, 403);
    assert.equal((await api(`/solicitudes/${id}/anular`, tarde, {})).status, 403);
    const det = (await api('/solicitudes/' + id, sup)).data;
    assert.ok(det.eventos.some((e: any) => e.tipo === 'REITERADA' && e.empleado === 'Rosa Quispe'));

    // La autora original también puede reiterarla una vez; con la habitación ocupada pasa a Urgente
    const r2 = await api(`/solicitudes/${id}/reiterar`, manana, { ocupacion: 'OCUPADA' });
    assert.equal(r2.status, 200);
    assert.equal(r2.data.nivel_prioridad, 0);
    const [sol2]: any = await pool.query('SELECT nivel_prioridad, ocupacion FROM solicitud WHERE id_solicitud = ?', [id]);
    assert.equal(sol2[0].nivel_prioridad, 0);
    assert.equal(sol2[0].ocupacion, 'OCUPADA');
    // Urgente: el técnico ya no puede tomarla, la asigna el supervisor
    assert.equal((await api(`/solicitudes/${id}/tomar`, tec, {})).status, 403);

    // Es otro problema: se crea un incidente distinto
    const s2 = await api('/solicitudes', tarde, { ...base, problema: 'Foco quemado en el pasillo', es_otro_problema: true });
    assert.equal(s2.status, 201, JSON.stringify(s2.data));
    assert.equal((await api('/solicitudes/abiertas/233', tarde)).data.length, 2);

    // Un incidente cerrado no se puede reiterar
    assert.equal((await api(`/solicitudes/${s2.data.id_solicitud}/anular`, sup, {})).status, 200);
    assert.equal((await api(`/solicitudes/${s2.data.id_solicitud}/reiterar`, manana, {})).status, 409);
    assert.equal((await api('/solicitudes/abiertas/233', tarde)).data.length, 1);
});

test('alta de personal: mucama y técnico con datos propios de cada cargo', async () => {
    const sup = await login('E-0005', 'SUPERVISOR');
    const mucama = await login('E-0001', 'MUCAMA');
    const base = { nombre: 'Ana', apellido: 'Vargas', ci: '9900111', telefono: '70011122', turno: 'TARDE', password: 'clave123' };

    // Solo el supervisor
    assert.equal((await api('/empleados', mucama, { ...base, rol: 'MUCAMA', hora_entrada: '14:00', hora_salida: '22:00' })).status, 403);
    // Validaciones
    assert.equal(
        (await api('/empleados', sup, { ...base, rol: 'SUPERVISOR', hora_entrada: '14:00', hora_salida: '22:00' })).status,
        400,
        'solo mucama o técnico'
    );
    assert.equal((await api('/empleados', sup, { ...base, rol: 'MUCAMA', hora_entrada: '14:00', hora_salida: '14:00' })).status, 400, 'horas iguales');
    assert.equal((await api('/empleados', sup, { ...base, rol: 'MUCAMA', hora_entrada: '25:00', hora_salida: '22:00' })).status, 400, 'hora inválida');
    assert.equal(
        (await api('/empleados', sup, { ...base, ci: '9900222', rol: 'TECNICO', hora_entrada: '06:00', hora_salida: '14:00', especialidades: [] })).status,
        400,
        'técnico sin especialidad'
    );
    assert.equal(
        (await api('/empleados', sup, { ...base, ci: '9900222', rol: 'TECNICO', hora_entrada: '06:00', hora_salida: '14:00', especialidades: [999] })).status,
        400,
        'especialidad inexistente'
    );

    // Mucama con horario propio (15:00–23:00 dentro del turno tarde); las especialidades se ignoran
    const m = await api('/empleados', sup, { ...base, rol: 'MUCAMA', hora_entrada: '15:00', hora_salida: '23:00', especialidades: [1] });
    assert.equal(m.status, 201, JSON.stringify(m.data));
    assert.match(m.data.codigo, /^E-\d{4}$/);
    assert.equal((await api('/empleados', sup, { ...base, rol: 'MUCAMA', hora_entrada: '15:00', hora_salida: '23:00' })).status, 409, 'CI repetido');

    // Técnico con dos especialidades
    const t = await api('/empleados', sup, {
        ...base,
        nombre: 'Pedro',
        apellido: 'Mamani',
        ci: '9900333',
        rol: 'TECNICO',
        turno: 'NOCHE',
        hora_entrada: '22:00',
        hora_salida: '06:00',
        especialidades: [1, 2, 2]
    });
    assert.equal(t.status, 201, JSON.stringify(t.data));

    // En la base de datos
    const [em]: any = await pool.query(
        `SELECT e.rol, e.id_area, e.id_estado_empleado, tu.codigo AS turno, TIME_FORMAT(e.hora_entrada, '%H:%i') AS entrada,
                TIME_FORMAT(e.hora_salida, '%H:%i') AS salida, e.password_hash
         FROM empleado e JOIN turno tu USING (id_turno) WHERE e.id_empleado IN (?, ?) ORDER BY e.id_empleado`,
        [m.data.id_empleado, t.data.id_empleado]
    );
    assert.deepEqual(
        em.map((x: any) => [x.rol, x.id_area, x.id_estado_empleado, x.turno, x.entrada, x.salida]),
        [
            ['MUCAMA', 1, 1, 'TARDE', '15:00', '23:00'],
            ['TECNICO', 2, 1, 'NOCHE', '22:00', '06:00']
        ]
    );
    assert.ok(
        em.every((x: any) => x.password_hash && x.password_hash !== 'clave123'),
        'contraseña cifrada'
    );
    const [esp]: any = await pool.query('SELECT id_especialidad FROM tecnico_especialidad WHERE id_empleado = ? ORDER BY 1', [t.data.id_empleado]);
    assert.deepEqual(
        esp.map((x: any) => x.id_especialidad),
        [1, 2]
    );
    const [espM]: any = await pool.query('SELECT COUNT(*) AS n FROM tecnico_especialidad WHERE id_empleado = ?', [m.data.id_empleado]);
    assert.equal(Number(espM[0].n), 0);

    // La lista de personal muestra horario y especialidades
    const lista = (await api('/empleados', sup)).data;
    const tec = lista.find((x: any) => x.id_empleado === t.data.id_empleado);
    assert.equal(tec.especialidades, 'Electricidad, Plomería');
    assert.equal(tec.hora_entrada, '22:00');

    // Las cuentas quedan activas: pueden ingresar de inmediato
    const nueva = await api('/auth/login', null, { codigo: m.data.codigo, password: 'clave123' });
    assert.equal(nueva.status, 200);
    assert.equal(nueva.data.usuario.rol, 'MUCAMA');
    // El técnico nuevo aparece en el catálogo para asignar
    assert.ok((await api('/catalogos', sup)).data.tecnicos.some((x: any) => x.id_empleado === t.data.id_empleado));

    // Al cambiar de turno, rige el horario del nuevo turno
    assert.equal((await api('/empleados/' + m.data.id_empleado, sup, { turno: 'MANANA' }, 'PATCH')).status, 200);
    const tras = (await api('/empleados', sup)).data.find((x: any) => x.id_empleado === m.data.id_empleado);
    assert.deepEqual([tras.turno, tras.hora_entrada, tras.hora_salida], ['MANANA', '06:00', '14:00']);
});

test('exportar indicadores a Excel con todos los datos', async () => {
    const sup = await login('E-0005', 'SUPERVISOR');
    const mucama = await login('E-0001', 'MUCAMA');
    assert.equal((await fetch(url + '/indicadores/excel', { headers: { Authorization: 'Bearer ' + mucama } })).status, 403);

    const r = await fetch(url + '/indicadores/excel?dias=30', { headers: { Authorization: 'Bearer ' + sup } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /spreadsheetml/);
    assert.match(r.headers.get('content-disposition') || '', /attachment; filename="indicadores-hotel-cortez-30d-.*\.xlsx"/);

    const { default: ExcelJS } = await import('exceljs');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(Buffer.from(await r.arrayBuffer()) as any);
    assert.deepEqual(
        libro.worksheets.map(h => h.name),
        ['Resumen', 'Incidentes', 'Materiales usados', 'Técnicos', 'Por especialidad', 'Habitaciones', 'Por día', 'Inventario', 'Personal']
    );

    // Incidentes: una fila por solicitud del periodo, igual que en la base
    const [n]: any = await pool.query('SELECT COUNT(*) AS n FROM solicitud WHERE creada_en >= NOW() - INTERVAL 30 DAY');
    const inc = libro.getWorksheet('Incidentes')!;
    assert.ok(Number(n[0].n) > 0);
    assert.equal(inc.rowCount - 1, Number(n[0].n));
    const encabezados = (inc.getRow(1).values as unknown[]).slice(1);
    for (const c of [
        'Código',
        'Habitación',
        'Bloque',
        'Tipo de habitación',
        'Prioridad',
        'Estado',
        'Reportada de nuevo (veces)',
        'Técnico',
        'Min. de reparación'
    ])
        assert.ok(encabezados.includes(c), c);

    // La fecha en Excel muestra la hora local del hotel (no UTC)
    const col = encabezados.indexOf('Fecha') + 1;
    const codigoCol = encabezados.indexOf('Código') + 1;
    const fila2 = inc.getRow(2);
    const id = Number(String(fila2.getCell(codigoCol).value).replace('INC-', ''));
    const [db]: any = await pool.query("SELECT DATE_FORMAT(creada_en, '%Y-%m-%d %H:%i') AS f FROM solicitud WHERE id_solicitud = ?", [id]);
    const enExcel = fila2.getCell(col).value as Date;
    assert.equal(enExcel.toISOString().slice(0, 16).replace('T', ' '), db[0].f);

    // Resumen coincide con el JSON del tablero
    const json = (await api('/indicadores?dias=30', sup)).data;
    const resumen = libro.getWorksheet('Resumen')!;
    const valor = (k: string) =>
        resumen
            .getRows(2, resumen.rowCount)!
            .find(f => f.getCell(1).value === k)
            ?.getCell(2).value;
    assert.equal(valor('Incidentes reportados (sin anulados)'), Number(json.resumen.total));
    assert.equal(valor('Resueltos'), Number(json.resumen.resueltas));

    // Personal incluye a todos los empleados
    const [pe]: any = await pool.query('SELECT COUNT(*) AS n FROM empleado');
    assert.equal(libro.getWorksheet('Personal')!.rowCount - 1, Number(pe[0].n));
});
