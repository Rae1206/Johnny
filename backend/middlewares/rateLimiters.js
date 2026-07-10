const rateLimit = require('express-rate-limit');

const AUTH_RATE_LIMIT_CEILING = 20;
const PROTECTED_RATE_LIMIT_CEILING = 150;

function resolveLimit(envKey, ceiling) {
  const rawValue = process.env[envKey];
  if (rawValue === undefined || rawValue === '') {
    return ceiling;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`[config] ${envKey} must be a positive integer.`);
  }
  if (parsed > ceiling) {
    throw new Error(`[config] ${envKey} cannot exceed ${ceiling}.`);
  }

  return parsed;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: resolveLimit('AUTH_RATE_LIMIT_MAX', AUTH_RATE_LIMIT_CEILING),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
});

const protectedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: resolveLimit('PROTECTED_RATE_LIMIT_MAX', PROTECTED_RATE_LIMIT_CEILING),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
});

async function resetRateLimitBuckets() {
  const authKeys = ['::ffff:127.0.0.1', '127.0.0.1', '::1'];
  const protectedKeys = ['user:1', 'user:2', 'user:3', 'user:999'];

  await Promise.all([
    ...authKeys.map((key) => Promise.resolve(authLimiter.resetKey(key))),
    ...protectedKeys.map((key) => Promise.resolve(protectedLimiter.resetKey(key))),
  ]);
}

module.exports = {
  AUTH_RATE_LIMIT_CEILING,
  PROTECTED_RATE_LIMIT_CEILING,
  authLimiter,
  protectedLimiter,
  resetRateLimitBuckets,
};
