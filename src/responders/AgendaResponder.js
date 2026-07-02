class AgendaResponder {

    responder(resultado = {}) {

        switch (resultado.status) {

            case 'HORARIOS_ENCONTRADOS':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Horários encontrados.',
                    dados: resultado
                };

            case 'SEM_HORARIOS_LIVRES':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Não encontrei horários livres.',
                    dados: resultado
                };

            case 'FORA_DO_HORARIO':
                return {
                    ok: false,
                    mensagem: resultado.mensagem,
                    dados: resultado
                };

            case 'HORARIO_OCUPADO':
                return {
                    ok: false,
                    mensagem: resultado.mensagem || 'Esse horário já está ocupado.',
                    dados: resultado
                };

            case 'AGENDAMENTO_CRIADO':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Perfeito! Seu agendamento foi realizado com sucesso.',
                    dados: resultado
                };

            case 'AGENDAMENTO_NAO_CONFIRMADO':
                return {
                    ok: false,
                    mensagem: resultado.mensagem || 'O agendamento não foi confirmado na agenda.',
                    dados: resultado
                };

            case 'AGENDAMENTO_ALTERADO':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Seu agendamento foi alterado com sucesso.',
                    dados: resultado
                };

            case 'AGENDAMENTO_CANCELADO':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Seu agendamento foi cancelado.',
                    dados: resultado
                };

            case 'AGENDAMENTO_ENCONTRADO':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Encontrei seu agendamento.',
                    dados: resultado
                };

            case 'AGENDAMENTO_NAO_ENCONTRADO':
                return {
                    ok: false,
                    mensagem: resultado.mensagem || 'Não encontrei nenhum agendamento.',
                    dados: resultado
                };

            case 'MULTIPLOS_AGENDAMENTOS':
                return {
                    ok: true,
                    mensagem: resultado.mensagem || 'Encontrei mais de um agendamento.',
                    dados: resultado
                };

            case 'DADOS_INCOMPLETOS':
                return {
                    ok: false,
                    mensagem: resultado.mensagem || 'Dados incompletos.',
                    dados: resultado
                };

            default:
                return {
                    ok: false,
                    mensagem: resultado.mensagem || `Status não tratado: ${resultado.status || 'SEM_STATUS'}`,
                    dados: resultado
                };
        }
    }

}

module.exports = new AgendaResponder();