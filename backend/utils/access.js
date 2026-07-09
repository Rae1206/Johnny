// Control de acceso CENTRAL (una sola fuente de verdad).
// Regla: un usuario accede a un proyecto si es su dueño O es miembro del
// equipo del proyecto. Puede administrarlo si es dueño O admin del equipo.
// Toda ruta de proyectos/tareas debe pasar por aca -> sin logica repartida.
const { pool } = require('../config/db');

// Devuelve { existe, puede, puedeAdmin } para (proyecto, usuario).
async function accesoProyecto(proyectoId, usuarioId) {
  const [rows] = await pool.query(
    `SELECT p.usuario_id AS owner, em.rol AS rolEquipo
       FROM proyectos p
       LEFT JOIN equipo_miembros em
         ON em.equipo_id = p.equipo_id AND em.usuario_id = ?
      WHERE p.id = ?
      LIMIT 1`,
    [usuarioId, proyectoId]
  );
  if (rows.length === 0) return { existe: false, puede: false, puedeAdmin: false };

  const { owner, rolEquipo } = rows[0];
  const esOwner = owner === usuarioId;
  const esMiembro = rolEquipo != null;
  const esAdminEquipo = rolEquipo === 'admin';
  return {
    existe: true,
    puede: esOwner || esMiembro,
    puedeAdmin: esOwner || esAdminEquipo,
  };
}

// Devuelve { existe, esMiembro, esAdmin } para (equipo, usuario).
async function accesoEquipo(equipoId, usuarioId) {
  const [rows] = await pool.query(
    `SELECT e.owner_id AS owner, em.rol AS rol
       FROM equipos e
       LEFT JOIN equipo_miembros em
         ON em.equipo_id = e.id AND em.usuario_id = ?
      WHERE e.id = ?
      LIMIT 1`,
    [usuarioId, equipoId]
  );
  if (rows.length === 0) return { existe: false, esMiembro: false, esAdmin: false };
  const { owner, rol } = rows[0];
  const esOwner = owner === usuarioId;
  return {
    existe: true,
    esMiembro: esOwner || rol != null,
    esAdmin: esOwner || rol === 'admin',
  };
}

// Registra una linea de actividad (best-effort, no rompe si falla).
async function registrarActividad(proyectoId, usuarioId, accion, detalle) {
  try {
    await pool.query(
      'INSERT INTO actividad (proyecto_id, usuario_id, accion, detalle) VALUES (?, ?, ?, ?)',
      [proyectoId || null, usuarioId, accion, detalle || null]
    );
  } catch (_e) {
    /* la actividad es informativa: nunca debe tumbar la operacion principal */
  }
}

// Crea una notificacion para un usuario (best-effort).
async function notificar(usuarioId, tipo, mensaje, enlace) {
  try {
    await pool.query(
      'INSERT INTO notificaciones (usuario_id, tipo, mensaje, enlace) VALUES (?, ?, ?, ?)',
      [usuarioId, tipo, mensaje, enlace || null]
    );
  } catch (_e) {
    /* idem */
  }
}

module.exports = { accesoProyecto, accesoEquipo, registrarActividad, notificar };
