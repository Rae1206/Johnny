const config = require('../config/env');

function formatEntry(key, value) {
  return `${key}=${value ?? ''}`;
}

function run() {
  const entries = {
    PORT: config.port,
    CLIENT_ORIGIN: config.clientOrigin,
    DB_HOST: config.db.host,
    DB_PORT: config.db.port,
    DB_USER: config.db.user,
    DB_PASSWORD: config.db.password,
    DB_NAME: config.db.database,
    JWT_SECRET: config.jwtSecret,
    ACCESS_TOKEN_EXPIRES_IN: config.accessTokenExpiresIn,
  };

  for (const [key, value] of Object.entries(entries)) {
    console.log(formatEntry(key, value));
  }

  return entries;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`[X] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { run };
