// Modal para crear/editar una tarea.
// - Modo tablero: recibe `columnas`, `proyectoId` y `miembros` (para asignar).
// - Modo suelto (desde Tareas): sin `columnas` -> selector de PROYECTO opcional.
import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { FontAwesomeIcon, faXmark } from '../lib/icons.js';

export default function TaskModal({ inicial, proyectoId, columnas, miembros, onClose, onSaved }) {
  const editando = Boolean(inicial?.id);
  const modoTablero = Boolean(columnas);

  const [titulo, setTitulo] = useState(inicial?.titulo || '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || '');
  const [prioridad, setPrioridad] = useState(inicial?.prioridad || 'media');
  const [columnaId, setColumnaId] = useState(inicial?.columna_id || (columnas && columnas[0]?.id) || '');
  const [fechaLimite, setFechaLimite] = useState(inicial?.fecha_limite?.slice(0, 10) || '');
  const [asignadoA, setAsignadoA] = useState(inicial?.asignado_a || '');
  const [proyectoSel, setProyectoSel] = useState(inicial?.proyecto_id || '');
  const [proyectos, setProyectos] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!modoTablero) api.get('/proyectos').then(({ data }) => setProyectos(data)).catch(() => {});
  }, [modoTablero]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (titulo.trim().length < 1) return setError('El título es obligatorio.');
    setSaving(true);

    const payload = { titulo, descripcion, prioridad, fecha_limite: fechaLimite || null };
    if (modoTablero) {
      payload.columna_id = columnaId ? Number(columnaId) : null;
      if (!editando) payload.proyecto_id = proyectoId;
      if (miembros && miembros.length) payload.asignado_a = asignadoA ? Number(asignadoA) : null;
    } else {
      payload.proyecto_id = proyectoSel ? Number(proyectoSel) : null;
    }

    try {
      if (editando) {
        const { data } = await api.put(`/tareas/${inicial.id}`, payload);
        onSaved(data, 'update');
      } else {
        const { data } = await api.post('/tareas', payload);
        onSaved(data, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la tarea.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-ink">{editando ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onClose} className="rounded p-1 text-brand-forest/50 hover:bg-brand-sage/20" aria-label="Cerrar">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-brand-forest">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className={inputCls} />
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" rows={2} className={inputCls} />
          <div className="flex gap-3">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-brand-forest">Prioridad</span>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputCls}>
                <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
              </select>
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-brand-forest">Fecha límite</span>
              <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className={inputCls} />
            </label>
          </div>

          {modoTablero ? (
            <>
              <label className="text-sm">
                <span className="mb-1 block text-brand-forest">Columna</span>
                <select value={columnaId} onChange={(e) => setColumnaId(e.target.value)} className={inputCls}>
                  {columnas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              {miembros && miembros.length > 0 && (
                <label className="text-sm">
                  <span className="mb-1 block text-brand-forest">Responsable</span>
                  <select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} className={inputCls}>
                    <option value="">Sin asignar</option>
                    {miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </label>
              )}
            </>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block text-brand-forest">Proyecto (opcional)</span>
              <select value={proyectoSel} onChange={(e) => setProyectoSel(e.target.value)} className={inputCls}>
                <option value="">Sin proyecto</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-brand-forest hover:bg-brand-sage/20">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-teal px-4 py-2 font-medium text-white hover:bg-brand-forest disabled:opacity-60">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
