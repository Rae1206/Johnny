// Script de setup de la base de datos.
// Crea la base 'taskless', todas las tablas y los datos de prueba (seed)
// ejecutando db/database.sql. Idempotente: el .sql hace DROP + CREATE.
//
// Uso:  npm run setup   (desde la carpeta backend)
//
// Requiere: un servidor MySQL corriendo con las credenciales de config/env.js
// (por defecto root/admin en localhost:3306; editables en config/local.js).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cfg = require('../config/env');

(async () => {
  const sqlPath = path.join(__dirname, '..', 'db', 'database.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

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
    console.error('    ¿Está corriendo MySQL? ¿Coinciden usuario/contraseña en backend/config/local.js?\n');
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
