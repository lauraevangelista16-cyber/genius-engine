const {
    horarioParaMinutos,
    obterDuracaoDoServico,
    existeConflito,
    estaDentroDoHorarioFuncionamento,
    buscarProximoHorarioLivre,
    gerarHorariosLivres
} = require('./agendaRules');

function validarCriacaoAgendamento(dados) {

    const { horario, servico, atendimentos } = dados;

    const duracao = obterDuracaoDoServico(servico);

    const inicio = horarioParaMinutos(horario);

    const fim = inicio + duracao;

    if (!estaDentroDoHorarioFuncionamento(inicio, fim)) {

        const proximoHorario = buscarProximoHorarioLivre(
            inicio,
            duracao,
            atendimentos
        );

        return {
            valido: false,
            status: 'FORA_DO_HORARIO',
            proximoHorario,
            mensagem: proximoHorario
                ? `Esse horário está fora do horário de funcionamento. O próximo horário disponível é ${proximoHorario}.`
                : 'Esse horário está fora do horário de funcionamento.'
        };

    }

    const conflito = existeConflito(
        inicio,
        fim,
        atendimentos
    );

    if (conflito) {

        const proximoHorario = buscarProximoHorarioLivre(
            inicio,
            duracao,
            atendimentos
        );

        return {
            valido: false,
            status: 'HORARIO_OCUPADO',
            proximoHorario,
            mensagem: proximoHorario
                ? `Esse horário está ocupado. O próximo horário disponível é ${proximoHorario}.`
                : 'Esse horário está ocupado.'
        };

    }

    return {
        valido: true,
        duracao,
        inicio,
        fim
    };

}

function consultarHorariosDisponiveis(dados) {

    const {
        servico,
        atendimentos,
        limite
    } = dados;

    const duracao = obterDuracaoDoServico(servico);

    const horarios = gerarHorariosLivres(
        duracao,
        atendimentos,
        Number(limite || 6)
    );

    return {
        status: horarios.length
            ? 'HORARIOS_ENCONTRADOS'
            : 'SEM_HORARIOS_LIVRES',

        servico,
        duracao,
        horarios,

        mensagem: horarios.length
            ? `Horários livres encontrados: ${horarios.join(', ')}.`
            : 'Não encontrei horários livres.'
    };

}

module.exports = {
    validarCriacaoAgendamento,
    consultarHorariosDisponiveis
};