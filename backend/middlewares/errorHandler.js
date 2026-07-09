// Manejo CENTRALIZADO de errores.
// Cualquier error que llegue aqui se loguea del lado servidor,
// pero al cliente solo se le envia un mensaje generico:
// NUNCA se exponen stack traces ni detalles internos.

// 404 para rutas no existentes.
function notFound(req, res, _next) {
  res.status(404).json({ error: 'Recurso no encontrado.' });
}

// Manejador final de errores (4 argumentos -> Express lo reconoce como error handler).
function errorHandler(err, req, res, _next) {
  // Log interno para debugging del lado servidor.
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  const status = err.status || 500;
  const mensaje =
    status === 500 ? 'Error interno del servidor.' : err.message || 'Error.';

  res.status(status).json({ error: mensaje });
}

module.exports = { notFound, errorHandler };
