require('dotenv').config();

const express = require('express');

const Kernel = require('./src/core/Kernel');
const AgendaEngine = require('./src/engines/agenda/agendaEngine');
const AgendaOrchestrator = require('./src/orchestrators/orchestrators');
const ErrorHandler = require('./src/core/ErrorHandler');
const RedisAdapter = require('./src/adapters/redis/RedisAdapter');
const SessionManager = require('./src/managers/SessionManager');

Kernel.registrar('agenda', AgendaEngine);

const app = express();

app.use(express.json());

app.post('/agenda', async (req, res) => {
    try {
        const { action, dados = {} } = req.body || {};
        const { telefone } = dados;

        if (!telefone) {
            throw new Error('Telefone é obrigatório para carregar a sessão.');
        }

        // Carrega (ou cria) a sessão do telefone
        const sessao = await SessionManager.get(telefone);

        console.log('\n==============================');
        console.log('[SESSION] Sessão carregada');
        console.log(JSON.stringify(sessao, null, 2));
        console.log('==============================\n');

        const resposta = await AgendaOrchestrator.executar(
            action,
            dados
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
        versao: 'v1.1-redis',
        mensagem: 'Genius Engine rodando.'
    });
});

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        const ping = await RedisAdapter.ping();

        console.log(`[Redis] Ping: ${ping}`);

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Genius Engine rodando na porta ${PORT}`);
        });

    } catch (erro) {

        console.error(
            '[Inicialização] Não foi possível conectar ao Redis:',
            erro.message
        );

        process.exit(1);
    }
}

async function encerrarAplicacao(sinal) {

    console.log(`[Aplicação] Encerrando por ${sinal}...`);

    try {
        await RedisAdapter.disconnect();
    } catch (erro) {
        console.error(
            '[Redis] Erro ao encerrar conexão:',
            erro.message
        );
    }

    process.exit(0);
}

process.on('SIGTERM', () => encerrarAplicacao('SIGTERM'));
process.on('SIGINT', () => encerrarAplicacao('SIGINT'));

iniciarServidor();