# 🏨 Hotel Cortéz · Gestión de Incidentes de Mantenimiento (CMMS)

Sistema para que las mucamas reporten fallas desde el celular, el supervisor las asigne al técnico de turno y el técnico registre el trabajo hasta resolverlo. Reemplaza los mensajes de WhatsApp y las planillas de Excel, deja historial de cada habitación y calcula indicadores (tiempo de respuesta, MTTR, carga por técnico, materiales).

## Roles

| Rol | Qué hace |
| --- | --- |
| **Mucama** | Reporta una falla (habitación, detalle, estado libre/ocupada/reservada, foto). Puede modificarla o anularla mientras no esté asignada. |
| **Técnico** | Ve sus asignaciones (nuevas y pendientes) y las disponibles de prioridad Media/Baja. Inicia el trabajo, reporta Hecho o Pendiente con motivo, y pide al supervisor cambios en sus reportes. |
| **Supervisor** | Asigna con dificultad, especialidad y técnico según turno; resuelve pendientes; edita reportes; rack de habitaciones; personal, turnos y materiales; indicadores. |

Prioridad: **Ocupada → Urgente**, **Reservada → Alta**, **Libre → la mucama elige** (Alta, Media o Baja). Urgente y Alta solo las asigna el supervisor.

## Tecnología

- **Base de datos:** MySQL 8 (utf8mb4), con migraciones versionadas.
- **Backend:** Node.js + Express + TypeScript, `mysql2`, `zod`, `bcryptjs`, `helmet`; tiempo real por Server-Sent Events.
- **Frontend:** React + Vite + Tailwind + TanStack Query; PWA instalable.
- **Calidad:** ESLint, Prettier, pruebas con `node:test`, GitHub Actions.

## Puesta en marcha (Windows)

Requisitos: Node.js 20 o superior y MySQL 8 iniciado.

1. Copia `backend/.env.example` a `backend/.env` y completa `DB_PASSWORD`.
2. Ejecuta **`iniciar_proyecto.bat`**. Crea o actualiza la base (`npm run semilla`) y abre la API y la interfaz.
3. Abre `http://localhost:5173`. Usuarios de prueba: [docs/ACCESO.md](docs/ACCESO.md).

Desde el celular (misma red Wi-Fi): `http://IP_DE_LA_PC:5173`. La IP se ve con `ipconfig`.

Para el uso diario, **`iniciar_produccion.bat`** compila todo, hace un respaldo, aplica migraciones y sirve el sistema en un solo puerto (`http://localhost:3000`).

Con Docker: `docker compose up -d --build`.

### Comandos útiles (en `backend/`)

| Comando | Para qué |
| --- | --- |
| `npm run migrar` | Aplica cambios pendientes a la base, sin borrar datos |
| `npm run semilla` | Migra y carga catálogos + datos de prueba (solo lo que falta) |
| `npm run clave -- 5 NuevaClave` | Cambia la contraseña de un empleado |
| `npm run respaldo` | Guarda la base en `backups/` (conserva los últimos 30) |
| `npm test` | Pruebas sobre una base temporal (no toca la real) |

`GET /api/salud` indica si MySQL responde y si faltan migraciones.

## Notificaciones con la app cerrada

Requieren HTTPS (o `localhost`) y claves VAPID:

```powershell
cd F:\hotelcortez\backend; npx web-push generate-vapid-keys
```

Copia las claves a `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en `backend/.env`. Cada persona las activa en **Mi perfil → Activar notificaciones**. Por `http://IP:puerto` los avisos llegan solo con la app abierta (tiempo real).

## Estructura

```text
backend/    API modular (ver docs/ARQUITECTURA.md)
frontend/   Interfaz web/PWA
database/   esquema_v3.sql: referencia del modelo (no se ejecuta)
docs/       ACCESO, ARQUITECTURA, diseño y análisis del diagrama
backups/    Respaldos locales (no se suben a Git)
```

Para hacer cambios sin romper lo existente, sigue [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
