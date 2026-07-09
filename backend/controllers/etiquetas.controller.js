// Etiquetas (labels) del usuario + asignacion a tareas.
const { pool } = require('../config/db');
const { accesoTarea } = require('./tareas.controller');

// GET /api/etiquetas -> etiquetas del usuario.
async function listar(req, res, next) {
  try {
    const [items] = await pool.query(
      'SELECT id, nombre, color FROM etiquetas WHERE usuario_id = ? ORDER BY nombre',
      [req.user.id]
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// POST /api/etiquetas
async function crear(req, res, next) {
  try {
    const { nombre, color } = req.body;
    const [result] = await pool.query(
      'INSERT INTO etiquetas (nombre, color, usuario_id) VALUES (?, ?, ?)',
      [nombre, color || '#8dab7f', req.user.id]
    );
    res.status(201).json({ id: result.insertId, nombre, color: color || '#8dab7f' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/etiquetas/:id
async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM etiquetas WHERE id = ? AND usuario_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Etiqueta no encontrada.' });
    res.json({ mensaje: 'Etiqueta eliminada.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/tareas/:id/etiquetas  { etiqueta_id }
async function asignar(req, res, next) {
  try {
    const { id } = req.params;
    const { etiqueta_id } = req.body;
    const acc = await accesoTarea(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (!acc.puede) return res.status(403).json({ error: 'No tenés acceso a esta tarea.' });

    // La etiqueta debe ser del usuario.
    const [et] = await pool.query('SELECT id FROM etiquetas WHERE id = ? AND usuario_id = ?', [
      etiqueta_id,
      req.user.id,
    ]);
    if (et.length === 0) return res.status(404).json({ error: 'Etiqueta no encontrada.' });

    await pool.query(
      'INSERT IGNORE INTO tarea_etiquetas (tarea_id, etiqueta_id) VALUES (?, ?)',
      [id, etiqueta_id]
    );
    res.status(201).json({ tarea_id: Number(id), etiqueta_id: Number(etiqueta_id) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tareas/:id/etiquetas/:etiquetaId
async function quitar(req, res, next) {
  try {
    const { id, etiquetaId } = req.params;
    const acc = await accesoTarea(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (!acc.puede) return res.status(403).json({ error: 'No tenés acceso a esta tarea.' });

    await pool.query('DELETE FROM tarea_etiquetas WHERE tarea_id = ? AND etiqueta_id = ?', [
      id,
      etiquetaId,
    ]);
    res.json({ mensaje: 'Etiqueta quitada.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, eliminar, asignar, quitar };
