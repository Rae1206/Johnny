// Controlador de tareas: listado con filtros/busqueda + CRUD + asignacion.
// Acceso: una tarea es visible/editable si sos su creador, su responsable,
// o miembro (con acceso) del proyecto al que pertenece.
const { pool } = require('../config/db');
const { accesoProyecto, registrarActividad, notificar } = require('../utils/access');
const { adjuntarEtiquetas } = require('./proyectos.controller');

// Resuelve el acceso a una tarea concreta.
async function accesoTarea(tareaId, usuarioId) {
  const [rows] = await pool.query(
    'SELECT id, proyecto_id, usuario_id, asignado_a FROM tareas WHERE id = ? LIMIT 1',
    [tareaId]
  );
  if (rows.length === 0) return { existe: false };
  const t = rows[0];
  const esCreador = t.usuario_id === usuarioId;
  const esResponsable = t.asignado_a === usuarioId;

  if (!t.proyecto_id) {
    // Tarea personal (sin proyecto).
    return { existe: true, tarea: t, puede: esCreador || esResponsable, puedeBorrar: esCreador };
  }
  const acc = await accesoProyecto(t.proyecto_id, usuarioId);
  return {
    existe: true,
    tarea: t,
    puede: acc.puede || esCreador || esResponsable,
    puedeBorrar: acc.puedeAdmin || esCreador,
  };
}

// Verifica que un responsable pertenezca al equipo del proyecto (o sea uno mismo / personal).
async function responsableValido(asignadoA, proyectoId, usuarioId) {
  if (asignadoA == null) return true;
  if (!proyectoId) return asignadoA === usuarioId; // personal: solo uno mismo
  const [rows] = await pool.query(
    `SELECT 1 FROM proyectos p
       JOIN equipo_miembros em ON em.equipo_id = p.equipo_id
      WHERE p.id = ? AND em.usuario_id = ? LIMIT 1`,
    [proyectoId, asignadoA]
  );
  // Tambien vale si el proyecto es del propio asignado (personal dentro de equipo).
  if (rows.length > 0) return true;
  const [own] = await pool.query('SELECT 1 FROM proyectos WHERE id = ? AND usuario_id = ? LIMIT 1', [
    proyectoId,
    asignadoA,
  ]);
  return own.length > 0;
}

async function obtenerTarea(id) {
  const [filas] = await pool.query(
    `SELECT t.id, t.titulo, t.descripcion, t.prioridad, t.completada, t.orden,
            t.columna_id, t.proyecto_id, t.asignado_a, t.fecha_limite, t.created_at,
            p.nombre AS proyecto_nombre, u.nombre AS asignado_nombre
       FROM tareas t
       LEFT JOIN proyectos p ON p.id = t.proyecto_id
       LEFT JOIN usuarios u ON u.id = t.asignado_a
      WHERE t.id = ?`,
    [id]
  );
  const tarea = filas[0];
  if (tarea) await adjuntarEtiquetas([tarea]);
  return tarea;
}

