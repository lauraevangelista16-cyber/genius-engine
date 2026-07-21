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

const sessaoAtual =
    await SessionManager.get(sessionId);

/*
 * Atendimento humano ativo:
 * não consolida dados, não altera etapa e não permite
 * que a mensagem siga para o Interpretador.
 */
if (
    sessaoAtual.estado === 'HUMANO_ATIVO'
) {
    console.log(
        '[SESSION] Atendimento humano ativo. Consolidação automática bloqueada:',
        {
            sessionId,
            action:
                sessaoAtual.action || null,
            etapa:
                sessaoAtual.etapa || null
        }
    );

    return res.json({
        tipo: 'agenda',
        processar: false,
        bloqueado: true,
        motivo: 'HUMANO_ATIVO',
        usarInterpretador: false,
        telefoneWhatsApp: sessionId,
        estado: 'HUMANO_ATIVO',
        action:
            sessaoAtual.action || null,
        etapa:
            sessaoAtual.etapa || null,
        dados:
            sessaoAtual.dados || {},
        validacao: {
            ok: false,
            campo: null,
            mensagem: null
        }
    });
}

const etapasPendentes = [
    'AGUARDANDO_ACAO',
    'AGUARDANDO_CLIENTE',
    'AGUARDANDO_TELEFONE',
    'AGUARDANDO_SERVICO',
    'AGUARDANDO_DATA',
    'AGUARDANDO_HORARIO',
    'AGUARDANDO_NOVO_HORARIO',
    'AGUARDANDO_NOVA_DATA',
    'AGUARDANDO_CONFIRMACAO'
];

if (
    !etapasPendentes.includes(
        sessaoAtual.etapa
    )
) {
    await SessionManager.resetFluxo(
        sessionId
    );
}

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

const resultadoConfirmacao =
    await ConversationManager
        .aplicarConfirmacaoAposValidacao({
            sessionId,
            sessao,
            resultadoValidacao
        });

const sessaoComEtapa =
    resultadoConfirmacao.sessaoFinal;

const resultadoFinal =
    resultadoConfirmacao
        .resultadoValidacao;

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
        resultadoFinal.etapa,

    validacao:
        resultadoFinal.validacao
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

app.post('/sessao/humano', async (req, res) => {
    try {
        const {
            telefoneWhatsApp
        } = req.body || {};

        if (!telefoneWhatsApp) {
            throw new Error(
                'telefoneWhatsApp é obrigatório para ativar o atendimento humano.'
            );
        }

        const sessionId = String(
            telefoneWhatsApp
        ).trim();

        const sessao =
            await SessionManager.setEstado(
                sessionId,
                'HUMANO_ATIVO'
            );

        console.log(
            '[SESSION] Atendimento humano ativado:',
            {
                sessionId,
                action:
                    sessao.action || null,
                etapa:
                    sessao.etapa || null
            }
        );

        return res.json({
            success: true,
            telefoneWhatsApp:
                sessionId,
            estado:
                sessao.estado,
            action:
                sessao.action || null,
            etapa:
                sessao.etapa || null,
            dados:
                sessao.dados || {},
            mensagem:
                'Atendimento humano ativado com sucesso.'
        });

    } catch (erro) {
        console.error(
            '[POST /sessao/humano]',
            erro
        );

        const erroTratado =
            ErrorHandler.tratar(erro);

        return res.status(400).json(
            erroTratado
        );
    }
});

