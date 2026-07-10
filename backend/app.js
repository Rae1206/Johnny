// Construye y exporta la app Express (sin escuchar puerto).
// Separar la app del arranque permite testearla con supertest
// sin abrir un puerto ni conectarse en el import.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const proyectosRoutes = require('./routes/proyectos.routes');
const tareasRoutes = require('./routes/tareas.routes');
const equiposRoutes = require('./routes/equipos.routes');
const etiquetasRoutes = require('./routes/etiquetas.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const perfilRoutes = require('./routes/perfil.routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { authLimiter } = require('./middlewares/rateLimiters');

function createApp() {
  const app = express();

  // 1) HELMET: cabeceras HTTP seguras.
  app.use(helmet());

  // 2) CORS restringido al frontend. Nunca origin: '*'.
  //    Aceptamos el origen configurado y su equivalente con 127.0.0.1,
  //    porque el navegador trata "localhost" y "127.0.0.1" como origenes
  //    DISTINTOS y el CORS compara texto exacto (causa comun de errores).
  const allowedOrigins = [
    config.clientOrigin,
    config.clientOrigin.replace('localhost', '127.0.0.1'),
    config.clientOrigin.replace('127.0.0.1', 'localhost'),
  ];
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        // Permitir requests sin Origin (curl, apps nativas) y los origenes de la lista.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3) Parseo de JSON con limite de tamaño (evita payloads abusivos).
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/proyectos', proyectosRoutes);
  app.use('/api/tareas', tareasRoutes);
  app.use('/api/equipos', equiposRoutes);
  app.use('/api/etiquetas', etiquetasRoutes);
  app.use('/api/notificaciones', notificacionesRoutes);
  app.use('/api/perfil', perfilRoutes);

  // 404 + manejo centralizado de errores (nunca expone stack traces).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
