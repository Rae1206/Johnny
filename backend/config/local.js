// Configuracion de desarrollo (reemplaza al .env en este entorno).
// Este archivo SÍ se sube al repo a proposito, para que clonar-y-ejecutar
// sea inmediato. Es un proyecto no sensible con credenciales de dev.
//
// >> SI CLONASTE ESTE REPO: ajusta DB_USER / DB_PASSWORD / DB_PORT abajo
//    para que coincidan con TU servidor MySQL local. Es lo unico que cambia
//    de una maquina a otra. Despues corre:  npm install && npm run setup && npm start
//
// NUNCA usar estos valores en produccion.
module.exports = {
  PORT: 4000,
  CLIENT_ORIGIN: 'http://localhost:5173',

  DB_HOST: '127.0.0.1',
  DB_PORT: 3306,
  DB_USER: 'root',
  DB_PASSWORD: 'admin',
  DB_NAME: 'taskless',

  JWT_SECRET: 'taskless_dev_secret_change_in_prod_0e3f9a1b7c',
  JWT_EXPIRES_IN: '7d',
};
