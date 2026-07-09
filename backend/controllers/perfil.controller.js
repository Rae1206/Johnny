// Perfil del usuario: ver, editar nombre y cambiar contraseña.
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/perfil
async function ver(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/perfil  { nombre }
async function actualizar(req, res, next) {
  try {
    const { nombre } = req.body;
    await pool.query('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, req.user.id]);
    res.json({ id: req.user.id, nombre });
  } catch (err) {
    next(err);
  }
}

// PUT /api/perfil/password  { actual, nueva }
async function cambiarPassword(req, res, next) {
  try {
    const { actual, nueva } = req.body;
    const [rows] = await pool.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.user.id]);
    const ok = await bcrypt.compare(actual, rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: 'La contraseña actual no es correcta.' });

    const nuevoHash = await bcrypt.hash(nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [nuevoHash, req.user.id]);
    res.json({ mensaje: 'Contraseña actualizada.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { ver, actualizar, cambiarPassword };
