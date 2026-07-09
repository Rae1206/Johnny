const { Router } = require('express');
const { param } = require('express-validator');
const ctrl = require('../controllers/notificaciones.controller');
const verifyToken = require('../middlewares/verifyToken');
const { validate } = require('../middlewares/validate');

const router = Router();
router.use(verifyToken);

router.get('/', ctrl.listar);
router.put('/leer-todas', ctrl.marcarTodas);
router.put('/:id/leida', [param('id').isInt({ min: 1 })], validate, ctrl.marcarLeida);

module.exports = router;
