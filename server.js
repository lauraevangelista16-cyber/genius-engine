require('dotenv').config();

const express = require('express');

const Kernel = require('./src/core/Kernel');
const AgendaEngine = require('./src/engines/agenda/agendaEngine');
const AgendaOrchestrator = require('./src/orchestrators/orchestrators');
const ErrorHandler = require('./src/core/ErrorHandler');

Kernel.registrar('agenda', AgendaEngine);

const app = express();

app.use(express.json());

app.post('/agenda', async (req, res) => {
    try {
        const { action, dados } = req.body || {};

        const resposta = await AgendaOrchestrator.executar(
            action,
            dados || {}
        );

        return res.json(resposta);

    } catch (erro) {
        console.error(erro);

        const erroTratado = ErrorHandler.tratar(erro);

        return res.status(400).json(erroTratado);
    }
});

app.get('/health', (req, res) => {
    return res.json({
        status: 'ONLINE',
        versao: 'logs-teste-001',
        mensagem: 'Genius Engine rodando.'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Genius Engine rodando na porta ${PORT}`);
});