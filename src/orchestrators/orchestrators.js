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

        const validacao = this.validar(acao, dados);

        if (!validacao.valido) {
            return this.erro('DADOS_INCOMPLETOS', validacao.mensagem, validacao.campo);
        }

        const resultadoEngine = await Kernel.execute('agenda', acao, dados);

        return AgendaResponder.responder(resultadoEngine);
    }

    validar(action, dados) {
        const obrigatorios = {
            horarios: ['servico', 'data'],
            criar: ['servico', 'cliente', 'telefone', 'data', 'horario'],
            cadastrar_cliente: ['cliente', 'telefone', 'data', 'horario'],
            consultar: ['cliente', 'telefone', 'data'],
            cancelar: ['cliente', 'telefone', 'data'],
            alterar: ['cliente', 'telefone', 'data']
        };

        if (!obrigatorios[action]) {
            return {
                valido: false,
                campo: 'action',
                mensagem: `A ação "${action}" não existe.`
            };
        }

        for (const campo of obrigatorios[action]) {
            if (!dados[campo]) {
                return {
                    valido: false,
                    campo,
                    mensagem: `O campo "${campo}" é obrigatório.`
                };
            }
        }

        if (action === 'alterar') {
            const temAlteracao =
                dados.horario ||
                dados.servico ||
                dados.clienteNovo ||
                dados.telefoneNovo;

            if (!temAlteracao) {
                return {
                    valido: false,
                    campo: 'alteracao',
                    mensagem: 'Informe pelo menos um dado para alterar: horario, servico, clienteNovo ou telefoneNovo.'
                };
            }
        }

        return {
            valido: true
        };
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