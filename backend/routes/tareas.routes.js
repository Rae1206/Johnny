const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/tareas.controller');
const comentarios = require('../controllers/comentarios.controller');
const etiquetas = require('../controllers/etiquetas.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate, sanitizeXSS } = require('../middlewares/validate');
const { protectedLimiter } = require('../middlewares/rateLimiters');

const router = Router();
router.use(verifyToken);
router.use(protectedLimiter);

const reglasCrear = [
  body('titulo')
    .trim()
    .notEmpty().withMessage('El titulo es obligatorio.')
    .isLength({ min: 1, max: 200 }).withMessage('Titulo demasiado largo.')
    .customSanitizer(sanitizeXSS),
  body('descripcion')
    .optional({ nullable: true }).trim()
    .isLength({ max: 2000 }).withMessage('Descripcion demasiado larga.')
    .customSanitizer(sanitizeXSS),
  body('prioridad').optional().isIn(['baja', 'media', 'alta']).withMessage('Prioridad invalida.'),
  body('proyecto_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('columna_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('asignado_a').optional({ nullable: true }).isInt({ min: 1 }),
  body('fecha_limite').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

const reglasActualizar = [
  param('id').isInt({ min: 1 }).withMessage('ID invalido.'),
  body('titulo').optional().trim().isLength({ min: 1, max: 200 }).customSanitizer(sanitizeXSS),
  body('descripcion').optional({ nullable: true }).trim().isLength({ max: 2000 }).customSanitizer(sanitizeXSS),
  body('prioridad').optional().isIn(['baja', 'media', 'alta']),
  body('completada').optional().isBoolean(),
  body('columna_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('orden').optional().isInt({ min: 0 }),
  body('asignado_a').optional({ nullable: true }).isInt({ min: 1 }),
  body('fecha_limite').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

router.get('/', ctrl.listar);
router.post('/', reglasCrear, validate, ctrl.crear);
router.put('/:id', reglasActualizar, validate, ctrl.actualizar);
router.delete('/:id', [param('id').isInt({ min: 1 })], validate, ctrl.eliminar);

// Comentarios de una tarea
router.get('/:id/comentarios', reglaTareaId(), validate, comentarios.listar);
router.post(
  '/:id/comentarios',
  [param('id').isInt({ min: 1 }), body('texto').trim().notEmpty().isLength({ max: 1000 }).customSanitizer(sanitizeXSS)],
  validate,
  comentarios.crear
);

// Etiquetas de una tarea (asignar / quitar)
router.post(
  '/:id/etiquetas',
  [param('id').isInt({ min: 1 }), body('etiqueta_id').isInt({ min: 1 })],
  validate,
  etiquetas.asignar
);
router.delete(
  '/:id/etiquetas/:etiquetaId',
  [param('id').isInt({ min: 1 }), param('etiquetaId').isInt({ min: 1 })],
  validate,
  etiquetas.quitar
);

function reglaTareaId() {
  return [param('id').isInt({ min: 1 }).withMessage('ID invalido.')];
}

module.exports = router;
