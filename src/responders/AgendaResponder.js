class AgendaResponder {

    responder(resultado) {

        switch (resultado.status) {

            case 'HORARIOS_ENCONTRADOS':
                return {
                    ok: true,
                    mensagem: resultado.mensagem,
                    dados: resultado
                };

            case 'AGENDAMENTO_CRIADO':
                return {
                    ok: true,
                    mensagem: 'Perfeito! Seu agendamento foi realizado com sucesso.',
                    dados: resultado
                };

            case 'AGENDAMENTO_ALTERADO':
                return {
                    ok: true,
                    mensagem: 'Seu agendamento foi alterado com sucesso.',
                    dados: resultado
                };

            case 'AGENDAMENTO_CANCELADO':
                return {
                    ok: true,
                    mensagem: 'Seu agendamento foi cancelado.',
                    dados: resultado
                };

            case 'AGENDAMENTO_ENCONTRADO':
                return {
                    ok: true,
                    mensagem: 'Encontrei seu agendamento.',
                    dados: resultado
                };

            case 'AGENDAMENTO_NAO_ENCONTRADO':
                return {
                    ok: false,
                    mensagem: 'Não encontrei nenhum agendamento.',
                    dados: resultado
                };

            case 'MULTIPLOS_AGENDAMENTOS':
                return {
                    ok: true,
                    mensagem: 'Encontrei mais de um agendamento.',
                    dados: resultado
                };

            default:
                return {
                    ok: false,
                    mensagem: resultado.mensagem || 'Erro interno.',
                    dados: resultado
                };

        }

    }

}

module.exports = new AgendaResponder();