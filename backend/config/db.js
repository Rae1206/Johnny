// Configuracion del pool de conexiones a MySQL.
// Usamos mysql2/promise para trabajar con async/await y consultas parametrizadas.
const mysql = require('mysql2/promise');
const config = require('./env');

// Un POOL reutiliza conexiones en lugar de abrir/cerrar una por request.
// Esto mejora el rendimiento y evita agotar las conexiones del servidor MySQL.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Usamos placeholders posicionales `?` que mysql2 escapa
  // automaticamente -> previene SQL Injection.
});

// Verificacion de arranque: fallar rapido si la BD no esta accesible.
async function assertConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

module.exports = { pool, assertConnection };
