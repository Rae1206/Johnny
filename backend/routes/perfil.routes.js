const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/perfil.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate, sanitizeXSS } = require('../middlewares/validate');
const { passwordPolicy } = require('../utils/passwordPolicy');
const { protectedLimiter } = require('../middlewares/rateLimiters');

const router = Router();
router.use(verifyToken);
router.use(protectedLimiter);

router.get('/', ctrl.ver);
router.put(
  '/',
  [body('nombre').trim().notEmpty().isLength({ min: 2, max: 100 }).customSanitizer(sanitizeXSS)],
  validate,
  ctrl.actualizar
);
router.put(
  '/password',
  [
    body('actual').notEmpty().withMessage('Ingresá tu contraseña actual.'),
    passwordPolicy('nueva', 'La nueva contraseña'),
  ],
  validate,
  ctrl.cambiarPassword
);

module.exports = router;
