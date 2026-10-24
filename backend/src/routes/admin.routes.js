const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar, autorizar('admin'));
router.get('/usuarios', controller.usuarios);
router.patch('/usuarios/:id', controller.atualizarUsuario);
router.get('/denuncias', controller.denuncias);
router.patch('/denuncias/:id', controller.analisarDenuncia);
router.get('/relatorios', controller.relatorios);
router.get('/simulados-oficiais', controller.modelos);
router.post('/simulados-oficiais', controller.criarModelo);
router.patch('/simulados-oficiais/:id', controller.alterarModelo);

module.exports = router;
