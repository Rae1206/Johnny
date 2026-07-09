// Controlador de equipos: CRUD + gestion de miembros.
// Permisos: crear equipo -> cualquiera (queda como admin/owner);
// invitar/quitar/cambiar rol -> solo admin del equipo; eliminar -> owner.
const { pool } = require('../config/db');
const { accesoEquipo, notificar } = require('../utils/access');

// GET /api/equipos -> equipos donde el usuario es dueño o miembro.
async function listar(req, res, next) {
  try {
    const [equipos] = await pool.query(
      `SELECT e.id, e.nombre, e.descripcion, e.owner_id,
              em.rol AS mi_rol,
              (SELECT COUNT(*) FROM equipo_miembros x WHERE x.equipo_id = e.id) AS miembros
         FROM equipos e
         JOIN equipo_miembros em ON em.equipo_id = e.id AND em.usuario_id = ?
        ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    res.json(equipos);
  } catch (err) {
    next(err);
  }
}

// POST /api/equipos -> crea equipo; el creador queda como owner + miembro admin.
async function crear(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { nombre, descripcion } = req.body;
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO equipos (nombre, descripcion, owner_id) VALUES (?, ?, ?)',
      [nombre, descripcion || null, req.user.id]
    );
    const equipoId = result.insertId;
    await conn.query(
      'INSERT INTO equipo_miembros (equipo_id, usuario_id, rol) VALUES (?, ?, ?)',
      [equipoId, req.user.id, 'admin']
    );
    await conn.commit();
    res.status(201).json({
      id: equipoId,
      nombre,
      descripcion: descripcion || null,
      owner_id: req.user.id,
      mi_rol: 'admin',
      miembros: 1,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// PUT /api/equipos/:id -> renombrar (solo admin del equipo).
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoEquipo(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Equipo no encontrado.' });
    if (!acc.esAdmin) return res.status(403).json({ error: 'Solo un admin puede editar el equipo.' });

    const { nombre, descripcion } = req.body;
    await pool.query('UPDATE equipos SET nombre = ?, descripcion = ? WHERE id = ?', [
      nombre,
      descripcion || null,
      id,
    ]);
    res.json({ id: Number(id), nombre, descripcion: descripcion || null });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/equipos/:id -> eliminar (solo owner).
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM equipos WHERE id = ? AND owner_id = ?', [
      id,
      req.user.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Solo el dueño puede eliminar el equipo.' });
    }
    res.json({ mensaje: 'Equipo eliminado.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/equipos/:id/miembros -> lista de miembros (debe ser miembro).
async function miembros(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoEquipo(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Equipo no encontrado.' });
    if (!acc.esMiembro) return res.status(403).json({ error: 'No perteneces a este equipo.' });

    const [lista] = await pool.query(
      `SELECT u.id, u.nombre, u.email, em.rol,
              (e.owner_id = u.id) AS es_owner
         FROM equipo_miembros em
         JOIN usuarios u ON u.id = em.usuario_id
         JOIN equipos e ON e.id = em.equipo_id
        WHERE em.equipo_id = ?
        ORDER BY es_owner DESC, u.nombre ASC`,
      [id]
    );
    res.json(lista);
  } catch (err) {
    next(err);
  }
}

// POST /api/equipos/:id/miembros -> agregar miembro por email (solo admin).
async function agregarMiembro(req, res, next) {
  try {
    const { id } = req.params;
    const { email, rol } = req.body;
    const acc = await accesoEquipo(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Equipo no encontrado.' });
    if (!acc.esAdmin) return res.status(403).json({ error: 'Solo un admin puede agregar miembros.' });

    const [usuarios] = await pool.query('SELECT id, nombre FROM usuarios WHERE email = ? LIMIT 1', [
      email,
    ]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'No existe un usuario con ese email.' });
    }
    const nuevo = usuarios[0];

    const [existe] = await pool.query(
      'SELECT 1 FROM equipo_miembros WHERE equipo_id = ? AND usuario_id = ? LIMIT 1',
      [id, nuevo.id]
    );
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El usuario ya es miembro del equipo.' });
    }

    await pool.query(
      'INSERT INTO equipo_miembros (equipo_id, usuario_id, rol) VALUES (?, ?, ?)',
      [id, nuevo.id, rol === 'admin' ? 'admin' : 'miembro']
    );
    await notificar(nuevo.id, 'equipo', `Te sumaron al equipo.`, `/equipos`);

    res.status(201).json({ id: nuevo.id, nombre: nuevo.nombre, email, rol: rol || 'miembro' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/equipos/:id/miembros/:usuarioId -> cambiar rol (solo admin).
async function cambiarRol(req, res, next) {
  try {
    const { id, usuarioId } = req.params;
    const { rol } = req.body;
    const acc = await accesoEquipo(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Equipo no encontrado.' });
    if (!acc.esAdmin) return res.status(403).json({ error: 'Solo un admin puede cambiar roles.' });

    // No permitir degradar al owner.
    const [eq] = await pool.query('SELECT owner_id FROM equipos WHERE id = ?', [id]);
    if (eq[0] && eq[0].owner_id === Number(usuarioId)) {
      return res.status(400).json({ error: 'No se puede cambiar el rol del dueño.' });
    }

    await pool.query(
      'UPDATE equipo_miembros SET rol = ? WHERE equipo_id = ? AND usuario_id = ?',
      [rol === 'admin' ? 'admin' : 'miembro', id, usuarioId]
    );
    res.json({ usuario_id: Number(usuarioId), rol });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/equipos/:id/miembros/:usuarioId -> quitar miembro (admin, o uno mismo).
async function quitarMiembro(req, res, next) {
  try {
    const { id, usuarioId } = req.params;
    const acc = await accesoEquipo(id, req.user.id);
    if (!acc.existe) return res.status(404).json({ error: 'Equipo no encontrado.' });

    const esUnoMismo = Number(usuarioId) === req.user.id;
    if (!acc.esAdmin && !esUnoMismo) {
      return res.status(403).json({ error: 'Solo un admin puede quitar a otros miembros.' });
    }

    const [eq] = await pool.query('SELECT owner_id FROM equipos WHERE id = ?', [id]);
    if (eq[0] && eq[0].owner_id === Number(usuarioId)) {
      return res.status(400).json({ error: 'El dueño no puede salir del equipo (eliminá el equipo).' });
    }

    await pool.query('DELETE FROM equipo_miembros WHERE equipo_id = ? AND usuario_id = ?', [
      id,
      usuarioId,
    ]);
    res.json({ mensaje: 'Miembro quitado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar,
  miembros,
  agregarMiembro,
  cambiarRol,
  quitarMiembro,
};
