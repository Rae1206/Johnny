const { Router } = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/auth.controller');
const { validate, sanitizeXSS } = require('../middlewares/validate');

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
    body('password')
      .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
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

module.exports = router;
