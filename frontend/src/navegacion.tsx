// REGISTRO DE PANTALLAS. Para agregar una pantalla nueva:
//   1. Crea el componente en src/pages/<rol>/.
//   2. Agrega una entrada aquí (ruta, texto, icono, roles, componente).
// El menú lateral, la barra inferior del celular y las rutas se generan solos.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, BedDouble, ClipboardList, FilePlus2, FileWarning, LayoutGrid, ListChecks, Package, User, Users, Wrench, Inbox } from 'lucide-react';
import type { Rol } from './types';

export type Pantalla = {
    ruta: string;
    texto: string;
    icono: LucideIcon;
    roles: Rol[];
    componente: LazyExoticComponent<ComponentType>;
    /** Aparece en la barra inferior del celular (máx. 4 por rol). */
    principal?: boolean;
    /** Rutas hijas (detalle) que no aparecen en el menú. */
    detalle?: { ruta: string; componente: LazyExoticComponent<ComponentType> };
};

export const PANTALLAS: Pantalla[] = [
    // Mucama
    {
        ruta: '/solicitar',
        texto: 'Solicitar',
        icono: FilePlus2,
        roles: ['MUCAMA'],
        principal: true,
        componente: lazy(() => import('./pages/mucama/Solicitar'))
    },
    {
        ruta: '/mis-solicitudes',
        texto: 'Mis solicitudes',
        icono: ClipboardList,
        roles: ['MUCAMA'],
        principal: true,
        componente: lazy(() => import('./pages/mucama/MisSolicitudes'))
    },

    // Técnico
    {
        ruta: '/asignaciones',
        texto: 'Asignaciones',
        icono: Wrench,
        roles: ['TECNICO'],
        principal: true,
        componente: lazy(() => import('./pages/tecnico/Asignaciones')),
        detalle: { ruta: '/asignaciones/:id', componente: lazy(() => import('./pages/tecnico/DetalleTecnico')) }
    },
    {
        ruta: '/mis-reportes',
        texto: 'Mis reportes',
        icono: ListChecks,
        roles: ['TECNICO'],
        principal: true,
        componente: lazy(() => import('./pages/tecnico/MisReportes'))
    },

    // Supervisor
    {
        ruta: '/solicitudes',
        texto: 'Solicitudes',
        icono: Inbox,
        roles: ['SUPERVISOR'],
        principal: true,
        componente: lazy(() => import('./pages/supervisor/Solicitudes')),
        detalle: { ruta: '/solicitudes/:id', componente: lazy(() => import('./pages/supervisor/Asignar')) }
    },
    {
        ruta: '/reportes',
        texto: 'Reportes',
        icono: FileWarning,
        roles: ['SUPERVISOR'],
        principal: true,
        componente: lazy(() => import('./pages/supervisor/Reportes'))
    },
    {
        ruta: '/incidentes',
        texto: 'Incidentes',
        icono: LayoutGrid,
        roles: ['SUPERVISOR'],
        principal: true,
        componente: lazy(() => import('./pages/supervisor/Incidentes')),
        detalle: { ruta: '/incidentes/:id', componente: lazy(() => import('./pages/supervisor/DetalleIncidente')) }
    },
    { ruta: '/rack', texto: 'Rack de habitaciones', icono: BedDouble, roles: ['SUPERVISOR'], componente: lazy(() => import('./pages/supervisor/Rack')) },
    { ruta: '/indicadores', texto: 'Indicadores', icono: BarChart3, roles: ['SUPERVISOR'], componente: lazy(() => import('./pages/supervisor/Indicadores')) },
    { ruta: '/personal', texto: 'Personal y turnos', icono: Users, roles: ['SUPERVISOR'], componente: lazy(() => import('./pages/supervisor/Personal')) },
    { ruta: '/materiales', texto: 'Materiales', icono: Package, roles: ['SUPERVISOR'], componente: lazy(() => import('./pages/supervisor/Materiales')) },

    // Todos
    { ruta: '/perfil', texto: 'Mi perfil', icono: User, roles: ['MUCAMA', 'TECNICO', 'SUPERVISOR'], componente: lazy(() => import('./pages/Perfil')) }
];

export const pantallasDe = (rol: Rol) => PANTALLAS.filter(p => p.roles.includes(rol));
export const inicioDe = (rol: Rol) => pantallasDe(rol)[0]?.ruta || '/perfil';
