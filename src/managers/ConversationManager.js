const SessionManager = require('./SessionManager');

class ConversationManager {
    constructor() {
        this.etapasPendentes = [
            'AGUARDANDO_ACAO',
            'AGUARDANDO_CLIENTE',
            'AGUARDANDO_TELEFONE',
            'AGUARDANDO_SERVICO',
            'AGUARDANDO_DATA',
            'AGUARDANDO_HORARIO',
            'AGUARDANDO_NOVO_HORARIO',
            'AGUARDANDO_NOVA_DATA'
        ];
    }

    possuiEtapaPendente(etapa) {
        return this.etapasPendentes.includes(
            etapa
        );
    }

    async analisarEntrada({
        telefoneWhatsApp,
        mensagem = ''
    } = {}) {
        if (!telefoneWhatsApp) {
            throw new Error(
                'telefoneWhatsApp é obrigatório para analisar a conversa.'
            );
        }

        const sessionId = String(
            telefoneWhatsApp
        ).trim();

        const mensagemNormalizada = String(
            mensagem || ''
        ).trim();

        const sessao = await SessionManager.get(
            sessionId
        );

        const continuarSessao =
            this.possuiEtapaPendente(
                sessao.etapa
            );

        return {
            tipo: 'agenda',

            continuarSessao,

            usarInterpretador:
                !continuarSessao,

            telefoneWhatsApp:
                sessionId,

            mensagem:
                mensagemNormalizada,

            action:
                sessao.action || null,

            etapa:
                sessao.etapa || null,

            dados:
                sessao.dados || {}
        };
    }
}

module.exports = new ConversationManager();