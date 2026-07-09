// Comentarios en tareas.
const { pool } = require('../config/db');
const { accesoTarea } = require('./tareas.controller');
const { registrarActividad, notificar } = require('../utils/access');

// GET /api/tareas/:id/comentarios
async function listar(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoTarea(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (!acc.puede) return res.status(403).json({ error: 'No tenés acceso a esta tarea.' });

    const [items] = await pool.query(
      `SELECT c.id, c.texto, c.created_at, u.id AS usuario_id, u.nombre AS usuario_nombre
         FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.tarea_id = ? ORDER BY c.created_at ASC`,
      [id]
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// POST /api/tareas/:id/comentarios
async function crear(req, res, next) {
  try {
    const { id } = req.params;
    const { texto } = req.body;
    const acc = await accesoTarea(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (!acc.puede) return res.status(403).json({ error: 'No tenés acceso a esta tarea.' });

    const [result] = await pool.query(
      'INSERT INTO comentarios (tarea_id, usuario_id, texto) VALUES (?, ?, ?)',
      [id, req.user.id, texto]
    );

    if (acc.tarea.proyecto_id) {
      await registrarActividad(acc.tarea.proyecto_id, req.user.id, 'comento', `en una tarea`);
    }
    // Avisar al creador y al responsable (si no son quien comenta).
    for (const uid of [acc.tarea.usuario_id, acc.tarea.asignado_a]) {
      if (uid && uid !== req.user.id) {
        await notificar(uid, 'comentario', `Nuevo comentario en una tarea`,
          acc.tarea.proyecto_id ? `/proyectos/${acc.tarea.proyecto_id}` : '/');
      }
    }

    const [nuevo] = await pool.query(
      `SELECT c.id, c.texto, c.created_at, u.id AS usuario_id, u.nombre AS usuario_nombre
         FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json(nuevo[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear };
