// Script de setup de la base de datos.
// Crea la base 'taskless', todas las tablas y los datos de prueba (seed)
// ejecutando db/database.sql. Idempotente: el .sql hace DROP + CREATE.
//
// Uso:  npm run setup   (desde la carpeta backend)
//
// Requiere: un servidor MySQL corriendo con las credenciales definidas en
// backend/.env o variables de entorno.
//
// ATENCION: este comando sigue siendo el reset destructivo intencional.
// Borra y recrea la base taskless desde cero usando db/database.sql.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

let cfg;
try {
  cfg = require('../config/env');
} catch (err) {
  console.error(err.message);
  console.error('Ejecuta INICIAR.bat para generar backend/.env con la configuracion guiada antes de correr el setup.');
  process.exit(1);
}

(async () => {
  const sqlPath = path.join(__dirname, '..', 'db', 'database.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[WARN] npm run setup elimina y recrea la base taskless antes de importar db/database.sql.');

  let conn;
  try {
    // Conectamos SIN seleccionar base: el .sql crea la base desde cero.
    conn = await mysql.createConnection({
      host: cfg.db.host,
      port: cfg.db.port,
      user: cfg.db.user,
      password: cfg.db.password,
      multipleStatements: true,
    });
  } catch (e) {
    console.error('\n[X] No pude conectar a MySQL en',
      `${cfg.db.host}:${cfg.db.port} como "${cfg.db.user}".`);
    console.error('    Motivo:', e.code || e.message);
    console.error('    ¿Está corriendo MySQL? ¿Coinciden las variables DB_HOST/DB_USER/DB_PASSWORD/DB_NAME?\n');
    process.exit(1);
  }

  try {
    await conn.query(sql);
    const [u] = await conn.query('SELECT COUNT(*) AS n FROM taskless.usuarios');
    const [p] = await conn.query('SELECT COUNT(*) AS n FROM taskless.proyectos');
    const [t] = await conn.query('SELECT COUNT(*) AS n FROM taskless.tareas');
    console.log('\n[OK] Base "taskless" creada e importada.');
    console.log(`     usuarios: ${u[0].n} | proyectos: ${p[0].n} | tareas: ${t[0].n}`);
    console.log('     Login demo: demo@taskless.com / Demo1234\n');
  } catch (e) {
    console.error('[X] Error importando el .sql:', e.sqlMessage || e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
