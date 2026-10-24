const express = require('express');
const cors = require('cors');
const db = require('./database');
const config = require('./config');
const rotas = require('./routes');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '200kb' }));

app.get('/', (req, res) => {
    res.json({
        mensagem: 'API do ENAHub funcionando!'
    });
});

app.get('/teste-db', async (req, res) => {
    try {
        const [resultado] = await db.query('SELECT 1 AS teste');

        res.json({
            mensagem: 'Conexão com MySQL funcionando!',
            resultado: resultado
        });
    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao conectar com MySQL.'
        });
    }
});

app.use('/api', rotas);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
