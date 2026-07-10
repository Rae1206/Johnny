// Configuracion central de la app.
// Orden de prioridad: variables de entorno (.env) > config/local.js.
// Los defaults locales viven en config/local.js; produccion debe sobreescribirlos.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// config/local.js es opcional: si no existe, se ignora sin romper.
let local = {};
try {
  local = require('./local.js');
} catch (_e) {
  local = {};
}

function pick(envKey, fallback) {
  if (Object.prototype.hasOwnProperty.call(process.env, envKey)) {
    return process.env[envKey];
  }
  if (Object.prototype.hasOwnProperty.call(local, envKey)) return local[envKey];
  return fallback;
}

function parsePort(value, label) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`[config] Invalid ${label}: ${value}.`);
  }

  return port;
}

function getConfiguredValue(envKey) {
  if (Object.prototype.hasOwnProperty.call(process.env, envKey)) {
    return process.env[envKey];
  }

  if (Object.prototype.hasOwnProperty.call(local, envKey)) {
    return local[envKey];
  }

  return undefined;
}

function requireSetting(envKey, { allowEmpty = false } = {}) {
  const value = getConfiguredValue(envKey);
  const passwordHint =
    envKey === 'DB_PASSWORD'
      ? ' For passwordless local MySQL, set DB_PASSWORD= explicitly in backend/.env.'
      : '';

  if (value === undefined) {
    throw new Error(
      `[config] Missing required configuration value ${envKey}. ` +
        'Check backend/config/local.js and backend/.env before starting the app. ' +
        (envKey === 'JWT_SECRET' ? 'Run INICIAR.bat once to generate it locally.' : '') +
        passwordHint
    );
  }

  if (allowEmpty) {
    if (typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  throw new Error(
    `[config] Missing required configuration value ${envKey}. ` +
      'Check backend/config/local.js and backend/.env before starting the app. ' +
      (envKey === 'JWT_SECRET' ? 'Run INICIAR.bat once to generate it locally.' : '') +
      passwordHint
  );
}

module.exports = {
  port: parsePort(pick('PORT', 4000), 'PORT'),
  clientOrigin: pick('CLIENT_ORIGIN', 'http://localhost:5173'),

  db: {
    host: requireSetting('DB_HOST'),
    port: parsePort(pick('DB_PORT', 3306), 'DB_PORT'),
    user: requireSetting('DB_USER'),
    password: requireSetting('DB_PASSWORD', { allowEmpty: true }),
    database: requireSetting('DB_NAME'),
  },

  jwtSecret: requireSetting('JWT_SECRET'),
  accessTokenExpiresIn: pick('ACCESS_TOKEN_EXPIRES_IN', '15m'),
};
