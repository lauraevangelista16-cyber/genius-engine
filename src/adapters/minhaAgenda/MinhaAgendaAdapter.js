const { irParaData } = require('../../services/agendaNavigationService');

const { abrirBrowser } = require('../../utils/browser');

const {
    abrirHorario,
    selecionarServico,
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento,
    alterarHorarioAgendamento
} = require('../../services/agendaService');

const {
    selecionarOuCriarCliente
} = require('../../services/clienteService');

async function obterPage(pageRecebida) {
    if (pageRecebida) {
        return {
            page: pageRecebida,
            browser: null
        };
    }

    return await abrirBrowser();
}

class MinhaAgendaAdapter {

    async listarAtendimentos(dados = {}, pageRecebida) {
        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dados.data);

        return await listarAtendimentosDoDia(page);
    }

    async criarAgendamento(dados, pageRecebida) {
        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dados.data);

        const statusHorario = await abrirHorario(page, dados.horario);

        if (statusHorario !== 'HORARIO_LIVRE') {
            return {
                status: 'HORARIO_OCUPADO',
                mensagem: `O horário ${dados.horario} já está ocupado.`
            };
        }

        const cliente = await selecionarOuCriarCliente(page, {
            cliente: dados.cliente,
            telefone: dados.telefone
        });

        if (cliente.status !== 'CLIENTE_SELECIONADO') {
            return {
                status: 'ERRO_CLIENTE',
                mensagem: 'Não foi possível selecionar ou criar o cliente.'
            };
        }

        await selecionarServico(page, dados.servico);
        await salvarAgendamento(page);

        return {
            status: 'AGENDAMENTO_CRIADO',
            mensagem: 'Agendamento criado com sucesso.'
        };
    }

    async consultarAgendamento(dados, pageRecebida) {
        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dados.data);

        const resultado = await consultarAtendimentoPorCliente(
            page,
            dados.cliente,
            dados.telefone
        );

        if (!resultado.encontrado) {
            return {
                status: 'AGENDAMENTO_NAO_ENCONTRADO',
                mensagem: 'Nenhum agendamento encontrado.'
            };
        }

        if (resultado.multiplos) {
            return {
                status: 'MULTIPLOS_AGENDAMENTOS',
                atendimentos: resultado.atendimentos
            };
        }

        return {
            status: 'AGENDAMENTO_ENCONTRADO',
            atendimento: resultado
        };
    }

    async cancelarAgendamento(dados, pageRecebida) {
        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dados.data);

        const atendimento = await abrirAtendimentoPorCliente(
            page,
            dados.cliente,
            dados.telefone
        );

        if (!atendimento.encontrado) {
            return {
                status: 'AGENDAMENTO_NAO_ENCONTRADO',
                mensagem: 'Nenhum agendamento encontrado.'
            };
        }

        if (atendimento.multiplos) {
            return {
                status: 'MULTIPLOS_AGENDAMENTOS',
                atendimentos: atendimento.texto
            };
        }

        await deletarAgendamento(page);

        return {
            status: 'AGENDAMENTO_CANCELADO',
            mensagem: 'Agendamento cancelado com sucesso.'
        };
    }

    async alterarAgendamento(dados, pageRecebida) {
        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dados.data);

        const atendimento = await abrirAtendimentoPorCliente(
            page,
            dados.cliente,
            dados.telefone
        );

        if (!atendimento.encontrado) {
            return {
                status: 'AGENDAMENTO_NAO_ENCONTRADO',
                mensagem: 'Nenhum agendamento encontrado.'
            };
        }

        if (atendimento.multiplos) {
            return {
                status: 'MULTIPLOS_AGENDAMENTOS',
                atendimentos: atendimento.texto
            };
        }

        if (dados.horario) {
            await alterarHorarioAgendamento(page, dados.horario);
        }

        if (dados.clienteNovo) {
            await selecionarOuCriarCliente(page, {
                cliente: dados.clienteNovo,
                telefone: dados.telefoneNovo
            });
        }

        if (dados.servico) {
            await selecionarServico(page, dados.servico);
        }

        return {
            status: 'AGENDAMENTO_ALTERADO',
            mensagem: 'Agendamento alterado com sucesso.'
        };
    }

}

module.exports = new MinhaAgendaAdapter();