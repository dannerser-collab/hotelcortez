import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSesion } from './hooks/sesion';
import { ProveedorAvisos } from './hooks/avisos';
import { Layout } from './components/Layout';
import { Cargando } from './components/ui';
import { inicioDe, pantallasDe } from './navegacion';
import { useNotificacionesPush } from './lib/push';
import Acceso from './pages/Acceso';

export default function App() {
    const { usuario, cargando } = useSesion();
    if (cargando)
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Cargando texto="Verificando sesión…" />
            </div>
        );
    if (!usuario)
        return (
            <ProveedorAvisos enLinea={false}>
                <Acceso />
            </ProveedorAvisos>
        );
    return (
        <ProveedorAvisos enLinea>
            <AreaPersonal />
        </ProveedorAvisos>
    );
}

function AreaPersonal() {
    const { usuario } = useSesion();
    useNotificacionesPush();
    const pantallas = pantallasDe(usuario!.rol);
    return (
        <Suspense fallback={<Cargando />}>
            <Routes>
                <Route element={<Layout />}>
                    {pantallas.map(p => (
                        <Route key={p.ruta} path={p.ruta} element={<p.componente />} />
                    ))}
                    {pantallas.flatMap(p => {
                        if (!p.detalle) return [];
                        const Detalle = p.detalle.componente;
                        return [<Route key={p.detalle.ruta} path={p.detalle.ruta} element={<Detalle />} />];
                    })}
                    <Route path="*" element={<Navigate to={inicioDe(usuario!.rol)} replace />} />
                </Route>
            </Routes>
        </Suspense>
    );
}
