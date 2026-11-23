// Piezas de formulario reutilizables: materiales usados y selector de foto.
import { useId, useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';
import { comprimirFoto } from '../lib/imagen';
import type { Material, MaterialEntrada } from '../types';

export type FilaMaterial = { nombre: string; cantidad: string };

export const filaVacia = (): FilaMaterial => ({ nombre: '', cantidad: '1' });

/** Convierte las filas del formulario en lo que espera la API (por id si existe en el catálogo). */
export function materialesParaApi(filas: FilaMaterial[], catalogo: Material[]): MaterialEntrada[] {
    return filas
        .filter(f => f.nombre.trim())
        .map(f => {
            const cantidad = Number(f.cantidad.replace(',', '.'));
            const m = catalogo.find(x => x.nombre.toLowerCase() === f.nombre.trim().toLowerCase());
            return m ? { id_material: m.id_material, cantidad } : { nombre: f.nombre.trim(), cantidad };
        });
}

export function validarMateriales(filas: FilaMaterial[]) {
    for (const f of filas) {
        if (!f.nombre.trim()) continue;
        const n = Number(f.cantidad.replace(',', '.'));
        if (!(n > 0)) return `Revisa la cantidad de "${f.nombre}".`;
    }
    return null;
}

export function EditorMateriales({ filas, onChange, catalogo }: { filas: FilaMaterial[]; onChange: (f: FilaMaterial[]) => void; catalogo: Material[] }) {
    const lista = useId();
    const cambiar = (i: number, cambio: Partial<FilaMaterial>) => onChange(filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
    return (
        <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-hotel-dark mb-1">Material usado</legend>
            <datalist id={lista}>
                {catalogo
                    .filter(m => m.activo)
                    .map(m => (
                        <option key={m.id_material} value={m.nombre}>
                            {m.stock !== null ? `Stock: ${m.stock} ${m.unidad}` : m.unidad}
                        </option>
                    ))}
            </datalist>
            {filas.map((f, i) => {
                const m = catalogo.find(x => x.nombre.toLowerCase() === f.nombre.trim().toLowerCase());
                return (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            list={lista}
                            maxLength={80}
                            value={f.nombre}
                            onChange={e => cambiar(i, { nombre: e.target.value })}
                            placeholder="Material (elige de la lista o escribe uno nuevo)"
                            className="flex-1 min-w-0"
                            aria-label="Material"
                        />
                        <input
                            inputMode="decimal"
                            value={f.cantidad}
                            onChange={e => cambiar(i, { cantidad: e.target.value.replace(/[^\d.,]/g, '') })}
                            className="w-20 text-center font-semibold"
                            aria-label="Cantidad"
                        />
                        <span className="w-14 text-[11px] text-hotel-textMuted truncate">{m?.unidad || ''}</span>
                        {filas.length > 1 && (
                            <button
                                type="button"
                                onClick={() => onChange(filas.filter((_, j) => j !== i))}
                                className="p-2.5 rounded-xl border border-[#D8D0BE] hover:bg-red-50 hover:text-red-700"
                                aria-label="Quitar material"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                );
            })}
            <button type="button" onClick={() => onChange([...filas, filaVacia()])} className="beta-secondary">
                <Plus size={14} /> Agregar material
            </button>
        </fieldset>
    );
}

export function SelectorFoto({
    valor,
    onChange,
    onError,
    etiqueta = 'Foto (opcional)'
}: {
    valor: string;
    onChange: (v: string) => void;
    onError: (m: string) => void;
    etiqueta?: string;
}) {
    const [procesando, setProcesando] = useState(false);
    return (
        <div className="space-y-2">
            <label className="beta-label">
                <span className="flex items-center gap-2">
                    <Camera size={16} /> {etiqueta}
                </span>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={procesando}
                    onChange={async e => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        setProcesando(true);
                        try {
                            onChange(await comprimirFoto(f));
                        } catch (err) {
                            onError((err as Error).message);
                        } finally {
                            setProcesando(false);
                        }
                    }}
                />
            </label>
            {procesando && <p className="text-xs text-hotel-textMuted">Preparando foto…</p>}
            {valor && (
                <div className="flex items-end gap-3">
                    <img src={valor} alt="Vista previa" className="max-h-40 rounded-xl" />
                    <button type="button" className="beta-secondary" onClick={() => onChange('')}>
                        Quitar foto
                    </button>
                </div>
            )}
        </div>
    );
}
