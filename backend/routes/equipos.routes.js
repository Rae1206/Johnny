const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/equipos.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate, sanitizeXSS } = require('../middlewares/validate');
const { protectedLimiter } = require('../middlewares/rateLimiters');

const router = Router();
router.use(verifyToken);
router.use(protectedLimiter);

const reglasEquipo = [
  body('nombre')
    .trim().notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ min: 2, max: 120 }).customSanitizer(sanitizeXSS),
  body('descripcion')
    .optional({ nullable: true }).trim().isLength({ max: 500 }).customSanitizer(sanitizeXSS),
];
const reglaId = [param('id').isInt({ min: 1 })];

router.get('/', ctrl.listar);
router.post('/', reglasEquipo, validate, ctrl.crear);
router.put('/:id', [...reglaId, ...reglasEquipo], validate, ctrl.actualizar);
router.delete('/:id', reglaId, validate, ctrl.eliminar);

// Miembros
router.get('/:id/miembros', reglaId, validate, ctrl.miembros);
router.post(
  '/:id/miembros',
  [param('id').isInt({ min: 1 }), body('email').trim().isEmail().normalizeEmail(), body('rol').optional().isIn(['admin', 'miembro'])],
  validate,
  ctrl.agregarMiembro
);
router.put(
  '/:id/miembros/:usuarioId',
  [param('id').isInt({ min: 1 }), param('usuarioId').isInt({ min: 1 }), body('rol').isIn(['admin', 'miembro'])],
  validate,
  ctrl.cambiarRol
);
router.delete(
  '/:id/miembros/:usuarioId',
  [param('id').isInt({ min: 1 }), param('usuarioId').isInt({ min: 1 })],
  validate,
  ctrl.quitarMiembro
);

module.exports = router;
