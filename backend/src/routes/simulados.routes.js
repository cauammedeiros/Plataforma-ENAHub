const { Router } = require('express');
const controller = require('../controllers/simulados.controller');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar);
router.get('/', controller.historico);
router.post('/', controller.criar);
router.get('/em-andamento', controller.emAndamento);
router.get('/oficiais', controller.modelos);
router.get('/:id', controller.obter);
router.put('/:id/respostas/:questaoId', controller.salvarResposta);
router.post('/:id/finalizar', controller.finalizar);
router.get('/:id/resultado', controller.resultado);

module.exports = router;
