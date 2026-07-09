// Contexto de autenticacion: guarda usuario + token y expone login/register/logout.
// El token se persiste en localStorage para sobrevivir recargas.
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, recuperamos la sesion previa (si la hay).
  useEffect(() => {
    const stored = localStorage.getItem('taskless_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  function persist(usuario, token) {
    localStorage.setItem('taskless_token', token);
    localStorage.setItem('taskless_user', JSON.stringify(usuario));
    setUser(usuario);
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.usuario, data.token);
    return data.usuario;
  }

  async function register(nombre, email, password) {
    const { data } = await api.post('/auth/register', { nombre, email, password });
    persist(data.usuario, data.token);
    return data.usuario;
  }

  function logout() {
    localStorage.removeItem('taskless_token');
    localStorage.removeItem('taskless_user');
    setUser(null);
  }

  // Actualiza datos del usuario en sesión (p.ej. nombre editado en el perfil).
  function updateUser(cambios) {
    setUser((u) => {
      const nuevo = { ...u, ...cambios };
      localStorage.setItem('taskless_user', JSON.stringify(nuevo));
      return nuevo;
    });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
