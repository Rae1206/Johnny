const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { validate, sanitizeXSS } = require('../middlewares/validate');
const { passwordPolicy } = require('../utils/passwordPolicy');

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio.')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener 2-100 caracteres.')
      .customSanitizer(sanitizeXSS),
    body('email')
      .trim()
      .isEmail().withMessage('Email invalido.')
      .normalizeEmail(),
    passwordPolicy('password'),
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Email invalido.').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
  ],
  validate,
  login
);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

module.exports = router;
