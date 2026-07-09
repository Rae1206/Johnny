// Detalle de una tarea: descripción completa, responsable, etiquetas y comentarios.
import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PRIORIDADES, formatFecha, esVencida, formatFechaHora, iniciales } from '../lib/ui.js';
import {
  FontAwesomeIcon, faXmark, faCalendarDay, faTriangleExclamation, faUser, faTag, faComment, faPlus,
} from '../lib/icons.js';

export default function TaskDetailModal({ tarea, onClose, onChanged }) {
  const { user } = useAuth();
  const [comentarios, setComentarios] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [etiquetas, setEtiquetas] = useState(tarea.etiquetas || []);
  const [misEtiquetas, setMisEtiquetas] = useState([]);
  const [mostrarTags, setMostrarTags] = useState(false);

  const prio = PRIORIDADES[tarea.prioridad] || PRIORIDADES.media;
  const vencida = esVencida(tarea.fecha_limite, tarea.completada);

  useEffect(() => {
    api.get(`/tareas/${tarea.id}/comentarios`).then(({ data }) => setComentarios(data)).catch(() => {});
    api.get('/etiquetas').then(({ data }) => setMisEtiquetas(data)).catch(() => {});
  }, [tarea.id]);

  async function comentar(e) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    const { data } = await api.post(`/tareas/${tarea.id}/comentarios`, { texto: nuevo });
    setComentarios((c) => [...c, data]);
    setNuevo('');
  }

  async function agregarEtiqueta(et) {
    if (etiquetas.some((e) => e.id === et.id)) return;
    await api.post(`/tareas/${tarea.id}/etiquetas`, { etiqueta_id: et.id }).catch(() => {});
    const nuevas = [...etiquetas, et];
    setEtiquetas(nuevas);
    setMostrarTags(false);
    onChanged?.(tarea.id, nuevas);
  }

  async function quitarEtiqueta(et) {
    await api.delete(`/tareas/${tarea.id}/etiquetas/${et.id}`).catch(() => {});
    const nuevas = etiquetas.filter((e) => e.id !== et.id);
    setEtiquetas(nuevas);
    onChanged?.(tarea.id, nuevas);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-brand-sage/30 p-5">
          <div>
            <h2 className="text-lg font-bold text-brand-ink">{tarea.titulo}</h2>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${prio.badge}`}>{prio.label}</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-brand-forest/50 hover:bg-brand-sage/20" aria-label="Cerrar">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {tarea.descripcion && <p className="mb-4 text-sm text-brand-forest">{tarea.descripcion}</p>}

          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-brand-forest">
            {tarea.proyecto_nombre && <span>Proyecto: <b className="text-brand-ink">{tarea.proyecto_nombre}</b></span>}
            {tarea.asignado_nombre && (
              <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faUser} /> {tarea.asignado_nombre}</span>
            )}
            {tarea.fecha_limite && (
              <span className={`flex items-center gap-1.5 ${vencida ? 'font-semibold text-brand-ink' : ''}`}>
                <FontAwesomeIcon icon={vencida ? faTriangleExclamation : faCalendarDay} />
                {formatFecha(tarea.fecha_limite)}{vencida ? ' · vencida' : ''}
              </span>
            )}
          </div>

          {/* Etiquetas */}
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-forest/70">
                <FontAwesomeIcon icon={faTag} /> Etiquetas
              </span>
              <div className="relative">
                <button onClick={() => setMostrarTags((v) => !v)} className="rounded-full bg-brand-sage/20 px-2 py-0.5 text-xs text-brand-forest hover:bg-brand-sage/30">
                  <FontAwesomeIcon icon={faPlus} />
                </button>
                {mostrarTags && (
                  <div className="absolute left-0 z-10 mt-1 w-44 rounded-lg border border-brand-sage/40 bg-white p-1 shadow-lg">
                    {misEtiquetas.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-brand-forest/70">Creá etiquetas en tus tareas.</p>
                    ) : misEtiquetas.map((et) => (
                      <button key={et.id} onClick={() => agregarEtiqueta(et)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-brand-sage/20">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: et.color }} /> {et.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {etiquetas.length === 0 ? (
                <span className="text-xs text-brand-forest/50">Sin etiquetas.</span>
              ) : etiquetas.map((et) => (
                <span key={et.id} className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: et.color }}>
                  {et.nombre}
                  <button onClick={() => quitarEtiqueta(et)} aria-label="Quitar etiqueta"><FontAwesomeIcon icon={faXmark} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-forest/70">
              <FontAwesomeIcon icon={faComment} /> Comentarios
            </span>
            <div className="flex flex-col gap-3">
              {comentarios.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal text-[10px] font-bold text-white">
                    {iniciales(c.usuario_nombre)}
                  </span>
                  <div>
                    <p className="text-sm text-brand-ink"><b>{c.usuario_nombre}</b> <span className="text-xs text-brand-forest/70">· {formatFechaHora(c.created_at)}</span></p>
                    <p className="text-sm text-brand-forest">{c.texto}</p>
                  </div>
                </div>
              ))}
              {comentarios.length === 0 && <p className="text-xs text-brand-forest/50">Sé el primero en comentar.</p>}
            </div>
          </div>
        </div>

        <form onSubmit={comentar} className="flex gap-2 border-t border-brand-sage/30 p-4">
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Escribí un comentario…"
            className="flex-1 rounded-lg border border-brand-sage/60 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none" />
          <button type="submit" className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-forest">Enviar</button>
        </form>
      </div>
    </div>
  );
}
