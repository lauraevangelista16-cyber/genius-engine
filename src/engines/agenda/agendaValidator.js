const {
    horarioParaMinutos,
    obterDuracaoDoServico,
    existeConflito,
    estaDentroDoHorarioFuncionamento,
    buscarProximoHorarioLivre,
    gerarHorariosLivres
} = require('./agendaRules');

function validarCriacaoAgendamento(dados) {
    const {
        horario,
        servico,
        atendimentos = []
    } = dados;

    const duracao = obterDuracaoDoServico(servico);

    if (duracao === null) {
        return {
            valido: false,
            status: 'SERVICO_NAO_ENCONTRADO',
            mensagem: `O serviço "${servico}" não foi encontrado.`
        };
    }

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
        atendimentos = [],
        limite
    } = dados;

    const duracao = obterDuracaoDoServico(servico);

    if (duracao === null) {
        return {
            valido: false,
            status: 'SERVICO_NAO_ENCONTRADO',
            mensagem: `O serviço "${servico}" não foi encontrado.`
        };
    }

    const limiteNormalizado =
        limite !== undefined &&
        limite !== null &&
        limite !== ''
            ? Number(limite)
            : null;

    const horarios = gerarHorariosLivres(
        duracao,
        atendimentos,
        limiteNormalizado
    );

    const horariosManha = horarios.filter(horario => {
        const hora = Number(horario.split(':')[0]);
        return hora < 12;
    });

    const horariosTarde = horarios.filter(horario => {
        const hora = Number(horario.split(':')[0]);
        return hora >= 14;
    });

    const partesMensagem = [];

    if (horariosManha.length) {
        partesMensagem.push(
            `Manhã: ${horariosManha.join(', ')}`
        );
    }

    if (horariosTarde.length) {
        partesMensagem.push(
            `Tarde: ${horariosTarde.join(', ')}`
        );
    }

    return {
        status: horarios.length
            ? 'HORARIOS_ENCONTRADOS'
            : 'SEM_HORARIOS_LIVRES',

        servico,
        duracao,
        horarios,
        manha: horariosManha,
        tarde: horariosTarde,

        mensagem: horarios.length
            ? `Horários livres encontrados. ${partesMensagem.join(' | ')}.`
            : 'Não encontrei horários livres.'
    };
}

module.exports = {
    validarCriacaoAgendamento,
    consultarHorariosDisponiveis
};