const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SQL_PATH = path.resolve(__dirname, '..', 'db', 'database.sql');
const DEFAULT_LOCK_NAME = 'taskless:init-local-db';
const DEFAULT_LOCK_TIMEOUT_SECONDS = 60;
const SAFE_STATEMENT_PATTERNS = [
  /^CREATE\s+TABLE\b/i,
  /^ALTER\s+TABLE\b/i,
  /^INSERT\s+INTO\b/i,
  /^CREATE\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX\b/i,
];
const DESTRUCTIVE_STATEMENT_PATTERN = /\b(?:DROP|TRUNCATE|DELETE|UPDATE|RENAME)\b|\b(?:CREATE|DROP)\s+DATABASE\b/i;

function isSqlCommentFollower(char) {
  return char === undefined || /\s/.test(char);
}

function splitSqlStatements(sourceSql) {
  const statements = [];
  let current = '';
  let state = 'code';

  for (let index = 0; index < sourceSql.length; index += 1) {
    const char = sourceSql[index];
    const next = sourceSql[index + 1];

    current += char;

    if (state === 'code') {
      if (char === "'") {
        state = 'single';
        continue;
      }

      if (char === '"') {
        state = 'double';
        continue;
      }

      if (char === '`') {
        state = 'backtick';
        continue;
      }

      if (char === '#' ) {
        state = 'line-comment';
        continue;
      }

      if (char === '-' && next === '-' && isSqlCommentFollower(sourceSql[index + 2])) {
        current += next;
        index += 1;
        state = 'line-comment';
        continue;
      }

      if (char === '/' && next === '*') {
        current += next;
        index += 1;
        state = 'block-comment';
        continue;
      }

      if (char === ';') {
        statements.push(current.slice(0, -1).trim());
        current = '';
      }

      continue;
    }

    if (state === 'single') {
      if (char === '\\') {
        const escaped = sourceSql[index + 1];
        if (escaped !== undefined) {
          current += escaped;
          index += 1;
        }
        continue;
      }

      if (char === "'") {
        state = 'code';
      }

      continue;
    }

    if (state === 'double') {
      if (char === '\\') {
        const escaped = sourceSql[index + 1];
        if (escaped !== undefined) {
          current += escaped;
          index += 1;
        }
        continue;
      }

      if (char === '"') {
        state = 'code';
      }

      continue;
    }

    if (state === 'backtick') {
      if (char === '`' && next === '`') {
        current += next;
        index += 1;
        continue;
      }

      if (char === '`') {
        state = 'code';
      }

      continue;
    }

    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') {
        state = 'code';
      }

      continue;
    }

    if (state === 'block-comment' && char === '*' && next === '/') {
      current += next;
      index += 1;
      state = 'code';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

function stripSqlStrings(sourceSql) {
  let result = '';
  let state = 'code';

  for (let index = 0; index < sourceSql.length; index += 1) {
    const char = sourceSql[index];
    const next = sourceSql[index + 1];

    if (state === 'code') {
      if (char === "'") {
        state = 'single';
        result += ' ';
        continue;
      }

      if (char === '"') {
        state = 'double';
        result += ' ';
        continue;
      }

      if (char === '`') {
        state = 'backtick';
        result += ' ';
        continue;
      }

      result += char;
      continue;
    }

    if (state === 'single' || state === 'double') {
      if (char === '\\') {
        if (next !== undefined) {
          index += 1;
        }
        continue;
      }

      if ((state === 'single' && char === "'") || (state === 'double' && char === '"')) {
        state = 'code';
      }

      continue;
    }

    if (state === 'backtick') {
      if (char === '`' && next === '`') {
        index += 1;
        continue;
      }

      if (char === '`') {
        state = 'code';
      }
    }
  }

  return result;
}

function stripSqlCommentsAndStrings(sourceSql) {
  let result = '';
  let state = 'code';

  for (let index = 0; index < sourceSql.length; index += 1) {
    const char = sourceSql[index];
    const next = sourceSql[index + 1];

    if (state === 'code') {
      if (char === "'") {
        state = 'single';
        result += ' ';
        continue;
      }

      if (char === '"') {
        state = 'double';
        result += ' ';
        continue;
      }

      if (char === '`') {
        state = 'backtick';
        result += ' ';
        continue;
      }

      if (char === '#' ) {
        state = 'line-comment';
        result += ' ';
        continue;
      }

      if (char === '-' && next === '-' && isSqlCommentFollower(sourceSql[index + 2])) {
        state = 'line-comment';
        result += '  ';
        index += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        state = 'block-comment';
        result += '  ';
        index += 1;
        continue;
      }

      result += char;
      continue;
    }

    if (state === 'single' || state === 'double') {
      if (char === '\\') {
        if (next !== undefined) {
          index += 1;
        }
        continue;
      }

      if ((state === 'single' && char === "'") || (state === 'double' && char === '"')) {
        state = 'code';
      }

      continue;
    }

    if (state === 'backtick') {
      if (char === '`' && next === '`') {
        index += 1;
        continue;
      }

      if (char === '`') {
        state = 'code';
      }

      continue;
    }

    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') {
        state = 'code';
        result += char;
      }

      continue;
    }

    if (state === 'block-comment' && char === '*' && next === '/') {
      state = 'code';
      index += 1;
    }
  }

  return result;
}

