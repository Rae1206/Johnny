const { body } = require('express-validator');

const PASSWORD_POLICY_MESSAGE = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';

function passwordPolicy(field, label = 'La contraseña') {
  return body(field).custom((value) => {
    if (
      typeof value !== 'string' ||
      value.length < 8 ||
      !/[A-Z]/.test(value) ||
      !/[0-9]/.test(value)
    ) {
      throw new Error(`${label} debe tener al menos 8 caracteres, una mayúscula y un número.`);
    }
    return true;
  });
}

module.exports = { PASSWORD_POLICY_MESSAGE, passwordPolicy };
