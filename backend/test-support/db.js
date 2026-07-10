// Helper de tests: crea y siembra la base 'taskless_test' desde database.sql.
// Reutiliza el MISMO esquema y seed que produccion, pero en una base aparte,
// para que los tests sean aislados y repetibles (no tocan 'taskless').
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cfg = require('../config/env');

async function setupTestDb() {
  // Tomamos el esquema + seed de database.sql, quitando el encabezado
  // que crea/usa la base 'taskless' (los tests usan 'taskless_test').
  const raw = fs.readFileSync(path.join(__dirname, '..', 'db', 'database.sql'), 'utf8');
  const marker = 'USE taskless;';
  const schemaSeed = raw.slice(raw.indexOf(marker) + marker.length);

  let root;
  try {
    root = await mysql.createConnection({
      host: cfg.db.host,
      port: cfg.db.port,
      user: cfg.db.user,
      password: cfg.db.password,
      multipleStatements: true,
    });
  } catch (error) {
    throw new Error(
      `MySQL de pruebas no disponible en ${cfg.db.host}:${cfg.db.port} como "${cfg.db.user}": ${error.code || error.message}`
    );
  }

  try {
    await root.query(
      `DROP DATABASE IF EXISTS taskless_test;
       CREATE DATABASE taskless_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } catch (error) {
    throw new Error(`No se pudo preparar taskless_test: ${error.sqlMessage || error.message}`);
  } finally {
    await root.end();
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: cfg.db.host,
      port: cfg.db.port,
      user: cfg.db.user,
      password: cfg.db.password,
      database: 'taskless_test',
      multipleStatements: true,
    });
  } catch (error) {
    throw new Error(
      `No se pudo conectar a taskless_test en ${cfg.db.host}:${cfg.db.port}: ${error.code || error.message}`
    );
  }

  try {
    await conn.query(schemaSeed);
  } catch (error) {
    throw new Error(`No se pudo importar database.sql en taskless_test: ${error.sqlMessage || error.message}`);
  } finally {
    await conn.end();
  }
}

module.exports = { setupTestDb };
