const { Router } = require('express');
const controller = require('../controllers/desempenho.controller');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar);
router.get('/resumo', controller.resumo);
router.get('/ranking', controller.ranking);

module.exports = router;
