const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const REFRESH_COOKIE_NAME = 'taskless_refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

function generateRefreshFamilyId() {
  return crypto.randomUUID();
}

function signAccessToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    config.jwtSecret,
    { expiresIn: config.accessTokenExpiresIn }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, entry) => {
    const [rawKey, ...rawValue] = entry.split('=');
    if (!rawKey || rawValue.length === 0) return cookies;
    const key = rawKey.trim();
    const value = rawValue.join('=').trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (_error) {
      // Ignorar cookies malformadas y tratarlas como ausentes.
    }
    return cookies;
  }, {});
}

function extractRefreshToken(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[REFRESH_COOKIE_NAME] || null;
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}

function buildPublicUser(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

module.exports = {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_MAX_AGE_MS,
  buildPublicUser,
  clearRefreshCookie,
  extractRefreshToken,
  generateRefreshToken,
  generateRefreshFamilyId,
  hashRefreshToken,
  refreshCookieOptions,
  setRefreshCookie,
  signAccessToken,
};
