const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const ENV_PATH = path.resolve(__dirname, '..', '.env');

function generateJwtSecret() {
  return crypto.randomBytes(48).toString('base64url');
}

function readEnvFile(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJwtSecret(filePath = ENV_PATH, secret = generateJwtSecret()) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const normalizedExisting = existing.replace(/\s*$/, '');
  const secretLine = `JWT_SECRET=${secret}`;
  const updatedExisting = normalizedExisting.replace(/^JWT_SECRET=.*$/m, secretLine);

  if (/^JWT_SECRET=.*$/m.test(normalizedExisting)) {
    fs.writeFileSync(filePath, `${updatedExisting}\r\n`, { encoding: 'utf8' });
    return filePath;
  }

  const content = normalizedExisting
    ? `${normalizedExisting}\r\n${secretLine}\r\n`
    : `# Generado localmente por INICIAR.bat.\r\n${secretLine}\r\n`;

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  return filePath;
}

function ensureJwtSecret(filePath = ENV_PATH) {
  const existing = readEnvFile(filePath);
  if (typeof existing.JWT_SECRET === 'string' && existing.JWT_SECRET.trim() !== '') {
    return { status: 'unchanged', path: filePath };
  }

  const secret = generateJwtSecret();
  writeJwtSecret(filePath, secret);
  return { status: 'written', path: filePath, generated: true };
}

function run() {
  const result = ensureJwtSecret(ENV_PATH);

  if (result.status === 'unchanged') {
    console.log('[OK] backend/.env ya tiene JWT_SECRET. No se hicieron cambios.');
  } else {
    console.log('[OK] JWT_SECRET generado localmente en backend/.env.');
  }

  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`[X] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  ENV_PATH,
  ensureJwtSecret,
  generateJwtSecret,
  readEnvFile,
  run,
  writeJwtSecret,
};
