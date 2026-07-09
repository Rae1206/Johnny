// Pantalla PRINCIPAL: tareas recientes con búsqueda, filtros y "mis tareas".
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import TaskModal from '../components/TaskModal.jsx';
import TaskDetailModal from '../components/TaskDetailModal.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { PRIORIDADES, formatFecha, esVencida, iniciales } from '../lib/ui.js';
import {
  FontAwesomeIcon, faPlus, faTrashCan, faCalendarDay, faDiagramProject,
  faMagnifyingGlass, faTriangleExclamation, faUser,
} from '../lib/icons.js';

export default function TasksPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prioridad, setPrioridad] = useState('');
  const [estado, setEstado] = useState('');
  const [mias, setMias] = useState(false);
  const [q, setQ] = useState('');
  const [qDebounce, setQDebounce] = useState('');
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);

  // Debounce de la búsqueda.
  useEffect(() => {
    const id = setTimeout(() => setQDebounce(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  async function cargar() {
    setLoading(true);
    try {
      const params = {};
      if (prioridad) params.prioridad = prioridad;
      if (estado) params.estado = estado;
      if (mias) params.mias = 1;
      if (qDebounce.trim()) params.q = qDebounce.trim();
      const { data } = await api.get('/tareas', { params });
      setTareas(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [prioridad, estado, mias, qDebounce]);

  async function toggleCompletada(tarea, e) {
    e.stopPropagation();
    const { data } = await api.put(`/tareas/${tarea.id}`, { completada: !tarea.completada });
    setTareas((t) => t.map((x) => (x.id === tarea.id ? data : x)));
  }

  async function eliminar(tarea, e) {
    e.stopPropagation();
    const ok = await confirm({ title: 'Eliminar tarea', message: `¿Eliminar "${tarea.titulo}"?`, confirmText: 'Eliminar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/tareas/${tarea.id}`);
      setTareas((t) => t.filter((x) => x.id !== tarea.id));
    } catch (err) {
      await confirm({ title: 'No se pudo eliminar', message: err.response?.data?.error || 'Error', confirmText: 'Entendido' });
    }
  }

  const filtroCls = 'rounded-lg border border-brand-sage/60 px-3 py-2 text-sm';

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-ink">Tareas recientes</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-forest">
          <FontAwesomeIcon icon={faPlus} /> Nueva tarea
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-forest/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tareas…"
            className="w-full rounded-lg border border-brand-sage/60 py-2 pl-9 pr-3 text-sm focus:border-brand-teal focus:outline-none" />
        </div>
        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={filtroCls}>
          <option value="">Todas las prioridades</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={filtroCls}>
          <option value="">Todos los estados</option><option value="pendiente">Pendientes</option><option value="completada">Completadas</option>
        </select>
        <button onClick={() => setMias((m) => !m)}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${mias ? 'bg-brand-teal text-white' : 'bg-brand-sage/20 text-brand-forest hover:bg-brand-sage/30'}`}>
          <FontAwesomeIcon icon={faUser} className="mr-1.5" /> Mis tareas
        </button>
      </div>

      {loading ? (
        <p className="text-brand-forest/70">Cargando…</p>
      ) : tareas.length === 0 ? (
        <p className="text-brand-forest/70">No hay tareas con estos filtros.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tareas.map((tarea) => {
            const prio = PRIORIDADES[tarea.prioridad] || PRIORIDADES.media;
            const fecha = formatFecha(tarea.fecha_limite);
            const vencida = esVencida(tarea.fecha_limite, tarea.completada);
            return (
              <div key={tarea.id} onClick={() => setDetalle(tarea)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 shadow-sm hover:border-brand-teal ${vencida ? 'border-l-4 border-l-brand-ink' : ''}`}>
                <input type="checkbox" checked={Boolean(tarea.completada)} onChange={(e) => toggleCompletada(tarea, e)} onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 shrink-0 accent-brand-teal" />
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${prio.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${tarea.completada ? 'text-brand-forest/50 line-through' : 'text-brand-ink'}`}>{tarea.titulo}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {tarea.proyecto_id ? (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/proyectos/${tarea.proyecto_id}`); }}
                        className="flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-forest hover:bg-brand-sage/30" title="Ir al proyecto">
                        <FontAwesomeIcon icon={faDiagramProject} /> {tarea.proyecto_nombre}
                      </button>
                    ) : <span className="text-xs text-brand-forest/50">Sin proyecto</span>}
                    {tarea.etiquetas?.map((et) => (
                      <span key={et.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: et.color }}>{et.nombre}</span>
                    ))}
                    {fecha && (
                      <span className={`flex items-center gap-1 text-xs ${vencida ? 'font-semibold text-brand-ink' : 'text-brand-forest/70'}`}>
                        <FontAwesomeIcon icon={vencida ? faTriangleExclamation : faCalendarDay} /> {fecha}{vencida ? ' · vencida' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {tarea.asignado_nombre && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal text-[10px] font-bold text-white" title={tarea.asignado_nombre}>
                    {iniciales(tarea.asignado_nombre)}
                  </span>
                )}
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${prio.badge}`}>{prio.label}</span>
                <button onClick={(e) => eliminar(tarea, e)} className="shrink-0 rounded p-2 text-brand-forest hover:bg-brand-sage/20" title="Eliminar" aria-label="Eliminar tarea">
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modal && <TaskModal onClose={() => setModal(false)} onSaved={(t) => setTareas((x) => [t, ...x])} />}
      {detalle && <TaskDetailModal tarea={detalle} onClose={() => setDetalle(null)}
        onChanged={(id, etiquetas) => setTareas((t) => t.map((x) => (x.id === id ? { ...x, etiquetas } : x)))} />}
    </div>
  );
}
