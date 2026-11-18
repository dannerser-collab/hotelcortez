# 🏨 Sistema de Gestión de Mantenimiento - Hotel Cortéz (CMMS)

Sistema integral de gestión, trazabilidad y analítica de mantenimiento para el **Hotel Cortéz**, diseñado para estandarizar las solicitudes operativas (housekeeping), eliminar la dependencia de mensajes de WhatsApp y tablas dispersas en Excel, y proveer indicadores de rendimiento en tiempo real accesibles tanto desde teléfonos móviles (PWA) como desde PC (Web Admin).

---

## 📁 Estructura del Proyecto

```text
hotelcortez/
├── database/
│   ├── 01_schema.sql        # Script DDL (Tablas, Claves Foráneas, Índices) para MySQL 8.0
│   └── 02_seed.sql          # Catálogo inicial de datos (Pisos, Habitaciones, Especialidades, Usuarios)
├── backend/                 # API REST (Node.js + Express + TypeScript + driver mysql2) [Fase 2]
├── frontend/                # Aplicación Web & PWA Móvil (React + Vite + Tailwind CSS) [Fase 3]
├── .gitignore               # Archivos y credenciales excluidas del repositorio
└── README.md                # Documentación del proyecto
```

---

## 🗄️ Carga de Base de Datos en MySQL Workbench

Para levantar la base de datos en tu equipo local:

1. Abre **MySQL Workbench** y conéctate a tu instancia local (`Local instance MySQL80`).
2. Ve al menú superior: **File** $\rightarrow$ **Open SQL Script...** (o presiona `Ctrl + O`).
3. Selecciona el archivo `database/01_schema.sql` y presiona el botón del **Rayo (Execute)**.
4. Repite el proceso con el archivo `database/02_seed.sql` para poblar los datos de prueba.
5. Haz clic derecho en el panel izquierdo sobre **SCHEMAS** y selecciona **Refresh All**. Verás la base de datos `hotel_cortez` lista con todas sus tablas e índices.

### 👤 Usuarios y Credenciales de Prueba

| Nombre | Rol del Sistema | Correo de Acceso | Contraseña de Prueba |
| :--- | :--- | :--- | :--- |
| Carlos Mendoza | `ADMIN` (Gerencia) | `gerencia@hotelcortez.com` | `Password123*` |
| Ing. Roberto Paz | `SUPERVISOR` (Jefe Mantenimiento) | `mantenimiento@hotelcortez.com` | `Password123*` |
| María Condori | `OPERATIVO` (Gobernanza) | `gobernanza@hotelcortez.com` | `Password123*` |
| Juan Quispe | `TECNICO` (Climatización / HVAC) | `juan.hvac@hotelcortez.com` | `Password123*` |
| Luis Flores | `TECNICO` (Plomería) | `luis.plomero@hotelcortez.com` | `Password123*` |
| David Vargas | `TECNICO` (Electricidad) | `david.electrico@hotelcortez.com` | `Password123*` |

---

## 🛠️ Tecnologías Empleadas

* **Base de Datos:** MySQL 8.0 (Motor InnoDB, codificación UTF-8 mb4, SQL Puro).
* **Backend:** Node.js, Express, TypeScript, `mysql2`, JWT, Bcrypt.
* **Frontend:** React, Vite, Tailwind CSS (PWA instalable).
* **Control de Versiones:** Git y GitHub.


## Versión beta con acceso por rol

Consulta [la guía de la beta](docs/BETA.md) para preparar la migración aditiva, iniciar los servidores, acceder con ID y contraseña y probar desde celular y PC. La beta usa los roles y las tablas del modelo V2; la lista antigua de correos y contraseñas de este README corresponde al prototipo anterior.
