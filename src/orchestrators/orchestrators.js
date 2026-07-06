const Kernel = require('../core/Kernel');
const AgendaResponder = require('../responders/AgendaResponder');

class AgendaOrchestrator {

    async executar(action, dados = {}) {

        const acao = String(action || '').toLowerCase().trim();

        if (!acao) {
            return this.erro(
                'ACAO_OBRIGATORIA',
                'Informe o que deseja fazer: criar, consultar, alterar, cancelar, cadastrar_cliente ou horarios.'
            );
        }

        const acoesValidas = [
            'criar',
            'consultar',
            'cancelar',
            'alterar',
            'reagendar',
            'cadastrar_cliente',
            'horarios'
        ];

        if (!acoesValidas.includes(acao)) {
            return this.erro(
                'ACAO_INVALIDA',
                `A ação "${acao}" não existe.`,
                'action'
            );
        }

        try {

            const resultadoEngine = await Kernel.execute(
                'agenda',
                acao,
                dados
            );

            return AgendaResponder.responder(resultadoEngine);

        } catch (erro) {

            return this.erro(
                'ERRO',
                erro.message
            );

        }

    }

    erro(status, mensagem, campo = null) {
        return {
            ok: false,
            success: false,
            status,
            campo,
            mensagem
        };
    }

}

module.exports = new AgendaOrchestrator();