import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    prioridadPorOcupacion,
    requiereSupervisor,
    enTurno,
    turnoActual,
    puedePasar,
    estadoTrasReporte,
    normalizarMaterial,
    idDesdeCodigo,
    codigoEmpleado,
    codigoIncidente,
    ubicacionHabitacion,
    habitacionEnRango,
    prioridadAlReiterar
} from '../src/domain/reglas.js';

test('prioridad según ocupación', () => {
    assert.equal(prioridadPorOcupacion('OCUPADA', 3), 0);
    assert.equal(prioridadPorOcupacion('RESERVADA', 3), 1);
    assert.equal(prioridadPorOcupacion('LIBRE', 3), 3);
    assert.equal(prioridadPorOcupacion('LIBRE', 1), 1);
    assert.equal(prioridadPorOcupacion('LIBRE'), 2);
    assert.equal(prioridadPorOcupacion('LIBRE', 0), 2, 'Urgente solo por ocupación');
});

test('Urgente y Alta requieren supervisor', () => {
    assert.equal(requiereSupervisor(0), true);
    assert.equal(requiereSupervisor(1), true);
    assert.equal(requiereSupervisor(2), false);
    assert.equal(requiereSupervisor(3), false);
});

test('turnos, incluido el que cruza medianoche', () => {
    const turnos = [
        { codigo: 'MANANA', hora_inicio: '06:00', hora_fin: '14:00' },
        { codigo: 'TARDE', hora_inicio: '14:00', hora_fin: '22:00' },
        { codigo: 'NOCHE', hora_inicio: '22:00', hora_fin: '06:00' }
    ];
    const a = (h: number, m = 0) => new Date(2026, 0, 1, h, m);
    assert.equal(turnoActual(turnos, a(6))?.codigo, 'MANANA');
    assert.equal(turnoActual(turnos, a(13, 59))?.codigo, 'MANANA');
    assert.equal(turnoActual(turnos, a(14))?.codigo, 'TARDE');
    assert.equal(turnoActual(turnos, a(23))?.codigo, 'NOCHE');
    assert.equal(turnoActual(turnos, a(3))?.codigo, 'NOCHE');
    assert.equal(enTurno(turnos[2], a(12)), false);
});

test('ciclo de vida de la solicitud', () => {
    assert.ok(puedePasar('SIN_ASIGNAR', 'ASIGNADA'));
    assert.ok(puedePasar('EN_PROCESO', 'PENDIENTE'));
    assert.ok(puedePasar('PENDIENTE', 'RESUELTA'));
    assert.ok(!puedePasar('RESUELTA', 'PENDIENTE'));
    assert.ok(!puedePasar('ANULADA', 'ASIGNADA'));
    assert.ok(!puedePasar('SIN_ASIGNAR', 'RESUELTA'));
    assert.equal(estadoTrasReporte('HECHO'), 'RESUELTA');
    assert.equal(estadoTrasReporte('PENDIENTE'), 'PENDIENTE');
});

test('normalización y códigos', () => {
    assert.equal(normalizarMaterial('  foco   led 12w '), 'Foco led 12w');
    assert.equal(codigoEmpleado(42), 'E-0042');
    assert.equal(idDesdeCodigo('E-0042'), 42);
    assert.equal(idDesdeCodigo('e42'), 42);
    assert.equal(idDesdeCodigo('7'), 7);
    assert.equal(idDesdeCodigo('X-1'), null);
    assert.equal(codigoIncidente(3), 'INC-003');
    assert.deepEqual(ubicacionHabitacion('124'), { bloque: 100, piso: 1 });
    assert.deepEqual(ubicacionHabitacion('322'), { bloque: 300, piso: 3 });
    assert.ok(habitacionEnRango('100') && habitacionEnRango('499'));
    assert.ok(!habitacionEnRango('099') && !habitacionEnRango('500') && !habitacionEnRango('1240') && !habitacionEnRango('12'));
});

test('reiterar un incidente sube un nivel de prioridad', () => {
    assert.equal(prioridadAlReiterar(3), 2); // Baja → Media
    assert.equal(prioridadAlReiterar(2), 1); // Media → Alta
    assert.equal(prioridadAlReiterar(1), 0); // Alta → Urgente
    assert.equal(prioridadAlReiterar(0), 0); // Urgente se queda
    assert.equal(prioridadAlReiterar(3, 'OCUPADA'), 0); // la ocupación manda si exige más
    assert.equal(prioridadAlReiterar(3, 'RESERVADA'), 1);
    assert.equal(prioridadAlReiterar(2, 'LIBRE'), 1);
});
