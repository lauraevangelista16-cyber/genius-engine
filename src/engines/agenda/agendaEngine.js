const MinhaAgendaAdapter = require('../../adapters/minhaAgenda/MinhaAgendaAdapter');

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

            case 'cadastrar_cliente':
                return await this.cadastrarCliente(dados);

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
        return await MinhaAgendaAdapter.criarAgendamento(dados);
    }

    async cadastrarCliente(dados) {
        return await MinhaAgendaAdapter.cadastrarCliente(dados);
    }

    async consultar(dados) {
        return await MinhaAgendaAdapter.consultarAgendamento(dados);
    }

    async cancelar(dados) {
        return await MinhaAgendaAdapter.cancelarAgendamento(dados);
    }

    async consultarHorarios(dados) {

        const atendimentos = await MinhaAgendaAdapter.listarAtendimentos(
            dados
        );

        return consultarHorariosDisponiveis({
            servico: dados.servico,
            limite: dados.limite,
            atendimentos: atendimentos.atendimentos || []
        });

    }

    async alterar(dados) {
        return await MinhaAgendaAdapter.alterarAgendamento(dados);
    }

    async reagendar(dados) {

        return await this.alterar({
            ...dados,
            horario: dados.novoHorario || dados.novo_horario || dados.horario
        });

    }

}

module.exports = new AgendaEngine();