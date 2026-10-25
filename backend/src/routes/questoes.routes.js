const { Router } = require('express');
const controller = require('../controllers/questoes.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = Router();
const gestores = autorizar('admin', 'professor');

router.use(autenticar);
router.get('/', controller.listar);
router.get('/favoritas', controller.favoritas);
router.get('/:id', controller.detalhar);
router.post('/:id/responder', controller.responder);
router.post('/:id/favorito', controller.favoritar);
router.delete('/:id/favorito', controller.desfavoritar);

router.post('/', gestores, controller.criar);
router.put('/:id', gestores, controller.atualizar);
router.delete('/:id', gestores, controller.excluir);
router.patch('/:id/status', autorizar('admin'), controller.alterarStatus);
router.get('/:id/comentarios', gestores, controller.comentarios);
router.post('/:id/comentarios', gestores, controller.comentar);
router.delete('/:id/comentarios/:comentarioId', gestores, controller.excluirComentario);

module.exports = router;
