const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/perfil.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate, sanitizeXSS } = require('../middlewares/validate');

const router = Router();
router.use(verifyToken);

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
    body('nueva').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres.'),
  ],
  validate,
  ctrl.cambiarPassword
);

module.exports = router;
