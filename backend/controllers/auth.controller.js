// Controlador de autenticacion: registro y login.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const config = require('../config/env');

// Genera un JWT firmado con los datos minimos del usuario.
function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { nombre, email, password } = req.body;

    // Verificar si el email ya existe (consulta parametrizada -> anti SQL Injection).
    const [existentes] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    if (existentes.length > 0) {
      return res.status(400).json({ error: 'El email ya esta registrado.' });
    }

    // Hash de la contraseña con bcrypt (10 salt rounds). Nunca se guarda texto plano.
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
      [nombre, email, password_hash]
    );

    const usuario = { id: result.insertId, nombre, email, rol: 'miembro' };
    const token = firmarToken(usuario);

    return res.status(201).json({ usuario, token });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [filas] = await pool.query(
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    // Mismo mensaje para "email inexistente" y "password incorrecta":
    // no revelamos cual de los dos fallo (evita enumeracion de usuarios).
    if (filas.length === 0) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const usuario = filas[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const publico = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
    const token = firmarToken(publico);

    return res.status(200).json({ usuario: publico, token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
