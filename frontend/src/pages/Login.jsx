import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validacion del lado CLIENTE (el servidor tambien valida).
  function validar() {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalido.';
    if (form.password.length < 1) e.password = 'La contraseña es obligatoria.';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setApiError('');
    if (!validar()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setApiError(err.response?.data?.error || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-sage/20 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-brand-ink">Taskless</h1>
        <p className="mb-6 text-sm text-brand-forest/70">Iniciá sesión para continuar.</p>

        {apiError && (
          <div className="mb-4 rounded-lg bg-brand-sage/20 px-4 py-2 text-sm text-brand-ink">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-forest">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none"
              placeholder="demo@taskless.com"
            />
            {errores.email && <p className="mt-1 text-xs text-brand-forest">{errores.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-forest">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-brand-sage/60 px-3 py-2 focus:border-brand-teal focus:outline-none"
              placeholder="Demo1234"
            />
            {errores.password && (
              <p className="mt-1 text-xs text-brand-forest">{errores.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-brand-teal py-2.5 font-medium text-white hover:bg-brand-forest disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-forest/70">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-medium text-brand-teal hover:underline">
            Registrate
          </Link>
        </p>
        <p className="mt-4 rounded-lg bg-brand-lime/20 px-3 py-2 text-center text-xs text-brand-forest/70">
          Demo: <strong>demo@taskless.com</strong> / <strong>Demo1234</strong>
        </p>
      </div>
    </div>
  );
}
