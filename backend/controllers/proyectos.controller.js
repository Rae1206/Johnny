// Controlador de proyectos: CRUD + tablero.
// AUTORIZACION por membresia: se accede si sos dueño O miembro del equipo.
// Toda la logica de acceso vive en utils/access.js (una sola fuente).
const { pool } = require('../config/db');
const { accesoProyecto, accesoEquipo, registrarActividad } = require('../utils/access');

// GET /api/proyectos -> proyectos que el usuario puede ver (propios + de sus equipos).
// Incluye nombre de equipo y progreso (total / completadas).
async function listar(req, res, next) {
  try {
    const [proyectos] = await pool.query(
      `SELECT DISTINCT p.id, p.nombre, p.descripcion, p.equipo_id, p.usuario_id, p.created_at,
              e.nombre AS equipo_nombre,
              (SELECT COUNT(*) FROM tareas t WHERE t.proyecto_id = p.id) AS total_tareas,
              (SELECT COUNT(*) FROM tareas t WHERE t.proyecto_id = p.id AND t.completada = 1) AS tareas_completadas
         FROM proyectos p
         LEFT JOIN equipos e ON e.id = p.equipo_id
         LEFT JOIN equipo_miembros em ON em.equipo_id = p.equipo_id
        WHERE p.usuario_id = ? OR em.usuario_id = ?
        ORDER BY p.created_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json(proyectos);
  } catch (err) {
    next(err);
  }
}

// POST /api/proyectos -> crea proyecto (personal o de equipo) + columnas Kanban.
async function crear(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { nombre, descripcion, equipo_id } = req.body;

    // Si se asigna a un equipo, el usuario debe pertenecer a el.
    if (equipo_id) {
      const acc = await accesoEquipo(equipo_id, req.user.id);
      if (!acc.existe || !acc.esMiembro) {
        conn.release();
        return res.status(403).json({ error: 'No perteneces a ese equipo.' });
      }
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO proyectos (nombre, descripcion, usuario_id, equipo_id) VALUES (?, ?, ?, ?)',
      [nombre, descripcion || null, req.user.id, equipo_id || null]
    );
    const proyectoId = result.insertId;
    await conn.query(
      `INSERT INTO columnas (nombre, orden, proyecto_id) VALUES
         ('Por hacer', 0, ?), ('En progreso', 1, ?), ('Hecho', 2, ?)`,
      [proyectoId, proyectoId, proyectoId]
    );
    await conn.commit();
    await registrarActividad(proyectoId, req.user.id, 'creo_proyecto', nombre);

    res.status(201).json({
      id: proyectoId,
      nombre,
      descripcion: descripcion || null,
      equipo_id: equipo_id || null,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// PUT /api/proyectos/:id -> editar (requiere permiso de administracion).
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoProyecto(id, req.user.id);
    if (!acc.puede) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!acc.puedeAdmin) return res.status(403).json({ error: 'No tenés permiso para editar este proyecto.' });

    const { nombre, descripcion, equipo_id } = req.body;
    // Si se cambia de equipo, validar pertenencia.
    if (equipo_id) {
      const eq = await accesoEquipo(equipo_id, req.user.id);
      if (!eq.existe || !eq.esMiembro) {
        return res.status(403).json({ error: 'No perteneces a ese equipo.' });
      }
    }
    await pool.query(
      'UPDATE proyectos SET nombre = ?, descripcion = ?, equipo_id = ? WHERE id = ?',
      [nombre, descripcion || null, equipo_id || null, id]
    );
    res.json({ id: Number(id), nombre, descripcion: descripcion || null, equipo_id: equipo_id || null });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/proyectos/:id -> eliminar (requiere permiso de administracion).
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoProyecto(id, req.user.id);
    if (!acc.puede) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!acc.puedeAdmin) return res.status(403).json({ error: 'No tenés permiso para eliminar este proyecto.' });

    await pool.query('DELETE FROM proyectos WHERE id = ?', [id]);
    res.json({ mensaje: 'Proyecto eliminado.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/proyectos/:id/tareas -> tablero: columnas + tareas (con responsable y etiquetas)
// + miembros del equipo (para asignar) + meta del proyecto.
async function tablero(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoProyecto(id, req.user.id);
    if (!acc.puede) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const [proyectos] = await pool.query(
      `SELECT p.id, p.nombre, p.descripcion, p.equipo_id, e.nombre AS equipo_nombre
         FROM proyectos p LEFT JOIN equipos e ON e.id = p.equipo_id
        WHERE p.id = ?`,
      [id]
    );
    const [columnas] = await pool.query(
      'SELECT id, nombre, orden FROM columnas WHERE proyecto_id = ? ORDER BY orden',
      [id]
    );
    const [tareas] = await pool.query(
      `SELECT t.id, t.titulo, t.descripcion, t.prioridad, t.completada, t.orden,
              t.columna_id, t.proyecto_id, t.asignado_a, t.fecha_limite, t.created_at,
              u.nombre AS asignado_nombre
         FROM tareas t
         LEFT JOIN usuarios u ON u.id = t.asignado_a
        WHERE t.proyecto_id = ?
        ORDER BY t.orden ASC, t.created_at ASC`,
      [id]
    );
    await adjuntarEtiquetas(tareas);

    // Miembros del equipo (para el selector de responsable); vacio si es personal.
    let miembros = [];
    if (proyectos[0].equipo_id) {
      const [m] = await pool.query(
        `SELECT u.id, u.nombre FROM equipo_miembros em
           JOIN usuarios u ON u.id = em.usuario_id
          WHERE em.equipo_id = ? ORDER BY u.nombre`,
        [proyectos[0].equipo_id]
      );
      miembros = m;
    }

    res.json({ proyecto: proyectos[0], columnas, tareas, miembros });
  } catch (err) {
    next(err);
  }
}

// GET /api/proyectos/:id/actividad -> ultimas acciones del proyecto.
async function actividad(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoProyecto(id, req.user.id);
    if (!acc.puede) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const [items] = await pool.query(
      `SELECT a.id, a.accion, a.detalle, a.created_at, u.nombre AS usuario_nombre
         FROM actividad a JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.proyecto_id = ?
        ORDER BY a.created_at DESC LIMIT 30`,
      [id]
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// Adjunta el array `etiquetas` a cada tarea de la lista (una query para todas).
async function adjuntarEtiquetas(tareas) {
  if (tareas.length === 0) return;
  const ids = tareas.map((t) => t.id);
  const [rels] = await pool.query(
    `SELECT te.tarea_id, e.id, e.nombre, e.color
       FROM tarea_etiquetas te JOIN etiquetas e ON e.id = te.etiqueta_id
      WHERE te.tarea_id IN (?)`,
    [ids]
  );
  const porTarea = {};
  for (const r of rels) {
    (porTarea[r.tarea_id] = porTarea[r.tarea_id] || []).push({
      id: r.id,
      nombre: r.nombre,
      color: r.color,
    });
  }
  for (const t of tareas) t.etiquetas = porTarea[t.id] || [];
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar,
  tablero,
  actividad,
  adjuntarEtiquetas,
};
