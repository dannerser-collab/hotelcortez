# Acceso de prueba

Estas cuentas las crea `npm run semilla` (archivo `backend/src/db/semilla.ts`). Solo se asigna la contraseña a empleados que **todavía no tienen una**; si alguien la cambia desde *Mi perfil*, se conserva.

Se ingresa con el **código de empleado** (también sirve solo el número: `E-0005` = `5`).

| Código | Nombre | Rol | Turno | Contraseña de prueba |
| --- | --- | --- | --- | --- |
| E-0001 | María Fernanda López | Mucama | Mañana | `Mucama2026!` |
| E-0006 | Rosa Quispe | Mucama | Tarde | `Mucama2026!` |
| E-0002 | Jorge Paredes | Técnico | Mañana | `Tecnico2026!` |
| E-0003 | Carlos Ruiz | Técnico | Tarde | `Tecnico2026!` |
| E-0004 | Luis Torres | Técnico | Noche | `Tecnico2026!` |
| E-0005 | Roberto Paz | Supervisor | Mañana | `Super2026!` |

- Las habitaciones de los pisos 1 a 3 están asignadas a María Fernanda; las demás, a la primera mucama activa. El supervisor las reasigna en **Rack de habitaciones**.
- Una persona nueva usa **Solicitar acceso** en la pantalla de ingreso; el supervisor la aprueba en **Personal y turnos**.
- Para cambiar una contraseña desde la consola: `npm run clave -- 3 NuevaClave123` (en `backend/`).

> Antes de usar el sistema con personal real, cambia todas estas contraseñas.
