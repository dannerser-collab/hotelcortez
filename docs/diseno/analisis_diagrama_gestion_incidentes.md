# Análisis del diagrama físico «gestion_incidentes»

Veredicto: **mejora lo funcional, empeora lo estructural.** Se incorporó lo que aporta al modelo V3 (migración `0002_modelo_v3`) y se descartó lo que generaría errores.

## Lo que se tomó

| Del diagrama | Cómo quedó en V3 |
| --- | --- |
| `Turno` | Tabla `turno` **con horario** (`hora_inicio`, `hora_fin`) para saber quién está de turno y marcar «ya pasó su hora». |
| `CI` en empleado | `empleado.ci` único. |
| `tipo_hab` | Tabla `tipo_habitacion`; `habitacion.id_tipo_hab`. |
| `Dificultad` | Tabla `dificultad` (Fácil, Medio, Difícil); la elige el supervisor al asignar. |
| `Especialidad` en el incidente | `asignacion.id_especialidad`, la elige el supervisor (antes salía de un «tipo de incidente»). |
| `Reparaciones` + `Pendiente` | Tabla `reporte` con `resultado` HECHO/PENDIENTE y `motivo_pendiente`. **Un trabajo puede tener varios reportes** (pendiente → luego hecho). |
| `Mat_RepTec` | `reporte_material` con `cantidad DECIMAL` (sirve para metros de cable, litros, etc.). |
| `Modificaciones` | `solicitud_modificacion`: quién la pide, qué cambiar, estado y quién la atendió. |
| Pantalla «Registro» | Cuenta nueva en estado «Pendiente de aprobación»; el supervisor la aprueba. |

## Lo que no se tomó y por qué

1. **Claves `VARCHAR(50)`** (`id_Solicitud`, `id_Empleado`…): nadie las genera, son más lentas y permiten duplicados como «S1» y «s1». Se mantienen enteros autoincrementales y en pantalla se muestran códigos legibles (`E-0042`, `INC-003`).
2. **Mayúsculas mezcladas en nombres de tablas** (`Bloque`, `tipo_hab`, `Hab_Sol`): en MySQL sobre Linux los nombres distinguen mayúsculas y el sistema fallaría al llevarlo a un servidor. Todo en minúsculas.
3. **Fecha y hora separadas** (`fecha_i` + `hora_i`, `fecha_A` + `hora_A`…): impiden calcular tiempos de respuesta. Se usa `DATETIME`.
4. **`Incidentes` repite `id_Solicitud`, `id_Asignacion` e `id_Reparaciones`**, que ya se encadenan entre sí: pueden quedar apuntando a cosas distintas. En V3 el incidente **es** la solicitud con su asignación y reportes (código `INC-###`).
5. **`Pendiente` 1:1 con `Reparaciones`** y **`Modificaciones` 1:1 con `Incidentes`**: solo permitirían un pendiente y una modificación por incidente, y no guardan quién la pidió ni si se atendió.
6. **`Reparaciones.id_Empleado` y `Asignaciones.id_Empleado`**: el mismo dato dos veces. En V3 la asignación tiene el técnico y el reporte tiene su autor (que puede ser el supervisor al resolver).
7. **Falta contraseña, rol y estado del empleado**: sin eso no hay inicio de sesión ni aprobación de cuentas.
8. **No contempla** fotos, estado de la habitación (libre/ocupada/reservada), qué mucama atiende cada habitación ni stock de materiales, que el sistema ya tenía o necesita.
9. **`Cargo` con «Otro (escribir)»**: un cargo inventado no tiene pantallas ni permisos. Los cargos son los tres roles del sistema.
10. Sin `ENGINE`, `CHARSET`, índices ni reglas `ON DELETE`.

## Del diseño visual (HTML)

Se adoptó la estructura: barra lateral en PC y barra inferior en celular, tarjetas y filas coloreadas por prioridad, pestañas (Nuevas/Pendientes, Pendientes/Modificaciones), selección del técnico según su turno, tabla maestra de incidentes con filtros, perfil propio y registro. Se conservó la paleta del hotel (verde `#004133`/`#005D4F`, dorado `#B9A271`, crema `#F6F4EE`) en lugar del azul del boceto.

En el formulario de la mucama **no** se usaron los desplegables de piso, bloque y tipo con «Otro (escribir)»: la habitación sale del catálogo y el bloque, piso y tipo se completan solos. Así no se registran habitaciones inexistentes.
