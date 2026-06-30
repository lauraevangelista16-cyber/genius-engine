const MinhaAgendaAdapter = require('../adapters/minhaAgenda/MinhaAgendaAdapter');

const {
    validarCriacaoAgendamento,
    consultarHorariosDisponiveis
} = require('../engines/agenda/agendaEngine');

async function consultarHorariosLivres(dados) {
    try {
        const atendimentos = await MinhaAgendaAdapter.listarAtendimentos();

        return consultarHorariosDisponiveis({
            servico: dados.servico,
            limite: dados.limite,
            atendimentos
        });

    } catch (erro) {
        return {
            status: 'ERRO',
            mensagem: erro.message
        };
    }
}

async function criarAgendamento(dados) {
    try {
        return await MinhaAgendaAdapter.criarAgendamento(
            dados,
            validarCriacaoAgendamento
        );

    } catch (erro) {
        return {
            status: 'ERRO',
            mensagem: erro.message
        };
    }
}

module.exports = {
    criarAgendamento,
    consultarHorariosLivres
};