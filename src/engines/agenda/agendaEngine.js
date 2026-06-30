const {
    validarCriacaoAgendamento,
    consultarHorariosDisponiveis
} = require('./agendaValidator');

const MinhaAgendaAdapter = require('../../adapters/minhaAgenda/MinhaAgendaAdapter');

const {
    abrirBrowser
} = require('../../utils/browser');

const CommandValidator = require('../../validators/CommandValidator');

class AgendaEngine {

    async execute(action, dados) {

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

        const { browser, page } = await abrirBrowser();

        try {
            const atendimentos = await MinhaAgendaAdapter.listarAtendimentos(page);

            const validacao = validarCriacaoAgendamento({
                ...dados,
                atendimentos
            });

            if (!validacao.valido) {
                return {
                    status: validacao.status,
                    mensagem: validacao.mensagem
                };
            }

            return await MinhaAgendaAdapter.criarAgendamento(dados, page);

        } finally {
            // await browser.close();
        }

    }

    async consultar(dados) {

        const { browser, page } = await abrirBrowser();

        try {
            return await MinhaAgendaAdapter.consultarAgendamento(dados, page);

        } finally {
            // await browser.close();
        }

    }

    async cancelar(dados) {

        const { browser, page } = await abrirBrowser();

        try {
            return await MinhaAgendaAdapter.cancelarAgendamento(dados, page);

        } finally {
            // await browser.close();
        }

    }

    async consultarHorarios(dados) {

        const { browser, page } = await abrirBrowser();

        try {
            const atendimentos = await MinhaAgendaAdapter.listarAtendimentos(page);

            return consultarHorariosDisponiveis({
                ...dados,
                atendimentos
            });

        } finally {
            // await browser.close();
        }

    }

    async alterar(dados) {

        const { browser, page } = await abrirBrowser();

        try {
            if (dados.horario) {

                const atendimentos = await MinhaAgendaAdapter.listarAtendimentos(page);

                const consulta = await MinhaAgendaAdapter.consultarAgendamento(
                    {
                        cliente: dados.cliente,
                        telefone: dados.telefone
                    },
                    page
                );

                const servico =
                    dados.servico ||
                    consulta?.atendimento?.servico;

                const validacao = validarCriacaoAgendamento({
                    horario: dados.horario,
                    servico,
                    atendimentos
                });

                if (!validacao.valido) {
                    return {
                        status: validacao.status,
                        mensagem: validacao.mensagem
                    };
                }

            }

            return await MinhaAgendaAdapter.alterarAgendamento(dados, page);

        } finally {
            // await browser.close();
        }

    }

    async reagendar(dados) {

        return await this.alterar({
            cliente: dados.cliente,
            telefone: dados.telefone,
            horario: dados.novoHorario
        });

    }

}

module.exports = new AgendaEngine();