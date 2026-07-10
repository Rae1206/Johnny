// ============================================================
//  Taskless — Arranque del servidor (API REST)
// ============================================================
function loadStartupModules() {
  try {
    const config = require('./config/env');
    const createApp = require('./app');
    const { assertConnection } = require('./config/db');
    return { config, createApp, assertConnection };
  } catch (err) {
    if (String(err?.message || '').includes('[config]')) {
      console.error(err.message);
      console.error('Ejecuta INICIAR.bat para generar backend/.env y completar la configuracion guiada.');
      process.exit(1);
    }
    throw err;
  }
}

const { config, createApp, assertConnection } = loadStartupModules();

// Red de seguridad: si alguna promesa rechaza sin capturarse (p.ej. un error
// de base en un handler que se escapo del try/catch), logueamos y seguimos vivos
// en vez de dejar que Node mate el proceso en medio de una peticion.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Promesa rechazada sin capturar:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Excepcion no capturada:', err);
});

const app = createApp();
const PORT = config.port;

// Espera a que MySQL este listo, reintentando con backoff.
// Evita que el backend se caiga si la base tarda unos segundos en levantar
// (caso tipico al arrancar MySQL y el backend casi al mismo tiempo).
async function esperarMySQL(reintentos = 30, esperaMs = 1500) {
  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      await assertConnection();
      return;
    } catch (err) {
      if (intento === reintentos) throw err;
      console.log(
        `… MySQL todavia no responde (${err.code || err.message}). ` +
          `Reintento ${intento}/${reintentos} en ${esperaMs / 1000}s…`
      );
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}

(async () => {
  try {
    await esperarMySQL();
    console.log('✔ Conexion a MySQL establecida.');

    const server = app.listen(PORT, () => {
      console.log(`✔ API Taskless escuchando en http://localhost:${PORT}`);
      console.log(`✔ CORS permitido para: ${config.clientOrigin}`);
    });

    // Manejo elegante si el puerto ya esta ocupado (otra instancia corriendo),
    // en vez de un stack trace por un 'error' no capturado.
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[X] El puerto ${PORT} ya esta en uso.`);
        console.error('  Probablemente YA hay un backend de Taskless corriendo. Usa esa instancia,');
        console.error('  o deten la anterior con PARAR.bat antes de arrancar otra.');
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    console.error('[X] No se pudo conectar a MySQL tras varios intentos:', err.code || err.message);
    console.error('  Revisa tu configuracion de entorno (DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) y que MySQL este corriendo.');
    process.exit(1);
  }
})();
