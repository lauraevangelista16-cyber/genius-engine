const express = require('express');

const Kernel = require('./src/core/Kernel');
const AgendaEngine = require('./src/engines/agenda/agendaEngine');
const ErrorHandler = require('./src/core/ErrorHandler');

Kernel.registrar('agenda', AgendaEngine);

const app = express();

app.use(express.json());

app.post('/agenda', async (req, res) => {
    try {
        const { action, dados } = req.body;

        const resposta = await Kernel.execute('agenda', action, dados || {});

        return res.json(resposta);

    } catch (erro) {
        return res.status(400).json(
            ErrorHandler.tratar(erro)
        );
    }
});

app.get('/health', (req, res) => {
    return res.json({
        status: 'ONLINE',
        mensagem: 'Genius Engine rodando.'
    });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Genius Engine rodando na porta ${PORT}`);
});