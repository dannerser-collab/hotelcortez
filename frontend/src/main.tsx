import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ProveedorSesion } from './hooks/sesion';
import { registrarServiceWorker } from './lib/push';
import './index.css';

const qc = new QueryClient({
    defaultOptions: {
        queries: {
            // El tiempo real (SSE) refresca al instante; esto es solo respaldo si se corta la conexión
            refetchInterval: 60_000,
            refetchOnWindowFocus: true,
            retry: 1,
            staleTime: 10_000
        }
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={qc}>
            <BrowserRouter>
                <ProveedorSesion>
                    <App />
                </ProveedorSesion>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
);

registrarServiceWorker();
