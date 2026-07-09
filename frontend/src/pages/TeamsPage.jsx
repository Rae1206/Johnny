// Sección Equipos: CRUD de equipos + gestión de miembros.
import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import {
  FontAwesomeIcon, faPlus, faPen, faTrashCan, faUsers, faUserPlus, faXmark, faCrown,
} from '../lib/icons.js';
import { iniciales } from '../lib/ui.js';

function TeamModal({ inicial, onClose, onSaved }) {
  const editando = Boolean(inicial?.id);
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || '');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (nombre.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres.');
    try {
      if (editando) {
        const { data } = await api.put(`/equipos/${inicial.id}`, { nombre, descripcion });
        onSaved({ ...inicial, ...data }, 'update');
      } else {
        const { data } = await api.post('/equipos', { nombre, descripcion });
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
          <h2 className="text-lg font-bold text-brand-ink">{editando ? 'Editar equipo' : 'Nuevo equipo'}</h2>
          <button onClick={onClose} className="rounded p-1 text-brand-forest/50 hover:bg-brand-sage/20" aria-label="Cerrar">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-brand-forest">{error}</p>}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del equipo"
            className="rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" rows={2}
            className="rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-brand-forest hover:bg-brand-sage/20">Cancelar</button>
            <button type="submit" className="rounded-lg bg-brand-teal px-4 py-2 font-medium text-white hover:bg-brand-forest">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersModal({ equipo, onClose }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [miembros, setMiembros] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const soyAdmin = equipo.mi_rol === 'admin';

  async function cargar() {
    const { data } = await api.get(`/equipos/${equipo.id}/miembros`);
    setMiembros(data);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [equipo.id]);

  async function agregar(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/equipos/${equipo.id}/miembros`, { email });
      setEmail('');
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo agregar.');
    }
  }

  async function cambiarRol(m, rol) {
    await api.put(`/equipos/${equipo.id}/miembros/${m.id}`, { rol }).catch(() => {});
    cargar();
  }

  async function quitar(m) {
    const ok = await confirm({ title: 'Quitar miembro', message: `¿Quitar a ${m.nombre} del equipo?`, confirmText: 'Quitar', tone: 'danger' });
    if (!ok) return;
    await api.delete(`/equipos/${equipo.id}/miembros/${m.id}`).catch(() => {});
    cargar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-ink">Miembros · {equipo.nombre}</h2>
          <button onClick={onClose} className="rounded p-1 text-brand-forest/50 hover:bg-brand-sage/20" aria-label="Cerrar">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {soyAdmin && (
          <form onSubmit={agregar} className="mb-4 flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@de-la-persona.com"
              className="flex-1 rounded-lg border border-brand-sage/60 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none" />
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-forest">
              <FontAwesomeIcon icon={faUserPlus} /> Agregar
            </button>
          </form>
        )}
        {error && <p className="mb-3 text-sm text-brand-forest">{error}</p>}

        <div className="flex flex-col divide-y divide-brand-sage/20">
          {miembros.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-teal text-xs font-bold text-white">
                {iniciales(m.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
                  {m.nombre}
                  {Number(m.es_owner) === 1 && <FontAwesomeIcon icon={faCrown} className="text-brand-teal" title="Dueño" />}
                </p>
                <p className="truncate text-xs text-brand-forest/70">{m.email}</p>
              </div>
              {soyAdmin && Number(m.es_owner) !== 1 ? (
                <>
                  <select value={m.rol} onChange={(e) => cambiarRol(m, e.target.value)}
                    className="rounded border border-brand-sage/60 px-2 py-1 text-xs">
                    <option value="miembro">Miembro</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => quitar(m)} className="rounded p-1.5 text-brand-forest hover:bg-brand-sage/20" aria-label="Quitar">
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-brand-sage/30 px-2 py-0.5 text-xs text-brand-forest">{m.rol}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const confirm = useConfirm();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [miembrosDe, setMiembrosDe] = useState(null);

  async function cargar() {
    setLoading(true);
    try {
      const { data } = await api.get('/equipos');
      setEquipos(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  function onSaved(equipo, modo) {
    if (modo === 'create') setEquipos((e) => [equipo, ...e]);
    else setEquipos((e) => e.map((x) => (x.id === equipo.id ? { ...x, ...equipo } : x)));
  }

  async function eliminar(eq) {
    const ok = await confirm({ title: 'Eliminar equipo', message: `¿Eliminar "${eq.nombre}"? Se eliminarán también sus proyectos.`, confirmText: 'Eliminar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/equipos/${eq.id}`);
      setEquipos((e) => e.filter((x) => x.id !== eq.id));
    } catch (err) {
      await confirm({ title: 'No se pudo eliminar', message: err.response?.data?.error || 'Error', confirmText: 'Entendido' });
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-ink">Equipos</h1>
        <button onClick={() => setModal({})} className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-forest">
          <FontAwesomeIcon icon={faPlus} /> Nuevo equipo
        </button>
      </div>

      {loading ? (
        <p className="text-brand-forest/70">Cargando…</p>
      ) : equipos.length === 0 ? (
        <p className="text-brand-forest/70">Todavía no tenés equipos. Creá uno e invitá a tu gente.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipos.map((eq) => (
            <div key={eq.id} className="flex flex-col rounded-2xl border border-brand-sage/30 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-brand-ink">{eq.nombre}</h3>
                <span className="rounded-full bg-brand-sage/30 px-2 py-0.5 text-xs font-medium text-brand-forest">{eq.mi_rol}</span>
              </div>
              <p className="mb-3 flex-1 text-sm text-brand-forest/70">{eq.descripcion || 'Sin descripción.'}</p>
              <p className="mb-4 flex items-center gap-2 text-sm text-brand-forest">
                <FontAwesomeIcon icon={faUsers} /> {eq.miembros} miembro{eq.miembros !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMiembrosDe(eq)} className="flex-1 rounded-lg bg-brand-teal/10 px-3 py-1.5 text-sm font-medium text-brand-teal hover:bg-brand-sage/30">
                  Miembros
                </button>
                {eq.mi_rol === 'admin' && (
                  <button onClick={() => setModal(eq)} className="rounded-lg bg-brand-sage/20 px-3 py-1.5 text-sm text-brand-forest hover:bg-brand-sage/30" title="Editar">
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                )}
                <button onClick={() => eliminar(eq)} className="rounded-lg bg-brand-sage/20 px-3 py-1.5 text-sm text-brand-forest hover:bg-brand-sage/30" title="Eliminar">
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <TeamModal inicial={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={onSaved} />}
      {miembrosDe && <MembersModal equipo={miembrosDe} onClose={() => setMiembrosDe(null)} />}
    </div>
  );
}
