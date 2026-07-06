console.log('🔥 APP INICIOU - LOG TESTE');

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
        console.log('\n==============================');
        console.log('📥 NOVA REQUISIÇÃO /agenda');
        console.log('Body recebido:');
        console.log(JSON.stringify(req.body, null, 2));

        const { action, dados } = req.body || {};

        console.log('➡️ Action recebida:', action);
        console.log('➡️ Dados recebidos:');
        console.log(JSON.stringify(dados || {}, null, 2));

        const resposta = await AgendaOrchestrator.executar(action, dados || {});

        console.log('⬅️ Resposta da Engine:');
        console.log(JSON.stringify(resposta, null, 2));
        console.log('==============================\n');

        if (resposta?.ok === false || resposta?.success === false) {
            return res.status(400).json(resposta);
        }

        return res.json(resposta);

    } catch (erro) {
        console.error('\n💥 ERRO NA ENGINE /agenda');
        console.error(erro);
        console.error('==============================\n');

        const erroTratado = ErrorHandler.tratar(erro);

        console.error('⬅️ Erro tratado:');
        console.error(JSON.stringify(erroTratado, null, 2));

        return res.status(400).json(erroTratado);
    }
});

app.get('/health', (req, res) => {
    console.log('✅ Health check recebido');

    return res.json({
        status: 'ONLINE',
        mensagem: 'Genius Engine rodando.'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Genius Engine rodando na porta ${PORT}`);
});