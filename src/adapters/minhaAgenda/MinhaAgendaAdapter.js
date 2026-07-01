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

function normalizarDados(dados) {
    if (!dados) return {};

    if (dados.dados) return dados.dados;

    return dados;
}

class MinhaAgendaAdapter {

    async listarAtendimentos(dados = {}, pageRecebida) {
        const dadosNormalizados = normalizarDados(dados);

        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dadosNormalizados.data);

        return await listarAtendimentosDoDia(page);
    }

    async criarAgendamento(dados, pageRecebida) {
        const dadosNormalizados = normalizarDados(dados);

        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dadosNormalizados.data);

        const statusHorario = await abrirHorario(page, dadosNormalizados.horario);

        if (statusHorario !== 'HORARIO_LIVRE') {
            return {
                status: 'HORARIO_OCUPADO',
                mensagem: `O horário ${dadosNormalizados.horario} já está ocupado.`
            };
        }

        const cliente = await selecionarOuCriarCliente(page, {
            cliente: dadosNormalizados.cliente,
            telefone: dadosNormalizados.telefone
        });

        if (cliente.status !== 'CLIENTE_SELECIONADO') {
            return {
                status: 'ERRO_CLIENTE',
                mensagem: 'Não foi possível selecionar ou criar o cliente.'
            };
        }

        await selecionarServico(page, dadosNormalizados.servico);
        await salvarAgendamento(page);

        return {
            status: 'AGENDAMENTO_CRIADO',
            mensagem: 'Agendamento criado com sucesso.'
        };
    }

    async consultarAgendamento(dados, pageRecebida) {
        const dadosNormalizados = normalizarDados(dados);

        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dadosNormalizados.data);

        const resultado = await consultarAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
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
        const dadosNormalizados = normalizarDados(dados);

        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dadosNormalizados.data);

        const atendimento = await abrirAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
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
        const dadosNormalizados = normalizarDados(dados);

        const { page } = await obterPage(pageRecebida);

        await irParaData(page, dadosNormalizados.data);

        const atendimento = await abrirAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
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

        if (dadosNormalizados.horario) {
            await alterarHorarioAgendamento(page, dadosNormalizados.horario);
        }

        if (dadosNormalizados.clienteNovo) {
            await selecionarOuCriarCliente(page, {
                cliente: dadosNormalizados.clienteNovo,
                telefone: dadosNormalizados.telefoneNovo
            });
        }

        if (dadosNormalizados.servico) {
            await selecionarServico(page, dadosNormalizados.servico);
        }

        return {
            status: 'AGENDAMENTO_ALTERADO',
            mensagem: 'Agendamento alterado com sucesso.'
        };
    }

}

module.exports = new MinhaAgendaAdapter();