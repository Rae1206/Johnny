// Instancia central de axios.
// - baseURL apunta a la API del backend.
// - Un interceptor adjunta el access token en memoria.
// - Otro interceptor hace refresh single-flight ante un 401 protegido.
import axios from 'axios';
import {
  AUTH_CLEARED_EVENT,
  captureAuthGeneration,
  clearAccessToken,
  getAccessToken,
  isCurrentAuthGeneration,
  setAccessToken,
} from './auth-session.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

let refreshPromise = null;

function clearAuthAndRedirect() {
  clearAccessToken();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

function createRefreshPromise(generation) {
  return api
    .post('/auth/refresh', null, {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    })
    .then(({ data }) => {
      if (!isCurrentAuthGeneration(generation)) {
        throw new Error('Stale auth refresh discarded.');
      }

      setAccessToken(data.accessToken, generation);
      return data.accessToken;
    })
    .catch((error) => {
      if (isCurrentAuthGeneration(generation)) {
        clearAuthAndRedirect();
      }

      throw error;
    })
    .finally(() => {
      if (refreshPromise?.generation === generation) {
        refreshPromise = null;
      }
    });
}

async function refreshAccessToken() {
  const generation = captureAuthGeneration();

  if (!refreshPromise || refreshPromise.generation !== generation) {
    refreshPromise = {
      generation,
      promise: createRefreshPromise(generation),
    };
  }

  return refreshPromise.promise;
}

// Adjunta el access token en memoria a cada peticion protegida.
api.interceptors.request.use((config) => {
  config.withCredentials = true;

  if (config.skipAuthHeader) {
    return config;
  }

  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function shouldSkipRefresh(config = {}) {
  return config.skipAuthRefresh || (typeof config.url === 'string' && config.url.includes('/auth/'));
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config || {};

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest) ||
      !getAccessToken()
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CLEARED_EVENT, () => {
    refreshPromise = null;
  });
}

export default api;
