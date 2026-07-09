// Helper de tests: crea y siembra la base 'taskless_test' desde database.sql.
// Reutiliza el MISMO esquema y seed que produccion, pero en una base aparte,
// para que los tests sean aislados y repetibles (no tocan 'taskless').
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cfg = require('../../config/env');

async function setupTestDb() {
  // Tomamos el esquema + seed de database.sql, quitando el encabezado
  // que crea/usa la base 'taskless' (los tests usan 'taskless_test').
  const raw = fs.readFileSync(
    path.join(__dirname, '..', '..', 'db', 'database.sql'),
    'utf8'
  );
  const marker = 'USE taskless;';
  const schemaSeed = raw.slice(raw.indexOf(marker) + marker.length);

  // 1) Crear la base de test desde cero.
  const root = await mysql.createConnection({
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    multipleStatements: true,
  });
  await root.query(
    `DROP DATABASE IF EXISTS taskless_test;
     CREATE DATABASE taskless_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await root.end();

  // 2) Cargar esquema + seed dentro de taskless_test.
  const conn = await mysql.createConnection({
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    database: 'taskless_test',
    multipleStatements: true,
  });
  await conn.query(schemaSeed);
  await conn.end();
}

module.exports = { setupTestDb };
