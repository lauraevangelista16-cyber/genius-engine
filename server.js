require('dotenv').config();

const express = require('express');

const Kernel = require('./src/core/Kernel');
const AgendaEngine = require('./src/engines/agenda/agendaEngine');
const AgendaOrchestrator = require('./src/orchestrators/orchestrators');
const ErrorHandler = require('./src/core/ErrorHandler');
const RedisAdapter = require('./src/adapters/redis/RedisAdapter');
const SessionManager = require('./src/core/SessionManager');

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

/**
 * ============================================================
 * TESTE TEMPORÁRIO DO SESSION MANAGER (REDIS)
 * Remover após a homologação.
 * ============================================================
 */
app.post('/teste-sessao', async (req, res) => {
    try {
        const telefone = String(req.body?.telefone || '').replace(/\D/g, '');

        if (!telefone) {
            return res.status(400).json({
                ok: false,
                status: 'TELEFONE_OBRIGATORIO',
                mensagem: 'Informe um telefone.'
            });
        }

        console.log('\n==============================');
        console.log('[TESTE REDIS] Iniciando...');
        console.log('Telefone:', telefone);

        // Remove qualquer sessão anterior
        await SessionManager.clear(telefone);

        // Cria automaticamente uma nova sessão
        const sessaoCriada = await SessionManager.get(telefone);

        console.log('[TESTE] Sessão criada:');
        console.log(JSON.stringify(sessaoCriada, null, 2));

        // Atualiza
        const sessaoAtualizada = await SessionManager.update(telefone, {
            action: 'criar',
            etapa: 'TESTE_REDIS',
            dados: {
                cliente: 'Cliente Teste',
                telefone,
                servico: 'unha',
                data: '2026-07-20',
                horario: '14:00'
            }
        });

        console.log('[TESTE] Sessão atualizada:');
        console.log(JSON.stringify(sessaoAtualizada, null, 2));

        // Lê novamente
        const sessaoLida = await SessionManager.get(telefone);

        console.log('[TESTE] Sessão relida:');
        console.log(JSON.stringify(sessaoLida, null, 2));

        const chave = SessionManager.gerarChave(telefone);

        const ttl = await RedisAdapter.ttl(chave);
        const existe = await RedisAdapter.exists(chave);

        console.log('[TESTE] TTL:', ttl);
        console.log('[TESTE] Existe:', existe);

        // Limpa
        await SessionManager.clear(telefone);

        const existeDepois = await RedisAdapter.exists(chave);

        console.log('[TESTE] Existe após limpar:', existeDepois);

        console.log('[TESTE REDIS] Finalizado.');
        console.log('==============================\n');

        return res.json({
            ok: true,
            status: 'TESTE_OK',
            sessaoCriada,
            sessaoAtualizada,
            sessaoLida,
            ttl,
            existe,
            existeDepois
        });

    } catch (erro) {
        console.error('[TESTE REDIS]', erro);

        return res.status(500).json({
            ok: false,
            status: 'ERRO_TESTE',
            mensagem: erro.message
        });
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