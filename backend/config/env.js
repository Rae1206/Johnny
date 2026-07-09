// Configuracion central de la app.
// Orden de prioridad: variables de entorno (.env) > config/local.js > defaults.
// De este modo la app corre "out of the box" sin .env, y sigue respetando
// un .env real si algun dia se usa en otro entorno.
require('dotenv').config();

// config/local.js es opcional: si no existe, se ignora sin romper.
let local = {};
try {
  local = require('./local.js');
} catch (_e) {
  local = {};
}

function pick(envKey, fallback) {
  if (process.env[envKey] !== undefined && process.env[envKey] !== '') {
    return process.env[envKey];
  }
  if (local[envKey] !== undefined) return local[envKey];
  return fallback;
}

module.exports = {
  port: Number(pick('PORT', 4000)),
  clientOrigin: pick('CLIENT_ORIGIN', 'http://localhost:5173'),

  db: {
    host: pick('DB_HOST', 'localhost'),
    port: Number(pick('DB_PORT', 3306)),
    user: pick('DB_USER', 'root'),
    password: pick('DB_PASSWORD', ''),
    database: pick('DB_NAME', 'taskless'),
  },

  jwtSecret: pick('JWT_SECRET', 'taskless_dev_secret_change_in_prod_0e3f9a1b7c'),
  jwtExpiresIn: pick('JWT_EXPIRES_IN', '7d'),
};
