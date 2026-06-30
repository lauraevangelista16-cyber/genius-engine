const { abrirBrowser } = require('../utils/browser');

const {
    consultarAtendimentoPorCliente
} = require('../services/agendaService');

async function consultarAgendamento(dados) {
    const { cliente, telefone } = dados;

    const { browser, page } = await abrirBrowser();

    try {
        const atendimento = await consultarAtendimentoPorCliente(
            page,
            cliente,
            telefone
        );

        if (!atendimento.encontrado) {
            return {
                status: 'AGENDAMENTO_NAO_ENCONTRADO',
                mensagem: `Não encontrei agendamento para ${cliente}.`
            };
        }

        if (atendimento.multiplos) {
            return {
                status: 'MULTIPLOS_AGENDAMENTOS_ENCONTRADOS',
                atendimentos: atendimento.atendimentos,
                mensagem: `Encontrei mais de um agendamento para ${cliente}. Informe também o telefone para localizar a cliente correta.`
            };
        }

        return {
            status: 'AGENDAMENTO_ENCONTRADO',
            atendimento,
            mensagem: `${atendimento.cliente} está agendado para ${atendimento.inicio} até ${atendimento.fim}, serviço: ${atendimento.servico}.`
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
    consultarAgendamento
};