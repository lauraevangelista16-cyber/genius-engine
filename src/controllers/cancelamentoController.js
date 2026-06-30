const { abrirBrowser } = require('../utils/browser');

const {
    abrirAtendimentoPorCliente,
    deletarAgendamento
} = require('../services/agendaService');

async function cancelarAgendamento(dados) {
    const { cliente, telefone } = dados;

    const { browser, page } = await abrirBrowser();

    try {
        const atendimento = await abrirAtendimentoPorCliente(page, cliente, telefone);

        if (!atendimento.encontrado) {
            return {
                status: 'AGENDAMENTO_NAO_ENCONTRADO',
                mensagem: `Não encontrei agendamento para ${cliente}.`
            };
        }

        if (atendimento.multiplos) {
            return {
                status: 'MULTIPLOS_AGENDAMENTOS_ENCONTRADOS',
                atendimentos: atendimento.texto,
                mensagem: `Encontrei mais de um agendamento para ${cliente}. Informe também o telefone ou horário para cancelar com segurança.`
            };
        }

        await deletarAgendamento(page);

        return {
            status: 'AGENDAMENTO_CANCELADO',
            mensagem: `Agendamento de ${cliente} cancelado com sucesso.`
        };

    } catch (erro) {
        return {
            status: 'ERRO',
            mensagem: erro.message
        };

    } finally {
        // await browser.close();
    }
}

module.exports = {
    cancelarAgendamento
};