function normalizeSqlStatement(statement) {
  return statement.replace(/\s+/g, ' ').trim();
}

function isUseStatement(statement) {
  const normalizedStatement = normalizeSqlStatement(stripSqlCommentsAndStrings(statement));
  return /^USE\b/i.test(normalizedStatement);
}

function isSafeInitializationStatement(statement) {
  const normalizedStatement = normalizeSqlStatement(stripSqlCommentsAndStrings(statement));

  if (!normalizedStatement) {
    return false;
  }

  if (/^USE\b/i.test(normalizedStatement)) {
    return true;
  }

  return SAFE_STATEMENT_PATTERNS.some((pattern) => pattern.test(normalizedStatement));
}

function hasDestructiveSql(statement) {
  const analysisText = stripSqlStrings(statement)
    .replace(/\bON\s+DELETE\b/ig, 'ON_DELETE_SAFE')
    .replace(/\bON\s+UPDATE\b/ig, 'ON_UPDATE_SAFE');
  return DESTRUCTIVE_STATEMENT_PATTERN.test(analysisText);
}

function loadRuntimeConfig() {
  // eslint-disable-next-line global-require
  return require('../config/env');
}

function readRuntimeDbConfig() {
  const config = loadRuntimeConfig();

  return {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  };
}

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function resolveDatabaseName(options = {}) {
  if (options.databaseName) {
    return options.databaseName;
  }

  return readRuntimeDbConfig().database;
}

function buildInitializationSql(databaseName, sourceSql = fs.readFileSync(SQL_PATH, 'utf8')) {
  const safeStatements = [];
  const statements = splitSqlStatements(sourceSql);
  const firstUseIndex = statements.findIndex((statement) => isUseStatement(statement));

  if (firstUseIndex === -1) {
    throw new Error(`No encontré la sentencia USE inicial en ${path.basename(SQL_PATH)}.`);
  }

  for (const statement of statements.slice(firstUseIndex + 1)) {
    if (!statement.trim()) {
      continue;
    }

    if (hasDestructiveSql(statement)) {
      throw new Error('El payload de inicialización contiene sentencias destructivas.');
    }

    const normalizedStatement = normalizeSqlStatement(stripSqlCommentsAndStrings(statement));

    if (!normalizedStatement) {
      continue;
    }

    if (/^USE\b/i.test(normalizedStatement)) {
      throw new Error('El payload de inicialización contiene una sentencia USE no esperada.');
    }

    if (isSafeInitializationStatement(statement)) {
      safeStatements.push(`${normalizeSqlStatement(statement)};`);
      continue;
    }

    throw new Error('El payload de inicialización contiene una sentencia no permitida.');
  }

  if (safeStatements.length === 0) {
    throw new Error(`No encontré sentencias seguras para importar en ${path.basename(SQL_PATH)}.`);
  }

  return [`USE ${escapeIdentifier(databaseName)};`, ...safeStatements].join('\n');
}

async function databaseExists(connection, databaseName) {
  const [rows] = await connection.query(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    [databaseName]
  );

  return rows.length > 0;
}

