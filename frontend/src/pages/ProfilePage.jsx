// Perfil: editar nombre y cambiar contraseña.
import { useState } from 'react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { iniciales } from '../lib/ui.js';

function Aviso({ tipo, children }) {
  if (!children) return null;
  const cls = tipo === 'ok' ? 'bg-brand-lime/40 text-brand-forest' : 'bg-brand-sage/20 text-brand-ink';
  return <div className={`mb-3 rounded-lg px-4 py-2 text-sm ${cls}`}>{children}</div>;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [okNombre, setOkNombre] = useState('');
  const [errNombre, setErrNombre] = useState('');

  const [pass, setPass] = useState({ actual: '', nueva: '' });
  const [okPass, setOkPass] = useState('');
  const [errPass, setErrPass] = useState('');

  async function guardarNombre(e) {
    e.preventDefault();
    setOkNombre(''); setErrNombre('');
    if (nombre.trim().length < 2) return setErrNombre('El nombre debe tener al menos 2 caracteres.');
    try {
      const { data } = await api.put('/perfil', { nombre });
      updateUser({ nombre: data.nombre });
      setOkNombre('Nombre actualizado.');
    } catch (err) {
      setErrNombre(err.response?.data?.error || 'No se pudo guardar.');
    }
  }

  async function cambiarPass(e) {
    e.preventDefault();
    setOkPass(''); setErrPass('');
    if (pass.nueva.length < 8) return setErrPass('La nueva contraseña debe tener al menos 8 caracteres.');
    try {
      await api.put('/perfil/password', pass);
      setOkPass('Contraseña actualizada.');
      setPass({ actual: '', nueva: '' });
    } catch (err) {
      setErrPass(err.response?.data?.error || 'No se pudo cambiar.');
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-brand-ink">Mi perfil</h1>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-sage/30 bg-white p-5 shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-lg font-bold text-white">
          {iniciales(user?.nombre)}
        </span>
        <div>
          <p className="font-semibold text-brand-ink">{user?.nombre}</p>
          <p className="text-sm text-brand-forest/70">{user?.email}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-sage/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-brand-ink">Nombre</h2>
        <Aviso tipo="ok">{okNombre}</Aviso>
        <Aviso tipo="err">{errNombre}</Aviso>
        <form onSubmit={guardarNombre} className="flex gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="flex-1 rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <button type="submit" className="rounded-lg bg-brand-teal px-4 py-2 font-medium text-white hover:bg-brand-forest">Guardar</button>
        </form>
      </div>

      <div className="rounded-2xl border border-brand-sage/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-brand-ink">Cambiar contraseña</h2>
        <Aviso tipo="ok">{okPass}</Aviso>
        <Aviso tipo="err">{errPass}</Aviso>
        <form onSubmit={cambiarPass} className="flex flex-col gap-3">
          <input type="password" value={pass.actual} onChange={(e) => setPass({ ...pass, actual: e.target.value })} placeholder="Contraseña actual"
            className="rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <input type="password" value={pass.nueva} onChange={(e) => setPass({ ...pass, nueva: e.target.value })} placeholder="Nueva contraseña (mín. 8)"
            className="rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none" />
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-brand-teal px-4 py-2 font-medium text-white hover:bg-brand-forest">Cambiar contraseña</button>
          </div>
        </form>
      </div>
    </div>
  );
}
