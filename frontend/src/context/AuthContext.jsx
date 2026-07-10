// Contexto de autenticacion: guarda usuario + access token en memoria.
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api.js';
import {
  AUTH_CLEARED_EVENT,
  captureAuthGeneration,
  clearAccessToken,
  isCurrentAuthGeneration,
  setAccessToken,
} from '../lib/auth-session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function restoreSession() {
      const generation = captureAuthGeneration();

      try {
        const { data } = await api.post('/auth/refresh', null, {
          skipAuthHeader: true,
          skipAuthRefresh: true,
        });

        if (!alive || !isCurrentAuthGeneration(generation)) return;
        setAccessToken(data.accessToken, generation);
        setUser(data.usuario);
      } catch (_error) {
        if (!alive || !isCurrentAuthGeneration(generation)) return;
        clearAccessToken();
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    function handleAuthCleared() {
      setUser(null);
      setLoading(false);
    }

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    restoreSession();

    return () => {
      alive = false;
      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    };
  }, []);

  async function login(email, password) {
    const generation = captureAuthGeneration();
    const { data } = await api.post('/auth/login', { email, password }, {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    });
    if (!isCurrentAuthGeneration(generation)) return data.usuario;

    setAccessToken(data.accessToken, generation);
    setUser(data.usuario);
    return data.usuario;
  }

  async function register(nombre, email, password) {
    const generation = captureAuthGeneration();
    const { data } = await api.post('/auth/register', { nombre, email, password }, {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    });
    if (!isCurrentAuthGeneration(generation)) return data.usuario;

    setAccessToken(data.accessToken, generation);
    setUser(data.usuario);
    return data.usuario;
  }

  async function logout() {
    clearAccessToken();
    setUser(null);

    try {
      await api.post('/auth/logout', null, {
        skipAuthHeader: true,
        skipAuthRefresh: true,
      });
    } catch (_error) {
      // El frontend limpia la sesion igual; el backend revoca si pudo.
    }
  }

  function updateUser(cambios) {
    setUser((u) => ({ ...u, ...cambios }));
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
