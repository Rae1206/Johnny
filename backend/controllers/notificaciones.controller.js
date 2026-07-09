// Notificaciones in-app del usuario.
const { pool } = require('../config/db');

// GET /api/notificaciones -> ultimas + cantidad sin leer.
async function listar(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT id, tipo, mensaje, enlace, leida, created_at
         FROM notificaciones WHERE usuario_id = ?
        ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    const [[{ sin_leer }]] = await pool.query(
      'SELECT COUNT(*) AS sin_leer FROM notificaciones WHERE usuario_id = ? AND leida = 0',
      [req.user.id]
    );
    res.json({ notificaciones: items, sin_leer });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notificaciones/:id/leida
async function marcarLeida(req, res, next) {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    res.json({ mensaje: 'Marcada como leída.' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notificaciones/leer-todas
async function marcarTodas(req, res, next) {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?', [req.user.id]);
    res.json({ mensaje: 'Todas marcadas como leídas.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, marcarLeida, marcarTodas };
