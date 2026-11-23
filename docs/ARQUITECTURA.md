# Arquitectura y cómo hacer cambios sin romper nada

El sistema está dividido en piezas independientes. Cada cambio toca **una** pieza y las pruebas avisan si se rompió otra.

## Mapa

```text
backend/src/
├── config/env.ts            Configuración y zona horaria (se carga primero)
├── db/
│   ├── pool.ts              Conexión MySQL + helpers (filas, fila, ejecutar, transaccion)
│   ├── migrar.ts            Ejecutor de migraciones (tabla schema_version)
│   ├── migrations/          0001, 0002, 0003…  ← los cambios a la base viven aquí
│   ├── semilla.ts           Catálogos y datos de prueba
│   └── cli.ts               npm run migrar | semilla | clave
├── domain/reglas.ts         Reglas del negocio puras (prioridad, turnos, estados)
├── lib/                     http (errores y validación), fotos, push, tiempo real
└── modules/                 Un módulo por área; se registran en modules/index.ts
    ├── auth/                Login, registro, sesiones, permisos por rol
    ├── catalogos/           Habitaciones, técnicos, turnos, materiales…
    ├── solicitudes/         Mucama: crear, modificar, anular · consultas compartidas
    ├── trabajo/             Asignar, tomar, iniciar, reportes, modificaciones
    ├── admin/               Perfil, habitaciones, personal, materiales
    ├── indicadores/         KPIs
    └── sistema/             Salud, eventos en tiempo real, fotos, push

frontend/src/
├── navegacion.tsx           REGISTRO DE PANTALLAS (menú + rutas se generan de aquí)
├── types.ts                 Tipos de lo que devuelve la API
├── lib/                     api, dominio (etiquetas/colores), formato, imagen, push
├── hooks/                   sesion, datos (TanStack Query), avisos + tiempo real
├── components/              Piezas visuales reutilizables (ui, Tabla, TarjetaSolicitud…)
└── pages/                   Una carpeta por rol: mucama/, tecnico/, supervisor/
```

## Recetas

### Agregar un campo a la base de datos
1. Crea `backend/src/db/migrations/0004_lo_que_sea.ts` (copia la forma de `0003`).
2. Agrégala al final de `migrations/index.ts`.
3. `npm run migrar`. **Nunca** edites una migración que ya se aplicó en otra PC.
4. Si el campo se muestra en incidentes, agrégalo a `VISTA_SOLICITUD` en `modules/solicitudes/consultas.ts` y al tipo `Solicitud` en `frontend/src/types.ts`.

### Agregar un endpoint
1. Agrégalo en el `rutas.ts` del módulo que corresponda (o crea `modules/nuevo/rutas.ts` y regístralo en `modules/index.ts`).
2. Valida la entrada con `validar(esquemaZod, req.body)`; los errores se devuelven con `falla(status, 'mensaje')`.
3. Si cambia datos, llama a `avisar('tema')` para que las pantallas abiertas se actualicen solas.
4. Agrega un caso a `backend/test/api.test.ts`.

### Agregar una pantalla
1. Crea el componente en `frontend/src/pages/<rol>/MiPantalla.tsx`.
2. Agrega una entrada en `frontend/src/navegacion.tsx`. El menú lateral, la barra del celular y la ruta aparecen solos.

### Cambiar una regla del hotel (prioridades, turnos, estados)
Se cambia en `backend/src/domain/reglas.ts` y en su prueba `backend/test/reglas.test.ts`. Las etiquetas y colores visibles están en `frontend/src/lib/dominio.ts`.

## Antes de dar por terminado un cambio

```powershell
cd F:\hotelcortez\backend; npm run lint; npm run build; npm test
```

```powershell
cd F:\hotelcortez\frontend; npm run lint; npm run build
```

Las pruebas del backend crean una base temporal, ejecutan todas las migraciones y el flujo completo, y la borran al final: no tocan tu base real. Lo mismo corre en GitHub Actions en cada push (`.github/workflows/ci.yml`).

## Flujo de una solicitud

```text
SIN_ASIGNAR ──(supervisor asigna / técnico toma Media-Baja)──► ASIGNADA ──(iniciar)──► EN_PROCESO
     │                                                              │                     │
     └──(anular)──► ANULADA                                         └────(reporte)────────┤
                                                                                           ▼
                                          PENDIENTE ◄──(reporte Pendiente + motivo)── reporte
                                              │                                        │
                                              └──(nuevo reporte Hecho)──► RESUELTA ◄───┘
```

Cada paso queda en `solicitud_evento` (historial visible y base de los indicadores).
