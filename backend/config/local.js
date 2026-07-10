// LOCAL DEVELOPMENT ONLY.
//
// Este archivo se sube a proposito para que un checkout nuevo tenga valores
// locales editables en un solo lugar. Produccion debe sobreescribir estos datos
// con variables de entorno o backend/.env.
module.exports = {
  PORT: 4000,
  CLIENT_ORIGIN: 'http://localhost:5173',

  DB_HOST: '127.0.0.1',
  DB_PORT: 3306,
  DB_USER: 'root',
  DB_PASSWORD: 'admin',
  DB_NAME: 'taskless',

  ACCESS_TOKEN_EXPIRES_IN: '15m',
};
