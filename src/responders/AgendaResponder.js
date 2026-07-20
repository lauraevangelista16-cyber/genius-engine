class AgendaResponder {
    /**
     * Monta a resposta final da Agenda Engine.
     *
     * O campo "memory" só é incluído quando o resultado
     * trouxer instruções explícitas de memória.
     *
     * Isso mantém compatibilidade com todas as respostas
     * já homologadas na v1.0.
     */
    montarResposta(resultado, ok, mensagemPadrao) {
        const resposta = {
            ok,
            mensagem:
                resultado.mensagem ||
                mensagemPadrao,
            dados: resultado
        };

        if (
            resultado.memory &&
            typeof resultado.memory === 'object' &&
            !Array.isArray(resultado.memory)
        ) {
            resposta.memory = resultado.memory;
        }

        return resposta;
    }

    responder(resultado = {}) {
        switch (resultado.status) {
            case 'HORARIOS_ENCONTRADOS':
                return this.montarResposta(
                    resultado,
                    true,
                    'Horários encontrados.'
                );

            case 'SEM_HORARIOS_LIVRES':
                return this.montarResposta(
                    resultado,
                    true,
                    'Não encontrei horários livres.'
                );

            case 'FORA_DO_EXPEDIENTE':
            case 'FORA_DO_HORARIO':
                return this.montarResposta(
                    resultado,
                    false,
                    'O horário informado está fora do expediente.'
                );

            case 'HORARIO_OCUPADO':
                return this.montarResposta(
                    resultado,
                    false,
                    'Esse horário já está ocupado.'
                );

            case 'CLIENTE_CADASTRADO':
                return this.montarResposta(
                    resultado,
                    true,
                    'Cliente cadastrado com sucesso.'
                );

            case 'CLIENTE_JA_CADASTRADO':
                return this.montarResposta(
                    resultado,
                    true,
                    'Cliente já estava cadastrado.'
                );

            case 'CLIENTE_NAO_CADASTRADO':
                return this.montarResposta(
                    resultado,
                    false,
                    'Cliente ainda não está cadastrado.'
                );

            case 'ERRO_CLIENTE':
                return this.montarResposta(
                    resultado,
                    false,
                    'Erro ao processar o cliente.'
                );

            case 'AGENDAMENTO_CRIADO':
                return this.montarResposta(
                    resultado,
                    true,
                    'Perfeito! Seu agendamento foi realizado com sucesso.'
                );

            case 'AGENDAMENTO_NAO_CONFIRMADO':
                return this.montarResposta(
                    resultado,
                    false,
                    'O agendamento não foi confirmado na agenda.'
                );

            case 'AGENDAMENTO_ALTERADO':
                return this.montarResposta(
                    resultado,
                    true,
                    'Seu agendamento foi alterado com sucesso.'
                );

            case 'AGENDAMENTO_CANCELADO':
                return this.montarResposta(
                    resultado,
                    true,
                    'Seu agendamento foi cancelado.'
                );

            case 'AGENDAMENTO_ENCONTRADO':
                return this.montarResposta(
                    resultado,
                    true,
                    'Encontrei seu agendamento.'
                );

            case 'AGENDAMENTO_NAO_ENCONTRADO':
                return this.montarResposta(
                    resultado,
                    false,
                    'Não encontrei nenhum agendamento.'
                );

            case 'MULTIPLOS_AGENDAMENTOS':
                return this.montarResposta(
                    resultado,
                    true,
                    'Encontrei mais de um agendamento.'
                );

            case 'DADOS_INCOMPLETOS':
                return this.montarResposta(
                    resultado,
                    false,
                    'Dados incompletos.'
                );

            default:
                return this.montarResposta(
                    resultado,
                    false,
                    `Status não tratado: ${
                        resultado.status || 'SEM_STATUS'
                    }`
                );
        }
    }
}

module.exports = new AgendaResponder();