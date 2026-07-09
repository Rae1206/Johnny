// Middleware de AUTENTICACION.
// Verifica el JWT enviado en el header Authorization: "Bearer <token>".
// Si es valido, adjunta los datos del usuario a req.user y deja pasar.
// Si no, responde 401. Protege TODAS las rutas de proyectos y tareas.
const jwt = require('jsonwebtoken');
const config = require('../config/env');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autorizado: falta el token.' });
  }

  try {
    // jwt.verify lanza si el token esta expirado o es invalido.
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, email: payload.email, rol: payload.rol };
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

module.exports = verifyToken;
