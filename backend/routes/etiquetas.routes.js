const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/etiquetas.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate, sanitizeXSS } = require('../middlewares/validate');
const { protectedLimiter } = require('../middlewares/rateLimiters');

const router = Router();
router.use(verifyToken);
router.use(protectedLimiter);

router.get('/', ctrl.listar);
router.post(
  '/',
  [
    body('nombre').trim().notEmpty().isLength({ min: 1, max: 60 }).customSanitizer(sanitizeXSS),
    body('color').optional().trim().isLength({ max: 20 }),
  ],
  validate,
  ctrl.crear
);
router.delete('/:id', [param('id').isInt({ min: 1 })], validate, ctrl.eliminar);

module.exports = router;
