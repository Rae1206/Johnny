const AUTH_CLEARED_EVENT = 'taskless:auth-cleared';

let accessToken = null;
let authGeneration = 0;

function notifyAuthCleared() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
  }
}

export function getAccessToken() {
  return accessToken;
}

export function getAuthGeneration() {
  return authGeneration;
}

export function captureAuthGeneration() {
  return authGeneration;
}

export function isCurrentAuthGeneration(generation) {
  return generation === authGeneration;
}

export function setAccessToken(token, generation = authGeneration) {
  if (!isCurrentAuthGeneration(generation)) {
    return false;
  }

  accessToken = token || null;
  return true;
}

export function clearAccessToken() {
  accessToken = null;
  authGeneration += 1;
  notifyAuthCleared();
}

export { AUTH_CLEARED_EVENT };
