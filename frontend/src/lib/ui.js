// Metadatos visuales de prioridad reutilizados por tarjetas y filtros.
// Escala claro -> oscuro (baja = claro, alta = oscuro).
export const PRIORIDADES = {
  baja: { label: 'Baja', badge: 'bg-brand-lime text-brand-forest', dot: 'bg-brand-sage' },
  media: { label: 'Media', badge: 'bg-brand-sage/50 text-brand-ink', dot: 'bg-brand-teal' },
  alta: { label: 'Alta', badge: 'bg-brand-forest text-brand-lime', dot: 'bg-brand-ink' },
};

// Formatea una fecha ISO (o null) a texto corto es-AR.
export function formatFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

// ¿La fecha límite ya pasó y la tarea no está completada?
export function esVencida(fechaLimite, completada) {
  if (!fechaLimite || completada) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaLimite);
  return f < hoy;
}

// Iniciales para el avatar de un nombre.
export function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// Fecha+hora corta para comentarios/actividad.
export function formatFechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
