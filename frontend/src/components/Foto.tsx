// Las fotos están protegidas: se piden con el token y se muestran como blob.
import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { token } from '../lib/api';

export function Foto({ archivo, alt, className = 'max-h-56 rounded-xl' }: { archivo: string; alt: string; className?: string }) {
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [ampliada, setAmpliada] = useState(false);

    useEffect(() => {
        let vivo = true,
            creada = '';
        fetch('/api/fotos/' + encodeURIComponent(archivo), { headers: { Authorization: 'Bearer ' + token.leer() } })
            .then(r => (r.ok ? r.blob() : Promise.reject()))
            .then(b => {
                creada = URL.createObjectURL(b);
                if (vivo) setUrl(creada);
            })
            .catch(() => vivo && setError(true));
        return () => {
            vivo = false;
            if (creada) URL.revokeObjectURL(creada);
        };
    }, [archivo]);

    if (error)
        return (
            <p className="flex items-center gap-2 text-xs text-hotel-textMuted">
                <ImageOff size={14} /> Foto no disponible
            </p>
        );
    if (!url) return <div className={className + ' bg-[#EDE8DC] animate-pulse w-40 h-28'} />;
    return (
        <>
            <button type="button" onClick={() => setAmpliada(true)} className="block" aria-label="Ampliar foto">
                <img src={url} alt={alt} className={className + ' object-cover'} />
            </button>
            {ampliada && (
                <div
                    className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setAmpliada(false)}
                    role="dialog"
                    aria-label={alt}
                >
                    <img src={url} alt={alt} className="max-w-full max-h-full rounded-xl" />
                </div>
            )}
        </>
    );
}
