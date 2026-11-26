// Supervisor · Materiales: catálogo con unidad y stock (se descuenta al reportar).
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { CLAVES, useAccion, useCatalogos } from '../../hooks/datos';
import { useAvisos } from '../../hooks/avisos';
import { Boton, Campo, Cargando, ErrorCarga, Pagina, Panel } from '../../components/ui';
import type { Material } from '../../types';

export default function Materiales() {
    const { data: cat, isLoading, error, refetch } = useCatalogos();
    const { avisar } = useAvisos();
    const [buscar, setBuscar] = useState('');
    const [nuevo, setNuevo] = useState({ nombre: '', unidad: 'unidad', stock: '' });
    const crear = useAccion((d: object) => api('/materiales', { cuerpo: d }), [CLAVES.catalogos]);
    const editar = useAccion((v: { id: number; d: object }) => api('/materiales/' + v.id, { metodo: 'PATCH', cuerpo: v.d }), [CLAVES.catalogos]);

    if (isLoading) return <Cargando />;
    if (error || !cat) return <ErrorCarga error={error} reintentar={refetch} />;
    const lista = cat.materiales.filter(m => m.nombre.toLowerCase().includes(buscar.toLowerCase()));
    const guardar = (m: Material, d: object) => editar.mutateAsync({ id: m.id_material, d }).catch(e => avisar(e.message, 'error'));

    async function enviar(e: FormEvent) {
        e.preventDefault();
        try {
            await crear.mutateAsync({ nombre: nuevo.nombre, unidad: nuevo.unidad, stock: nuevo.stock === '' ? null : Number(nuevo.stock) });
            avisar('Material agregado.');
            setNuevo({ nombre: '', unidad: 'unidad', stock: '' });
        } catch (er) {
            avisar((er as Error).message, 'error');
        }
    }

    return (
        <Pagina titulo="Materiales" subtitulo="El stock se descuenta solo cuando un técnico reporta materiales usados. Deja el stock vacío si no se controla.">
            <Panel titulo="Agregar material">
                <form onSubmit={enviar} className="grid sm:grid-cols-[1fr_140px_120px_auto] gap-3 items-end">
                    <Campo etiqueta="Nombre">
                        <input required maxLength={80} value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
                    </Campo>
                    <Campo etiqueta="Unidad">
                        <input required maxLength={20} value={nuevo.unidad} onChange={e => setNuevo({ ...nuevo, unidad: e.target.value })} list="unidades" />
                    </Campo>
                    <datalist id="unidades">
                        {['unidad', 'metro', 'litro', 'rollo', 'pack', 'kg'].map(u => (
                            <option key={u} value={u} />
                        ))}
                    </datalist>
                    <Campo etiqueta="Stock">
                        <input inputMode="numeric" value={nuevo.stock} onChange={e => setNuevo({ ...nuevo, stock: e.target.value.replace(/\D/g, '') })} />
                    </Campo>
                    <Boton cargando={crear.isPending}>
                        <Plus size={16} /> Agregar
                    </Boton>
                </form>
            </Panel>
            <Panel
                titulo={`Catálogo (${cat.materiales.length})`}
                acciones={<input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar…" className="!py-2 w-48" />}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wide text-hotel-textMuted">
                                <th className="py-2 pr-3">Material</th>
                                <th className="py-2 pr-3">Unidad</th>
                                <th className="py-2 pr-3">Stock</th>
                                <th className="py-2">Activo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map(m => (
                                <tr key={m.id_material} className={'border-t border-[#EDE8DC] ' + (m.stock !== null && m.stock <= 3 ? 'bg-[#FFF4F2]' : '')}>
                                    <td className="py-2 pr-3 font-semibold">{m.nombre}</td>
                                    <td className="py-2 pr-3">
                                        <input
                                            className="!py-1.5 w-28"
                                            defaultValue={m.unidad}
                                            onBlur={e => e.target.value !== m.unidad && e.target.value.trim() && void guardar(m, { unidad: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <input
                                            className="!py-1.5 w-24"
                                            inputMode="numeric"
                                            defaultValue={m.stock ?? ''}
                                            placeholder="—"
                                            onBlur={e => {
                                                const v = e.target.value.trim() === '' ? null : Number(e.target.value);
                                                if (v !== m.stock && (v === null || (Number.isInteger(v) && v >= 0))) void guardar(m, { stock: v });
                                            }}
                                        />
                                        {m.stock !== null && m.stock <= 3 && <span className="ml-2 text-[11px] font-bold text-red-700">Bajo</span>}
                                    </td>
                                    <td className="py-2">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(m.activo)}
                                            onChange={e => void guardar(m, { activo: e.target.checked })}
                                            aria-label={'Activo: ' + m.nombre}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </Pagina>
    );
}
