// Tablero Kanban de un proyecto: drag & drop, responsables, vencidas, detalle.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../lib/api.js';
import TaskModal from '../components/TaskModal.jsx';
import TaskDetailModal from '../components/TaskDetailModal.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { PRIORIDADES, formatFecha, esVencida, iniciales } from '../lib/ui.js';
import {
  FontAwesomeIcon, faPlus, faPen, faTrashCan, faCalendarDay, faArrowLeft, faTriangleExclamation, faUsers,
} from '../lib/icons.js';

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [proyecto, setProyecto] = useState(null);
  const [columnas, setColumnas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detalle, setDetalle] = useState(null);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await api.get(`/proyectos/${id}/tareas`);
      setProyecto(data.proyecto);
      setColumnas(data.columnas);
      setTareas(data.tareas);
      setMiembros(data.miembros || []);
    } catch (err) {
      if (err.response?.status === 404) navigate('/proyectos');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const tareaId = Number(draggableId);
    const nuevaColumna = Number(destination.droppableId);
    const previas = tareas;
    setTareas((t) => t.map((x) => (x.id === tareaId ? { ...x, columna_id: nuevaColumna } : x)));
    try { await api.put(`/tareas/${tareaId}`, { columna_id: nuevaColumna }); }
    catch { setTareas(previas); }
  }

  async function moverConSelect(tareaId, nuevaColumna) {
    const previas = tareas;
    setTareas((t) => t.map((x) => (x.id === tareaId ? { ...x, columna_id: Number(nuevaColumna) } : x)));
    try { await api.put(`/tareas/${tareaId}`, { columna_id: Number(nuevaColumna) }); }
    catch { setTareas(previas); }
  }

  function onSaved(tarea, modo) {
    if (modo === 'create') setTareas((t) => [...t, tarea]);
    else setTareas((t) => t.map((x) => (x.id === tarea.id ? tarea : x)));
  }

  function onEtiquetasCambiadas(tareaId, etiquetas) {
    setTareas((t) => t.map((x) => (x.id === tareaId ? { ...x, etiquetas } : x)));
  }

  async function eliminar(tarea) {
    const ok = await confirm({ title: 'Eliminar tarea', message: `¿Eliminar "${tarea.titulo}"?`, confirmText: 'Eliminar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/tareas/${tarea.id}`);
      setTareas((t) => t.filter((x) => x.id !== tarea.id));
    } catch (err) {
      await confirm({ title: 'No se pudo eliminar', message: err.response?.data?.error || 'Error', confirmText: 'Entendido' });
    }
  }

  if (loading) return <p className="text-brand-forest/70">Cargando tablero…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/proyectos')} className="flex items-center gap-2 text-sm text-brand-teal hover:underline">
            <FontAwesomeIcon icon={faArrowLeft} /> Volver a proyectos
          </button>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-brand-ink">
            {proyecto?.nombre}
            {proyecto?.equipo_nombre && (
              <span className="flex items-center gap-1 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                <FontAwesomeIcon icon={faUsers} /> {proyecto.equipo_nombre}
              </span>
            )}
          </h1>
        </div>
        <button onClick={() => setModal({ nueva: true })} className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-forest">
          <FontAwesomeIcon icon={faPlus} /> Nueva tarea
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columnas.map((col) => {
            const tareasCol = tareas.filter((t) => t.columna_id === col.id);
            return (
              <Droppable droppableId={String(col.id)} key={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`rounded-2xl p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-brand-teal/10' : 'bg-brand-sage/20'}`}>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h3 className="font-semibold text-brand-forest">{col.nombre}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-brand-forest/70">{tareasCol.length}</span>
                    </div>
                    <div className="flex min-h-[40px] flex-col gap-2">
                      {tareasCol.map((tarea, index) => {
                        const prio = PRIORIDADES[tarea.prioridad] || PRIORIDADES.media;
                        const fecha = formatFecha(tarea.fecha_limite);
                        const vencida = esVencida(tarea.fecha_limite, tarea.completada);
                        return (
                          <Draggable draggableId={String(tarea.id)} index={index} key={tarea.id}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                className={`rounded-xl bg-white p-3 shadow-sm ${snap.isDragging ? 'ring-2 ring-brand-teal' : ''} ${vencida ? 'border-l-4 border-brand-ink' : ''}`}>
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <button onClick={() => setDetalle(tarea)} className="text-left text-sm font-medium text-brand-ink hover:text-brand-teal">
                                    {tarea.titulo}
                                  </button>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${prio.badge}`}>{prio.label}</span>
                                </div>

                                {tarea.etiquetas?.length > 0 && (
                                  <div className="mb-2 flex flex-wrap gap-1">
                                    {tarea.etiquetas.map((et) => (
                                      <span key={et.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: et.color }}>{et.nombre}</span>
                                    ))}
                                  </div>
                                )}

                                <div className="mb-2 flex items-center justify-between">
                                  {fecha ? (
                                    <span className={`flex items-center gap-1 text-xs ${vencida ? 'font-semibold text-brand-ink' : 'text-brand-forest/70'}`}>
                                      <FontAwesomeIcon icon={vencida ? faTriangleExclamation : faCalendarDay} /> {fecha}
                                    </span>
                                  ) : <span />}
                                  {tarea.asignado_nombre && (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal text-[10px] font-bold text-white" title={tarea.asignado_nombre}>
                                      {iniciales(tarea.asignado_nombre)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <select value={tarea.columna_id || ''} onChange={(e) => moverConSelect(tarea.id, e.target.value)}
                                    className="flex-1 rounded border border-brand-sage/40 px-1 py-1 text-xs text-brand-forest">
                                    {columnas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                  </select>
                                  <button onClick={() => setModal(tarea)} className="rounded p-1.5 text-xs text-brand-forest hover:bg-brand-sage/20" title="Editar" aria-label="Editar">
                                    <FontAwesomeIcon icon={faPen} />
                                  </button>
                                  <button onClick={() => eliminar(tarea)} className="rounded p-1.5 text-xs text-brand-forest hover:bg-brand-sage/20" title="Eliminar" aria-label="Eliminar">
                                    <FontAwesomeIcon icon={faTrashCan} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {modal && (
        <TaskModal inicial={modal.id ? modal : null} proyectoId={Number(id)} columnas={columnas} miembros={miembros}
          onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {detalle && <TaskDetailModal tarea={detalle} onClose={() => setDetalle(null)} onChanged={onEtiquetasCambiadas} />}
    </div>
  );
}
