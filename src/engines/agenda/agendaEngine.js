const MinhaAgendaAdapter = require('../../adapters/minhaAgenda/MinhaAgendaAdapter');

const {
    abrirBrowser
} = require('../../utils/browser');

const CommandValidator = require('../../validators/commandValidator');

const {
    consultarHorariosDisponiveis
} = require('./agendaValidator');

class AgendaEngine {

    async execute(action, dados = {}) {
        CommandValidator.agenda(action, dados);

        switch (action) {
            case 'criar':
                return await this.criar(dados);

            case 'consultar':
                return await this.consultar(dados);

            case 'cancelar':
                return await this.cancelar(dados);

            case 'horarios':
                return await this.consultarHorarios(dados);

            case 'reagendar':
                return await this.reagendar(dados);

            case 'alterar':
                return await this.alterar(dados);

            default:
                throw new Error(`Ação "${action}" não existe.`);
        }
    }

    async criar(dados) {
        const { page } = await abrirBrowser();

        return await MinhaAgendaAdapter.criarAgendamento(dados, page);
    }

    async consultar(dados) {
        const { page } = await abrirBrowser();

        return await MinhaAgendaAdapter.consultarAgendamento(dados, page);
    }

    async cancelar(dados) {
        const { page } = await abrirBrowser();

        return await MinhaAgendaAdapter.cancelarAgendamento(dados, page);
    }

    async consultarHorarios(dados) {
        const { page } = await abrirBrowser();

        const atendimentos = await MinhaAgendaAdapter.listarAtendimentos(
            dados,
            page
        );

        return consultarHorariosDisponiveis({
            servico: dados.servico,
            limite: dados.limite,
            atendimentos
        });
    }

    async alterar(dados) {
        const { page } = await abrirBrowser();

        return await MinhaAgendaAdapter.alterarAgendamento(dados, page);
    }

    async reagendar(dados) {
        return await this.alterar({
            cliente: dados.cliente,
            telefone: dados.telefone,
            data: dados.data,
            horario: dados.novoHorario
        });
    }

}

module.exports = new AgendaEngine();