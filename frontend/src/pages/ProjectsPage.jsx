// Sección Proyectos: listado (cards con progreso + equipo) + CRUD.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { FontAwesomeIcon, faPlus, faPen, faTrashCan, faXmark, faUsers } from '../lib/icons.js';

function ProjectModal({ inicial, equipos, onClose, onSaved }) {
  const editando = Boolean(inicial?.id);
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || '');
  const [equipoId, setEquipoId] = useState(inicial?.equipo_id || '');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (nombre.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres.');
    const payload = { nombre, descripcion, equipo_id: equipoId ? Number(equipoId) : null };
    try {
      if (editando) {
        const { data } = await api.put(`/proyectos/${inicial.id}`, payload);
        onSaved({ ...inicial, ...data }, 'update');
      } else {
        const { data } = await api.post('/proyectos', payload);
        onSaved(data, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-ink">{editando ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-brand-forest/50 hover:bg-brand-sage/20" aria-label="Cerrar">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-brand-forest">{error}</p>}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del proyecto"
            className="rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" rows={3}
            className="rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <label className="text-sm">
            <span className="mb-1 block text-brand-forest">Equipo (opcional)</span>
            <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}
              className="w-full rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none">
              <option value="">Personal (solo yo)</option>
              {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-brand-forest hover:bg-brand-sage/20">Cancelar</button>
            <button type="submit" className="rounded-lg bg-brand-teal px-4 py-2 font-medium text-white hover:bg-brand-forest">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Progreso({ total, hechas }) {
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs text-brand-forest/70">
        <span>{hechas}/{total} completadas</span><span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-sage/25">
        <div className="h-full rounded-full bg-brand-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [proyectos, setProyectos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  async function cargar() {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([api.get('/proyectos'), api.get('/equipos')]);
      setProyectos(p.data);
      setEquipos(e.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  function onSaved(proyecto, modo) {
    if (modo === 'create') setProyectos((p) => [{ ...proyecto, total_tareas: 0, tareas_completadas: 0 }, ...p]);
    else setProyectos((p) => p.map((x) => (x.id === proyecto.id ? { ...x, ...proyecto } : x)));
    // refrescamos para traer equipo_nombre actualizado
    cargar();
  }

  async function eliminar(p) {
    const ok = await confirm({ title: 'Eliminar proyecto', message: `¿Eliminar "${p.nombre}" y todas sus tareas?`, confirmText: 'Eliminar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/proyectos/${p.id}`);
      setProyectos((x) => x.filter((y) => y.id !== p.id));
    } catch (err) {
      await confirm({ title: 'No se pudo eliminar', message: err.response?.data?.error || 'Error', confirmText: 'Entendido' });
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-ink">Proyectos</h1>
        <button onClick={() => setModal({})} className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-forest">
          <FontAwesomeIcon icon={faPlus} /> Nuevo proyecto
        </button>
      </div>

      {loading ? (
        <p className="text-brand-forest/70">Cargando…</p>
      ) : proyectos.length === 0 ? (
        <p className="text-brand-forest/70">Todavía no tenés proyectos. Creá el primero.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-brand-sage/30 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-brand-ink">{p.nombre}</h3>
                {p.equipo_nombre && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                    <FontAwesomeIcon icon={faUsers} /> {p.equipo_nombre}
                  </span>
                )}
              </div>
              <p className="mb-3 flex-1 text-sm text-brand-forest/70">{p.descripcion || 'Sin descripción.'}</p>
              <Progreso total={Number(p.total_tareas)} hechas={Number(p.tareas_completadas)} />
              <div className="flex gap-2">
                <button onClick={() => navigate(`/proyectos/${p.id}`)} className="flex-1 rounded-lg bg-brand-teal/10 px-3 py-1.5 text-sm font-medium text-brand-teal hover:bg-brand-sage/30">
                  Abrir tablero
                </button>
                <button onClick={() => setModal(p)} className="rounded-lg bg-brand-sage/20 px-3 py-1.5 text-sm text-brand-forest hover:bg-brand-sage/30" title="Editar">
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button onClick={() => eliminar(p)} className="rounded-lg bg-brand-sage/20 px-3 py-1.5 text-sm text-brand-forest hover:bg-brand-sage/30" title="Borrar">
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <ProjectModal inicial={modal.id ? modal : null} equipos={equipos} onClose={() => setModal(null)} onSaved={onSaved} />}
    </div>
  );
}
