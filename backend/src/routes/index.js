const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/', require('./catalogo.routes'));
router.use('/usuarios', require('./usuarios.routes'));
router.use('/questoes', require('./questoes.routes'));
router.use('/simulados', require('./simulados.routes'));
router.use('/desempenho', require('./desempenho.routes'));
router.use('/forum', require('./forum.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
