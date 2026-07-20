require('dotenv').config();

const express = require('express');

const Kernel = require('./src/core/Kernel');
const AgendaEngine = require('./src/engines/agenda/agendaEngine');
const AgendaOrchestrator = require('./src/orchestrators/orchestrators');
const ErrorHandler = require('./src/core/ErrorHandler');
const RedisAdapter = require('./src/adapters/redis/RedisAdapter');
const SessionManager = require('./src/managers/SessionManager');
const SessionValidator = require('./src/validators/SessionValidator');
const ConversationManager = require('./src/managers/ConversationManager');

Kernel.registrar('agenda', AgendaEngine);

const app = express();

app.use(express.json());

app.post('/sessao', async (req, res) => {
    try {
        const {
            action,
            dados = {},
            telefoneWhatsApp
        } = req.body || {};

        if (!telefoneWhatsApp) {
            throw new Error(
                'telefoneWhatsApp é obrigatório para carregar a sessão.'
            );
        }

        const sessionId = String(
            telefoneWhatsApp
        ).trim();

        const atualizacao = {
            dados
        };

        /*
         * Só atualiza a ação quando ela for válida.
         * Assim, "indefinido" não apaga a ação anterior.
         */
        if (
            action &&
            String(action).trim() &&
            action !== 'indefinido'
        ) {
            atualizacao.action = action;
        }

        const sessao = await SessionManager.update(
            sessionId,
            atualizacao
        );

const resultadoValidacao = 
     SessionValidator.validar(sessao);
const sessaoComEtapa = await SessionManager.update(
    sessionId,
    {
        etapa: resultadoValidacao.etapa
    }
);
        console.log('\n========================================');
        console.log('[SESSION] Sessão consolidada');
        console.log(JSON.stringify(sessaoComEtapa, null, 2));
        console.log('========================================\n');

        return res.json({
    tipo: 'agenda',

    action:
        sessaoComEtapa.action ||
        action ||
        'indefinido',

    dados:
        sessaoComEtapa.dados ||
        {},

    telefoneWhatsApp:
        sessionId,

    etapa:
        sessaoComEtapa.etapa ||
        resultadoValidacao.etapa,

    validacao:
        resultadoValidacao.validacao
});

    } catch (erro) {
        console.error('[POST /sessao]', erro);

        const erroTratado = ErrorHandler.tratar(
            erro
        );

        return res.status(400).json(
            erroTratado
        );
    }
});

app.post('/continuar', async (req, res) => {
    try {

        const resposta =
            await ConversationManager.analisarEntrada(
                req.body
            );

        return res.json(resposta);

    } catch (erro) {

        console.error(
            '[POST /continuar]',
            erro
        );

        const erroTratado =
            ErrorHandler.tratar(erro);

        return res.status(400).json(
            erroTratado
        );
    }
});

app.post('/agenda', async (req, res) => {
    try {
        const {
            action,
            dados = {},
            telefoneWhatsApp
        } = req.body || {};

        if (!telefoneWhatsApp) {
            throw new Error(
                'telefoneWhatsApp é obrigatório para carregar a sessão.'
            );
        }

        // A sessão pertence ao telefone que está conversando no WhatsApp.
        // dados.telefone pode representar outra pessoa em agendamentos para terceiros.
        const sessionId = telefoneWhatsApp;

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