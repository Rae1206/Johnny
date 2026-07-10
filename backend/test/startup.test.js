const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ensureLocalEnv = require('../scripts/ensure-local-env');
const initLocalDb = require('../scripts/init-local-db');

const INIT_LOCAL_DB_PATH = path.resolve(__dirname, '..', 'scripts', 'init-local-db.js');
const EXPORT_RUNTIME_ENV_PATH = path.resolve(__dirname, '..', 'scripts', 'export-runtime-env.js');

function baseNodeEnv(overrides = {}) {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    ...overrides,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createConcurrentInitHarness() {
  const events = [];
  const state = {
    databaseExists: false,
    lockHolder: null,
    waitingLock: null,
  };

  function createConnection(name) {
    return {
      async query(sql, params = []) {
        events.push({ name, sql, params: [...params] });

        if (sql.includes('GET_LOCK')) {
          if (!state.lockHolder) {
            state.lockHolder = name;
            return [[{ lock_status: 1 }], []];
          }

          const deferred = createDeferred();
          state.waitingLock = deferred;

          await deferred.promise;
          state.lockHolder = name;
          return [[{ lock_status: 1 }], []];
        }

        if (sql.includes('RELEASE_LOCK')) {
          if (state.lockHolder === name) {
            state.lockHolder = null;
            if (state.waitingLock) {
              const next = state.waitingLock;
              state.waitingLock = null;
              next.resolve();
            }
            return [[{ lock_released: 1 }], []];
          }

          return [[{ lock_released: 0 }], []];
        }

        if (sql.includes('INFORMATION_SCHEMA.SCHEMATA')) {
          return [state.databaseExists ? [{ SCHEMA_NAME: 'custom_taskless' }] : [], []];
        }

        if (sql.startsWith('CREATE DATABASE')) {
          state.databaseExists = true;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [[], []];
        }

        if (sql.startsWith('USE ') || sql.startsWith('CREATE TABLE') || sql.startsWith('INSERT INTO')) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [[], []];
        }

        throw new Error(`Unexpected SQL in test harness: ${sql}`);
      },
    };
  }

  return {
    createConnection,
    events,
    state,
  };
}

test('ensure-local-env generates a per-installation JWT secret when missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskless-env-'));
  const envPath = path.join(dir, '.env');

  const result = ensureLocalEnv.ensureJwtSecret(envPath);

  assert.equal(result.status, 'written');
  const content = fs.readFileSync(envPath, 'utf8');
  assert.match(content, /JWT_SECRET=/);
  assert.match(content, /Generado localmente/);
});

test('ensure-local-env leaves an existing JWT_SECRET untouched', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskless-env-existing-'));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, 'PORT=4000\r\nJWT_SECRET=already-here\r\n', 'utf8');

  const result = ensureLocalEnv.ensureJwtSecret(envPath);

  assert.equal(result.status, 'unchanged');
  assert.equal(fs.readFileSync(envPath, 'utf8'), 'PORT=4000\r\nJWT_SECRET=already-here\r\n');
});

test('init-local-db resolves database settings from the runtime config layer', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `const mod = require(${JSON.stringify(INIT_LOCAL_DB_PATH)});
       process.stdout.write(JSON.stringify(mod.readRuntimeDbConfig()));`,
    ],
    {
      cwd: path.resolve(__dirname, '..', '..'),
      env: baseNodeEnv({
        JWT_SECRET: 'test-secret',
        DB_HOST: '10.0.0.10',
        DB_PORT: '3310',
        DB_USER: 'taskless_user',
        DB_PASSWORD: 'override-secret',
        DB_NAME: 'custom_taskless',
      }),
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(JSON.parse(result.stdout), {
    host: '10.0.0.10',
    port: 3310,
    user: 'taskless_user',
    password: 'override-secret',
    database: 'custom_taskless',
  });
});

