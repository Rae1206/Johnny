const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/proyectos.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate, sanitizeXSS } = require('../middlewares/validate');

const router = Router();
router.use(verifyToken);

const reglasProyecto = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener 2-150 caracteres.')
    .customSanitizer(sanitizeXSS),
  body('descripcion')
    .optional({ nullable: true }).trim()
    .isLength({ max: 2000 }).withMessage('Descripcion demasiado larga.')
    .customSanitizer(sanitizeXSS),
  body('equipo_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('equipo_id invalido.'),
];

const reglaId = [param('id').isInt({ min: 1 }).withMessage('ID invalido.')];

router.get('/', ctrl.listar);
router.post('/', reglasProyecto, validate, ctrl.crear);
router.put('/:id', [...reglaId, ...reglasProyecto], validate, ctrl.actualizar);
router.delete('/:id', reglaId, validate, ctrl.eliminar);
router.get('/:id/tareas', reglaId, validate, ctrl.tablero);
router.get('/:id/actividad', reglaId, validate, ctrl.actividad);

module.exports = router;