async function acquireInitializationLock(
  connection,
  lockName = DEFAULT_LOCK_NAME,
  timeoutSeconds = DEFAULT_LOCK_TIMEOUT_SECONDS
) {
  const [rows] = await connection.query('SELECT GET_LOCK(?, ?) AS lock_status', [lockName, timeoutSeconds]);
  const lockStatus = rows?.[0]?.lock_status;

  if (lockStatus === 1) {
    return true;
  }

  if (lockStatus === 0) {
    throw new Error(`No se pudo obtener el lock de inicialización "${lockName}" dentro de ${timeoutSeconds}s.`);
  }

  throw new Error(`No se pudo obtener el lock de inicialización "${lockName}".`);
}

async function releaseInitializationLock(connection, lockName = DEFAULT_LOCK_NAME) {
  try {
    const [rows] = await connection.query('SELECT RELEASE_LOCK(?) AS lock_released', [lockName]);
    return rows?.[0]?.lock_released === 1;
  } catch (_error) {
    return false;
  }
}

async function withInitializationLock(connection, work, options = {}) {
  const lockName = options.lockName || DEFAULT_LOCK_NAME;
  const timeoutSeconds = options.lockTimeoutSeconds || DEFAULT_LOCK_TIMEOUT_SECONDS;

  await acquireInitializationLock(connection, lockName, timeoutSeconds);

  try {
    return await work();
  } finally {
    await releaseInitializationLock(connection, lockName);
  }
}

async function createDatabase(connection, databaseName) {
  await connection.query(
    `CREATE DATABASE ${escapeIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
}

async function seedDatabase(connection, databaseName, sourceSql = fs.readFileSync(SQL_PATH, 'utf8')) {
  const sqlText = buildInitializationSql(databaseName, sourceSql);
  await connection.query(sqlText);
  return sqlText;
}

async function initializeLocalDatabase(connection, options = {}) {
  const databaseName = resolveDatabaseName(options);
  const sourceSql = options.sqlSource || fs.readFileSync(SQL_PATH, 'utf8');

  return withInitializationLock(
    connection,
    async () => {
      if (await databaseExists(connection, databaseName)) {
        return { status: 'skipped', databaseName };
      }

      await createDatabase(connection, databaseName);
      await seedDatabase(connection, databaseName, sourceSql);
      return { status: 'created', databaseName };
    },
    {
      lockName: options.lockName || `${DEFAULT_LOCK_NAME}:${databaseName}`,
      lockTimeoutSeconds: options.lockTimeoutSeconds,
    }
  );
}

async function createConnection(retries = 5, delayMs = 1000, dbConfig = readRuntimeDbConfig()) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        multipleStatements: true,
      });
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `No pude conectar a MySQL en ${dbConfig.host}:${dbConfig.port} como "${dbConfig.user}": ${lastError.code || lastError.message}`
  );
}

async function readTableCount(connection, databaseName, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS n FROM ${escapeIdentifier(databaseName)}.${escapeIdentifier(tableName)}`
  );

  return rows[0]?.n || 0;
}

async function run() {
  const config = readRuntimeDbConfig();
  // El inicio en frío (recuperación de caídas de InnoDB) puede tardar ~1 min; reintentar generosamente.
  const connection = await createConnection(20, 2000);

  try {
    const result = await initializeLocalDatabase(connection, { databaseName: config.database });

    if (result.status === 'skipped') {
      console.log(`[OK] Base "${config.database}" ya existe. No se hicieron cambios.`);
    } else {
      const usuarios = await readTableCount(connection, config.database, 'usuarios');
      const proyectos = await readTableCount(connection, config.database, 'proyectos');
      const tareas = await readTableCount(connection, config.database, 'tareas');

      console.log(`[OK] Base "${config.database}" creada e importada sin destruir datos existentes.`);
      console.log(`     usuarios: ${usuarios} | proyectos: ${proyectos} | tareas: ${tareas}`);
      console.log('     Login demo: demo@taskless.com / Demo1234');
    }

    return result;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`[X] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  acquireInitializationLock,
  buildInitializationSql,
  createConnection,
  createDatabase,
  databaseExists,
  initializeLocalDatabase,
  loadRuntimeConfig,
  readRuntimeDbConfig,
  readTableCount,
  releaseInitializationLock,
  run,
  seedDatabase,
  resolveDatabaseName,
  withInitializationLock,
};