app.post('/sessao/bot', async (req, res) => {
    try {
        const {
            telefoneWhatsApp,
            limparFluxo = true
        } = req.body || {};

        if (!telefoneWhatsApp) {
            throw new Error(
                'telefoneWhatsApp é obrigatório para reativar o bot.'
            );
        }

        const sessionId = String(
            telefoneWhatsApp
        ).trim();

        let sessao;

        if (limparFluxo === true) {
            await SessionManager.resetFluxo(
                sessionId
            );
        }

        sessao =
            await SessionManager.setEstado(
                sessionId,
                'BOT_ATIVO'
            );

        console.log(
            '[SESSION] Bot reativado:',
            {
                sessionId,
                limparFluxo:
                    limparFluxo === true,
                action:
                    sessao.action || null,
                etapa:
                    sessao.etapa || null
            }
        );

        return res.json({
            success: true,
            telefoneWhatsApp:
                sessionId,
            estado:
                sessao.estado,
            action:
                sessao.action || null,
            etapa:
                sessao.etapa || null,
            dados:
                sessao.dados || {},
            fluxoLimpo:
                limparFluxo === true,
            mensagem:
                'Bot reativado com sucesso.'
        });

    } catch (erro) {
        console.error(
            '[POST /sessao/bot]',
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

        const sessaoAtual =
            await SessionManager.get(
                sessionId
            );

        if (
            sessaoAtual.estado === 'HUMANO_ATIVO'
        ) {
            console.log(
                '[AGENDA] Atendimento humano ativo. Execução da Engine bloqueada:',
                {
                    sessionId,
                    action:
                        action || null,
                    etapa:
                        sessaoAtual.etapa || null
                }
            );

            return res.json({
                tipo: 'agenda',
                processar: false,
                bloqueado: true,
                motivo: 'HUMANO_ATIVO',
                usarInterpretador: false,
                telefoneWhatsApp:
                    sessionId,
                estado:
                    'HUMANO_ATIVO',
                action:
                    sessaoAtual.action ||
                    action ||
                    null,
                etapa:
                    sessaoAtual.etapa ||
                    null,
                dados:
                    sessaoAtual.dados ||
                    dados ||
                    {},
                validacao: {
                    ok: false,
                    campo: null,
                    mensagem: null
                }
            });
        }

const actionNormalizada =
    action === 'reagendar'
        ? 'alterar'
        : action;

const operacoesQueExigemConfirmacao = [
    'criar',
    'alterar',
    'cancelar'
];

const exigeConfirmacao =
    operacoesQueExigemConfirmacao.includes(
        actionNormalizada
    );

/*
 * Operações que modificam a agenda somente podem ser
 * executadas depois da confirmação explícita do usuário.
 */
if (
    exigeConfirmacao &&
    sessaoAtual.etapa !== 'PRONTO_PARA_EXECUTAR'
) {
    console.log(
        '[AGENDA] Operação bloqueada por falta de confirmação:',
        {
            sessionId,
            action: actionNormalizada,
            etapa: sessaoAtual.etapa || null
        }
    );

    return res.status(409).json({
        ok: false,
        success: false,
        mensagem:
            'A operação ainda não foi confirmada pelo usuário.',
        dados: {
            status: 'CONFIRMACAO_PENDENTE',
            action: actionNormalizada,
            etapa: sessaoAtual.etapa || null
        }
    });
}

/*
 * Em operações confirmadas, a sessão é a fonte confiável.
 * Isso impede que dados diferentes sejam enviados ao /agenda
 * depois da confirmação.
 */
const actionExecutada =
    exigeConfirmacao
        ? sessaoAtual.action || action
        : action;

const dadosExecutados =
    exigeConfirmacao
        ? {
            ...dados,
            ...(sessaoAtual.dados || {})
        }
        : dados;

const resposta = await AgendaOrchestrator.executar(
    actionExecutada,
    dadosExecutados
);

const status =
    resposta?.dados?.status ||
    resposta?.status ||
    null;

/*
 * Operação concluída:
 * limpa os dados do fluxo, mas preserva a sessão e o estado do bot.
 */
const statusConcluidos = [
    'AGENDAMENTO_CRIADO',
    'AGENDAMENTO_ALTERADO',
    'AGENDAMENTO_CANCELADO'
];

if (statusConcluidos.includes(status)) {
    await SessionManager.resetFluxo(
        sessionId
    );

    console.log(
        `[SESSION] Fluxo encerrado após ${status}.`
    );
}

/*
 * Erros definitivos relacionados ao cliente:
 * limpa o fluxo para evitar que a conversa fique presa
 * com dados parciais ou inconsistentes.
 */
const errosClienteQueEncerramFluxo = [
    'ERRO_CLIENTE',
    'ERRO_CLIENTE_NAO_SELECIONADO',
    'ERRO_CLIENTE_NAO_MANTIDO_NO_ATENDIMENTO'
];

if (
    errosClienteQueEncerramFluxo.includes(
        status
    )
) {
    await SessionManager.resetFluxo(
        sessionId
    );

    console.log(
        `[SESSION] Fluxo limpo após erro definitivo de cliente: ${status}.`
    );
}

/*
 * Erro recuperável:
 * mantém os dados e volta a aguardar somente outro horário.
 */
if (status === 'HORARIO_OCUPADO') {
    await SessionManager.update(
        sessionId,
        {
            etapa: 'AGUARDANDO_HORARIO'
        }
    );

    console.log(
        '[SESSION] Horário ocupado. Sessão voltou para AGUARDANDO_HORARIO.'
    );
}

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