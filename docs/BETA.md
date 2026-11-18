# Beta de mantenimiento — Hotel Cortéz

## Acceso

| ID | Rol |
| --- | --- |
| 1 | Mucama |
| 2, 3, 4 | Técnico |
| 5 | Supervisor |

Contraseña beta compartida: `admin123`. Se puede sustituir con `BETA_PASSWORD` en `backend/.env`.
La cuenta y su rol se consultan en MySQL. Las sesiones duran ocho horas, se invalidan al cerrar sesión y se pierden si reinicias la API. No se guardan contraseñas en el navegador.

## Preparación e inicio

Desde `F:\hotelcortez\backend`, ejecuta una vez `node prepare-beta.mjs`. Es una migración aditiva para fotografías; no ejecutes el esquema antiguo para actualizar una base existente, porque contiene DROP TABLE.

Para iniciar usa `iniciar_proyecto.bat`, o dos terminales:

```powershell
cd F:\hotelcortez\backend
npm run dev
```

```powershell
cd F:\hotelcortez\frontend
npm run dev
```

Abre `http://localhost:5173`. Vite falla si el puerto está ocupado, para evitar abrir otra instancia por error. MySQL debe estar iniciado. `/api/salud` comprueba la base de datos; un proceso escuchando por sí solo no demuestra conexión.

## Celular y PC

Conecta ambos dispositivos a la misma red. Inicia Vite con acceso de red (configurado en vite.confi

g.ts), busca la IPv4 de la PC con `ipconfig` y abre en el celular `http://IP_DE_LA_PC:5173`. En el celular, `localhost` apunta al celular. Vite redirige las consultas a la API de la PC; no hace falta abrir el puerto MySQL al teléfono. La red y el firewall deben permitir el acceso a Vite.

En el celular inicia como ID 1. En otra sesión/navegador de la PC inicia como ID 2; el supervisor usa ID 5. Cada pestaña conserva su propia sesión. Envía una solicitud con habitación, descripción y foto opcional JPG/PNG/WebP de hasta 2 MB. El técnico verá los datos y un aviso dentro de la página en la siguiente actualización (cada cuatro segundos). El aviso requiere la página abierta; esta beta no implementa notificaciones push con la aplicación cerrada.

El técnico toma la solicitud, registra tipo de avería, prioridad, diagnóstico y materiales. Solo el técnico asignado puede finalizarla. Si quedan otras solicitudes sin resolver en esa habitación, permanece en mantenimiento. El supervisor tiene el Rack, detalle de habitación, solicitudes, incidentes y asignaciones. La mucama ve su propio historial. Los botones de otros módulos del prototipo dejaron de estar expuestos en la beta.

Las habitaciones se seleccionan del catálogo real; no se inventan habitaciones a partir del número. El Rack tiene búsqueda, filtro por piso, filtro por fallas y detalle real. No se muestra ocupación hotelera ficticia: esta base maneja estado de mantenimiento, no reservas.

## Verificación

```powershell
cd F:\hotelcortez\backend
npm run build
```

```powershell
cd F:\hotelcortez\frontend
npm run build
```

Con una API de prueba en el puerto 3001: `node backend/test-beta.mjs` desde la raíz. Alternativamente define `TEST_API` con la URL `/api` de tu instancia. La prueba crea una solicitud identificada `[PRUEBA BETA]`, la atiende y resuelve, conservando el historial. Comprueba contraseña incorrecta, sesiones, permisos, historial propio, rechazo de habitación inexistente, foto, recepción, concurrencia entre técnicos, materiales y cierre. No ejecuta borrados.

La verificación entre un teléfono físico y la PC debe hacerse en la red donde se utilizará el sistema. Las pruebas automáticas de API no sustituyen esa comprobación de conectividad.

El supervisor puede asignar o reasignar habitaciones a una mucama desde «Asignar habitaciones». La mucama solo puede reportar habitaciones asignadas a su ID; el servidor comprueba esta restricción. La preparación inicial asigna las habitaciones sin responsable a la primera mucama activa, sin reemplazar asignaciones existentes.