// GET /api/tareas?prioridad=&estado=&q=&mias=&page=&limit=
async function listar(req, res, next) {
  try {
    const { prioridad, estado, q, mias } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // Acceso: propias, asignadas, o de proyectos donde soy miembro/dueño.
    const where = [
      '(t.usuario_id = ? OR t.asignado_a = ? OR p.usuario_id = ? OR em.usuario_id = ?)',
    ];
    const params = [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id];
    // (el primer ? es del JOIN de em; los 4 siguientes, del WHERE)

    if (prioridad && ['baja', 'media', 'alta'].includes(prioridad)) {
      where.push('t.prioridad = ?');
      params.push(prioridad);
    }
    if (estado === 'completada') where.push('t.completada = 1');
    else if (estado === 'pendiente') where.push('t.completada = 0');
    if (mias === '1' || mias === 'true') {
      where.push('t.asignado_a = ?');
      params.push(req.user.id);
    }
    if (q && q.trim()) {
      where.push('(t.titulo LIKE ? OR t.descripcion LIKE ?)');
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    params.push(limit, offset);
    const [tareas] = await pool.query(
      `SELECT DISTINCT t.id, t.titulo, t.descripcion, t.prioridad, t.completada, t.orden,
              t.columna_id, t.proyecto_id, t.asignado_a, t.fecha_limite, t.created_at,
              p.nombre AS proyecto_nombre, u.nombre AS asignado_nombre
         FROM tareas t
         LEFT JOIN proyectos p ON p.id = t.proyecto_id
         LEFT JOIN usuarios u ON u.id = t.asignado_a
         LEFT JOIN equipo_miembros em ON em.equipo_id = p.equipo_id AND em.usuario_id = ?
        WHERE ${where.join(' AND ')}
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?`,
      params
    );
    await adjuntarEtiquetas(tareas);
    res.json(tareas);
  } catch (err) {
    next(err);
  }
}

// POST /api/tareas
async function crear(req, res, next) {
  try {
    const { titulo, descripcion, prioridad, proyecto_id, columna_id, asignado_a, fecha_limite } =
      req.body;

    if (proyecto_id) {
      const acc = await accesoProyecto(proyecto_id, req.user.id);
      if (!acc.existe || !acc.puede) {
        return res.status(403).json({ error: 'Proyecto ajeno o inexistente.' });
      }
    }
    if (!(await responsableValido(asignado_a, proyecto_id, req.user.id))) {
      return res.status(403).json({ error: 'El responsable no pertenece al equipo del proyecto.' });
    }

    const [result] = await pool.query(
      `INSERT INTO tareas
         (titulo, descripcion, prioridad, columna_id, proyecto_id, usuario_id, asignado_a, fecha_limite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        descripcion || null,
        prioridad || 'media',
        columna_id || null,
        proyecto_id || null,
        req.user.id,
        asignado_a || null,
        fecha_limite || null,
      ]
    );

    if (proyecto_id) await registrarActividad(proyecto_id, req.user.id, 'creo_tarea', titulo);
    if (asignado_a && asignado_a !== req.user.id) {
      await notificar(asignado_a, 'asignacion', `Te asignaron: ${titulo}`, proyecto_id ? `/proyectos/${proyecto_id}` : '/');
    }

    res.status(201).json(await obtenerTarea(result.insertId));
  } catch (err) {
    next(err);
  }
}

// PUT /api/tareas/:id
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoTarea(id, req.user.id);
    if (!acc.existe || !acc.puede) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const { titulo, descripcion, prioridad, completada, columna_id, orden, asignado_a, fecha_limite } =
      req.body;

    if (columna_id !== undefined && columna_id !== null) {
      const acc2 = await accesoProyecto(acc.tarea.proyecto_id, req.user.id);
      if (acc.tarea.proyecto_id && !acc2.puede) {
        return res.status(403).json({ error: 'Columna ajena o inexistente.' });
      }
    }
    if (asignado_a !== undefined &&
        !(await responsableValido(asignado_a, acc.tarea.proyecto_id, req.user.id))) {
      return res.status(403).json({ error: 'El responsable no pertenece al equipo del proyecto.' });
    }

    const campos = [];
    const params = [];
    if (titulo !== undefined) { campos.push('titulo = ?'); params.push(titulo); }
    if (descripcion !== undefined) { campos.push('descripcion = ?'); params.push(descripcion || null); }
    if (prioridad !== undefined) { campos.push('prioridad = ?'); params.push(prioridad); }
    if (completada !== undefined) { campos.push('completada = ?'); params.push(completada ? 1 : 0); }
    if (columna_id !== undefined) { campos.push('columna_id = ?'); params.push(columna_id || null); }
    if (orden !== undefined) { campos.push('orden = ?'); params.push(Number(orden) || 0); }
    if (asignado_a !== undefined) { campos.push('asignado_a = ?'); params.push(asignado_a || null); }
    if (fecha_limite !== undefined) { campos.push('fecha_limite = ?'); params.push(fecha_limite || null); }

    if (campos.length === 0) return res.status(400).json({ error: 'Nada para actualizar.' });

    params.push(id);
    await pool.query(`UPDATE tareas SET ${campos.join(', ')} WHERE id = ?`, params);

    // Notificar si cambio el responsable a otra persona.
    if (asignado_a !== undefined && asignado_a && asignado_a !== req.user.id &&
        asignado_a !== acc.tarea.asignado_a) {
      const t = await obtenerTarea(id);
      await notificar(asignado_a, 'asignacion', `Te asignaron: ${t.titulo}`,
        t.proyecto_id ? `/proyectos/${t.proyecto_id}` : '/');
    }

    res.json(await obtenerTarea(id));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tareas/:id
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const acc = await accesoTarea(id, req.user.id);
    if (!acc.existe || !acc.puede) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (!acc.puedeBorrar) return res.status(403).json({ error: 'No tenés permiso para eliminar esta tarea.' });

    await pool.query('DELETE FROM tareas WHERE id = ?', [id]);
    res.json({ mensaje: 'Tarea eliminada.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, actualizar, eliminar, accesoTarea };
