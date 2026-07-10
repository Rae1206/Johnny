const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const modulePath = path.resolve(__dirname, '..', 'config', 'env.js');
const localConfigPath = path.resolve(__dirname, '..', 'config', 'local.js');
const testJwtSecret = crypto.randomBytes(32).toString('hex');

function loadConfig(overrides = {}, { withJwtSecret = true } = {}) {
  const env = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
  };

  if (withJwtSecret && overrides.JWT_SECRET === undefined) {
    env.JWT_SECRET = testJwtSecret;
  }

  Object.assign(env, overrides);

  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `try {
        const config = require(${JSON.stringify(modulePath)});
        process.stdout.write(JSON.stringify(config));
      } catch (error) {
        console.error(error.message);
        process.exit(1);
      }`,
    ],
    {
      cwd: process.env.TEMP || process.cwd(),
      env,
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    throw new Error(`${result.stdout}${result.stderr}`.trim());
  }

  return JSON.parse(result.stdout);
}

test('backend/config/local.js keeps the original editable local defaults', () => {
  const localConfig = fs.readFileSync(localConfigPath, 'utf8');

  assert.match(localConfig, /DB_HOST:\s*'127\.0\.0\.1'/i);
  assert.match(localConfig, /DB_PORT:\s*3306/i);
  assert.match(localConfig, /DB_USER:\s*'root'/i);
  assert.match(localConfig, /DB_PASSWORD:\s*'admin'/i);
  assert.match(localConfig, /DB_NAME:\s*'taskless'/i);
  assert.doesNotMatch(localConfig, /JWT_SECRET/i);
});

test('config/env resolves the local defaults when only JWT_SECRET is provided', () => {
  const config = loadConfig();

  assert.equal(config.port, 4000);
  assert.equal(config.clientOrigin, 'http://localhost:5173');
  assert.equal(config.db.host, '127.0.0.1');
  assert.equal(config.db.port, 3306);
  assert.equal(config.db.user, 'root');
  assert.equal(config.db.password, 'admin');
  assert.equal(config.db.database, 'taskless');
  assert.equal(config.jwtSecret, testJwtSecret);
  assert.equal(config.accessTokenExpiresIn, '15m');
});

test('config/env lets backend/.env override the local defaults', () => {
  const config = loadConfig({
    PORT: '4500',
    CLIENT_ORIGIN: 'http://localhost:5174',
    DB_HOST: '10.0.0.10',
    DB_PORT: '3310',
    DB_USER: 'taskless_user',
    DB_PASSWORD: 'override-secret',
    DB_NAME: 'custom_taskless',
    JWT_SECRET: 'override-jwt',
    ACCESS_TOKEN_EXPIRES_IN: '10m',
  });

  assert.equal(config.port, 4500);
  assert.equal(config.clientOrigin, 'http://localhost:5174');
  assert.equal(config.db.host, '10.0.0.10');
  assert.equal(config.db.port, 3310);
  assert.equal(config.db.user, 'taskless_user');
  assert.equal(config.db.password, 'override-secret');
  assert.equal(config.db.database, 'custom_taskless');
  assert.equal(config.jwtSecret, 'override-jwt');
  assert.equal(config.accessTokenExpiresIn, '10m');
});

test('config/env accepts an explicitly empty DB_PASSWORD override', () => {
  const config = loadConfig({ DB_PASSWORD: '' });

  assert.equal(config.db.password, '');
});

test('config/env fails fast when JWT_SECRET is missing', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `try {
        require(${JSON.stringify(modulePath)});
        process.exit(0);
      } catch (error) {
        console.error(error.message);
        process.exit(1);
      }`,
    ],
    {
      cwd: process.env.TEMP || process.cwd(),
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      },
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /JWT_SECRET/i);
});
