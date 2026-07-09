// Instancia central de axios.
// - baseURL apunta a la API del backend.
// - Un interceptor adjunta el JWT (si existe) en cada request.
// - Otro interceptor cierra sesion automaticamente ante un 401.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Adjunta el token guardado en localStorage a cada peticion.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskless_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401, el token es invalido/expirado: limpiamos sesion.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('taskless_token');
      localStorage.removeItem('taskless_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
