// Middleware que recolecta los errores de express-validator.
// Se coloca DESPUES de las reglas de validacion en cada ruta.
// Si hay errores, corta con 400 y devuelve la lista; nunca continua.
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      error: 'Datos invalidos.',
      detalles: errores.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
    });
  }
  next();
}

// Sanitizador simple contra XSS: neutraliza < y > para que ningun
// texto guardado pueda inyectar etiquetas HTML/script al renderizarse.
// Se usa como .customSanitizer() en las reglas de validacion.
function sanitizeXSS(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

module.exports = { validate, sanitizeXSS };
