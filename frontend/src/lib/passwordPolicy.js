export const PASSWORD_REQUIREMENTS = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';

export function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function passwordErrorMessage(label = 'La contraseña') {
  return `${label} debe tener al menos 8 caracteres, una mayúscula y un número.`;
}
