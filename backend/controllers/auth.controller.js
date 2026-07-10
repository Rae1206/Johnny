// Controlador de autenticacion: registro, login, refresh y logout.
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const {
  buildPublicUser,
  clearRefreshCookie,
  extractRefreshToken,
  generateRefreshToken,
  generateRefreshFamilyId,
  hashRefreshToken,
  setRefreshCookie,
  signAccessToken,
} = require('../utils/authSession');

const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function nowPlusRefreshTtl() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

function refreshTokenPayload(userId, tokenHash, expiresAt, familyId, rotatedFromTokenId = null) {
  return [userId, tokenHash, expiresAt, familyId, rotatedFromTokenId];
}

async function saveRefreshToken(connOrPool, userId, tokenHash, familyId, rotatedFromTokenId = null) {
  const expiresAt = nowPlusRefreshTtl();
  const executor = connOrPool.query.bind(connOrPool);
  const [result] = await executor(
    `INSERT INTO refresh_tokens (
      user_id, token_hash, expires_at, family_id, revoked_at, rotated_at, rotated_from_token_id, replaced_by_token_id, last_used_at
    ) VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL)`,
    refreshTokenPayload(userId, tokenHash, expiresAt, familyId, rotatedFromTokenId)
  );
  return { refreshTokenId: result.insertId, expiresAt };
}

async function revokeRefreshFamily(conn, familyId) {
  await conn.query(
    `UPDATE refresh_tokens
        SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE family_id = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()`,
    [familyId]
  );
}

function issueSessionResponse(res, usuario, refreshToken) {
  const accessToken = signAccessToken(usuario);
  setRefreshCookie(res, refreshToken);
  return res.json({ usuario: buildPublicUser(usuario), accessToken });
}

async function createSession(res, usuario, connOrPool = pool) {
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const familyId = generateRefreshFamilyId();
  await saveRefreshToken(connOrPool, usuario.id, refreshHash, familyId);
  return issueSessionResponse(res, usuario, refreshToken);
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { nombre, email, password } = req.body;

    // Verificar si el email ya existe (consulta parametrizada -> anti SQL Injection).
    const [existentes] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    if (existentes.length > 0) {
      return res.status(400).json({ error: 'El email ya esta registrado.' });
    }

    // Hash de la contraseña con bcrypt (10 salt rounds). Nunca se guarda texto plano.
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
      [nombre, email, password_hash]
    );

    const usuario = { id: result.insertId, nombre, email, rol: 'miembro' };

    // return await (no solo return): sin await, un rechazo de createSession
    // escaparia del try/catch y se volveria un unhandled rejection que tumba el proceso.
    return await createSession(res.status(201), usuario);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [filas] = await pool.query(
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    // Mismo mensaje para "email inexistente" y "password incorrecta":
    // no revelamos cual de los dos fallo (evita enumeracion de usuarios).
    if (filas.length === 0) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const usuario = filas[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    // return await (no solo return): sin await, un rechazo de createSession
    // escaparia del try/catch y se volveria un unhandled rejection que tumba el proceso.
    return await createSession(res.status(200), usuario);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  const presentedToken = extractRefreshToken(req);
  if (!presentedToken) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Sesión expirada.' });
  }

  const tokenHash = hashRefreshToken(presentedToken);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT rt.id, rt.user_id, rt.family_id, rt.expires_at, rt.revoked_at, rt.replaced_by_token_id,
              u.id AS usuario_id, u.nombre, u.email, u.rol
         FROM refresh_tokens rt
         INNER JOIN usuarios u ON u.id = rt.user_id
        WHERE rt.token_hash = ?
        FOR UPDATE`,
      [tokenHash]
    );

    if (rows.length === 0) {
      await conn.rollback();
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Sesión expirada.' });
    }

    const session = rows[0];
    const usable = !session.revoked_at && !session.replaced_by_token_id && new Date(session.expires_at) > new Date();
    if (!usable) {
      await revokeRefreshFamily(conn, session.family_id);
      await conn.commit();
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Sesión expirada.' });
    }

    const usuario = {
      id: session.usuario_id,
      nombre: session.nombre,
      email: session.email,
      rol: session.rol,
    };

    const nextRefreshToken = generateRefreshToken();
    const nextRefreshHash = hashRefreshToken(nextRefreshToken);
    const [insertResult] = await conn.query(
      `INSERT INTO refresh_tokens (
        user_id, token_hash, expires_at, family_id, revoked_at, rotated_at, rotated_from_token_id, replaced_by_token_id, last_used_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NOW())`,
      [session.user_id, nextRefreshHash, nowPlusRefreshTtl(), session.family_id, session.id]
    );

    await conn.query(
      `UPDATE refresh_tokens
          SET revoked_at = COALESCE(revoked_at, NOW()),
              rotated_at = COALESCE(rotated_at, NOW()),
              replaced_by_token_id = ?,
              last_used_at = NOW()
        WHERE id = ?`,
      [insertResult.insertId, session.id]
    );

    await conn.commit();

    setRefreshCookie(res, nextRefreshToken);
    return res.json({ usuario, accessToken: signAccessToken(usuario) });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_rollbackErr) {
      // noop
    }
    return next(err);
  } finally {
    conn.release();
  }
}

async function logout(req, res, next) {
  const presentedToken = extractRefreshToken(req);
  if (!presentedToken) {
    clearRefreshCookie(res);
    return res.status(204).end();
  }

  const tokenHash = hashRefreshToken(presentedToken);
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, family_id FROM refresh_tokens WHERE token_hash = ? FOR UPDATE',
      [tokenHash]
    );

    if (rows.length > 0) {
      await revokeRefreshFamily(conn, rows[0].family_id);
    }

    await conn.commit();
    clearRefreshCookie(res);
    return res.status(204).end();
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch (_rollbackErr) {
      // noop
    }
    clearRefreshCookie(res);
    return next(err);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { register, login, refresh, logout };
