// Formatos de fecha y hora como en el diseño: 25/11/26 · 1:00 pm
const aFecha = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

export function fecha(v: string | Date | null | undefined) {
    const d = aFecha(v);
    if (!d || isNaN(+d)) return '—';
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function hora(v: string | Date | null | undefined) {
    const d = aFecha(v);
    if (!d || isNaN(+d)) return '—';
    const h = d.getHours(),
        m = String(d.getMinutes()).padStart(2, '0');
    return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export const fechaHora = (v: string | Date | null | undefined) => (v ? `${fecha(v)} · ${hora(v)}` : '—');

/** "hace 5 min", "hace 2 h", "hace 3 d" */
export function hace(v: string | null | undefined) {
    const d = aFecha(v);
    if (!d) return '';
    const min = Math.round((Date.now() - +d) / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    if (min < 1440) return `hace ${Math.round(min / 60)} h`;
    return `hace ${Math.round(min / 1440)} d`;
}

/** Minutos → "45 min" / "3 h 10 min" / "2 d 4 h" */
export function duracion(min: number | null | undefined) {
    if (min === null || min === undefined || isNaN(Number(min))) return '—';
    const m = Number(min);
    if (m < 60) return `${m} min`;
    if (m < 1440) return `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim();
    return `${Math.floor(m / 1440)} d ${Math.round((m % 1440) / 60)} h`;
}

export const cantidad = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2).replace(/0$/, ''));