test('export-runtime-env mirrors the effective runtime configuration for batch startup', () => {
  const result = spawnSync(
    process.execPath,
    [EXPORT_RUNTIME_ENV_PATH],
    {
      cwd: path.resolve(__dirname, '..', '..'),
      env: baseNodeEnv({
        JWT_SECRET: 'test-secret',
        DB_HOST: '10.0.0.11',
        DB_PORT: '3311',
        DB_USER: 'batch_user',
        DB_PASSWORD: 'batch-secret',
        DB_NAME: 'batch_taskless',
      }),
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /DB_HOST=10\.0\.0\.11/);
  assert.match(result.stdout, /DB_PORT=3311/);
  assert.match(result.stdout, /DB_USER=batch_user/);
  assert.match(result.stdout, /DB_PASSWORD=batch-secret/);
  assert.match(result.stdout, /DB_NAME=batch_taskless/);
});

test('init-local-db builds a safe payload from the current database schema', () => {
  const sql = initLocalDb.buildInitializationSql(
    'custom_taskless',
    fs.readFileSync(path.resolve(__dirname, '..', 'db', 'database.sql'), 'utf8')
  );

  assert.match(sql, /^USE `custom_taskless`;/);
  assert.doesNotMatch(sql, /DROP\s+DATABASE|CREATE\s+DATABASE/i);
  assert.match(sql, /CREATE TABLE usuarios/i);
  assert.match(sql, /CREATE INDEX idx_refresh_tokens_user/i);
  assert.match(sql, /INSERT INTO usuarios/i);
});

test('init-local-db rejects destructive SQL hidden inline, across multiple statements, mixed case, or in comments', () => {
  const adversarialSources = [
    {
      name: 'inline drop after safe statements',
      sql: [
        'USE taskless;',
        'CREATE TABLE usuarios (id INT); INSERT INTO usuarios VALUES (1); DROP DATABASE taskless;',
      ].join('\n'),
    },
    {
      name: 'mixed-case drop table after safe statements',
      sql: [
        'USE taskless;',
        'CREATE TABLE usuarios (id INT);',
        'insert into usuarios values (1); dRoP TaBlE usuarios;',
      ].join('\n'),
    },
    {
      name: 'comment-obscured drop',
      sql: [
        'USE taskless;',
        'CREATE TABLE usuarios (id INT); /* DROP DATABASE taskless; */',
        'INSERT INTO usuarios VALUES (1);',
      ].join('\n'),
    },
  ];

  for (const { name, sql } of adversarialSources) {
    assert.throws(
      () => initLocalDb.buildInitializationSql('custom_taskless', sql),
      /sentencias destructivas|no permitida/i,
      name
    );
  }
});

test('init-local-db serializes concurrent starts and rechecks after acquiring the lock', async () => {
  const harness = createConcurrentInitHarness();
  const destructiveSource = [
    '-- bootstrap header',
    'DROP DATABASE IF EXISTS taskless;',
    'CREATE DATABASE taskless;',
    'USE taskless;',
    'CREATE TABLE usuarios (id INT);',
    'INSERT INTO usuarios VALUES (1);',
  ].join('\n');

  const [first, second] = await Promise.all([
    initLocalDb.initializeLocalDatabase(harness.createConnection('alpha'), {
      databaseName: 'custom_taskless',
      sqlSource: destructiveSource,
      lockName: 'taskless:test-lock',
    }),
    initLocalDb.initializeLocalDatabase(harness.createConnection('beta'), {
      databaseName: 'custom_taskless',
      sqlSource: destructiveSource,
      lockName: 'taskless:test-lock',
    }),
  ]);

  assert.deepEqual(first, { status: 'created', databaseName: 'custom_taskless' });
  assert.deepEqual(second, { status: 'skipped', databaseName: 'custom_taskless' });

  const lockQueries = harness.events.filter((event) => event.sql.includes('GET_LOCK'));
  const schemaChecks = harness.events.filter((event) => event.sql.includes('INFORMATION_SCHEMA.SCHEMATA'));
  const createDatabaseQueries = harness.events.filter((event) => event.sql.startsWith('CREATE DATABASE'));
  const importQueries = harness.events.filter((event) => event.sql.startsWith('USE '));

  assert.equal(lockQueries.length, 2);
  assert.equal(schemaChecks.length, 2);
  assert.equal(createDatabaseQueries.length, 1);
  assert.equal(importQueries.length, 1);
  assert.doesNotMatch(importQueries[0].sql, /DROP\s+DATABASE|DROP\s+TABLE|CREATE\s+DATABASE/i);
  assert.match(importQueries[0].sql, /USE `custom_taskless`;/);
  assert.equal(harness.state.databaseExists, true);
});

test('INICIAR.bat supports a controlled skip mode for syntax validation', () => {
  const root = path.resolve(__dirname, '..', '..');
  const result = spawnSync(
    'cmd',
    ['/d', '/s', '/c', 'set TASKLESS_SKIP_STARTUP=1&&call INICIAR.bat'],
    {
      cwd: root,
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}${result.stderr}`, /TASKLESS_SKIP_STARTUP/i);
});
