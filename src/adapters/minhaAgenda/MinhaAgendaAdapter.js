const { irParaData } = require('../../services/agendaNavigationService');
const { abrirBrowser } = require('../../utils/browser');
const Debugger = require('../../core/Debugger');

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

        await Debugger.step(page, 'A001-listar-inicio');

        await irParaData(page, dadosNormalizados.data);

        await Debugger.step(page, 'A002-listar-data');

        return await listarAtendimentosDoDia(page);
    }

    async criarAgendamento(dados, pageRecebida) {
        const dadosNormalizados = normalizarDados(dados);
        const { page } = await obterPage(pageRecebida);

        await Debugger.step(page, 'A003-criar-inicio');

        await irParaData(page, dadosNormalizados.data);

        await Debugger.step(page, 'A004-criar-data');

        const statusHorario = await abrirHorario(page, dadosNormalizados.horario);

        await Debugger.step(page, `A005-status-horario-${statusHorario}`);

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

        await Debugger.step(page, `A006-status-cliente-${cliente.status}`);

        if (cliente.status !== 'CLIENTE_SELECIONADO') {
            return {
                status: 'ERRO_CLIENTE',
                mensagem: 'Não foi possível selecionar ou criar o cliente.'
            };
        }

        await selecionarServico(page, dadosNormalizados.servico);

        await Debugger.step(page, 'A007-servico-selecionado');

        const resultadoSalvar = await salvarAgendamento(page);

if (resultadoSalvar.status !== 'SALVO') {
    return resultadoSalvar;
}

        await Debugger.step(page, 'A008-agendamento-salvo');

        await irParaData(page, dadosNormalizados.data);

        await Debugger.step(page, 'A009-data-confirmacao');

        const confirmacao = await consultarAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
        );

        await Debugger.step(page, `A010-confirmacao-${confirmacao.encontrado}`);

        if (!confirmacao.encontrado) {
            return {
                status: 'AGENDAMENTO_NAO_CONFIRMADO',
                mensagem: 'O sistema tentou criar o agendamento, mas ele não apareceu na agenda. Não vou confirmar como criado.'
            };
        }

        return {
            status: 'AGENDAMENTO_CRIADO',
            mensagem: 'Agendamento criado com sucesso.',
            atendimento: confirmacao
        };
    }

    async consultarAgendamento(dados, pageRecebida) {
        const dadosNormalizados = normalizarDados(dados);
        const { page } = await obterPage(pageRecebida);

        await Debugger.step(page, 'A011-consultar-inicio');

        await irParaData(page, dadosNormalizados.data);

        await Debugger.step(page, 'A012-consultar-data');

        const resultado = await consultarAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
        );

        await Debugger.step(page, `A013-consultar-encontrado-${resultado.encontrado}`);

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

        await Debugger.step(page, 'A014-cancelar-inicio');

        await irParaData(page, dadosNormalizados.data);

        await Debugger.step(page, 'A015-cancelar-data');

        const atendimento = await abrirAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
        );

        await Debugger.step(page, `A016-cancelar-encontrado-${atendimento.encontrado}`);

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

        await Debugger.step(page, 'A017-cancelado');

        return {
            status: 'AGENDAMENTO_CANCELADO',
            mensagem: 'Agendamento cancelado com sucesso.'
        };
    }

    async alterarAgendamento(dados, pageRecebida) {
        const dadosNormalizados = normalizarDados(dados);
        const { page } = await obterPage(pageRecebida);

        await Debugger.step(page, 'A018-alterar-inicio');

        await irParaData(page, dadosNormalizados.data);

        await Debugger.step(page, 'A019-alterar-data');

        const atendimento = await abrirAtendimentoPorCliente(
            page,
            dadosNormalizados.cliente,
            dadosNormalizados.telefone
        );

        await Debugger.step(page, `A020-alterar-encontrado-${atendimento.encontrado}`);

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
            await Debugger.step(page, 'A021-horario-alterado');
        }

        if (dadosNormalizados.clienteNovo) {
            await selecionarOuCriarCliente(page, {
                cliente: dadosNormalizados.clienteNovo,
                telefone: dadosNormalizados.telefoneNovo
            });

            await Debugger.step(page, 'A022-cliente-alterado');
        }

        if (dadosNormalizados.servico) {
            await selecionarServico(page, dadosNormalizados.servico);
            await Debugger.step(page, 'A023-servico-alterado');
        }

        return {
            status: 'AGENDAMENTO_ALTERADO',
            mensagem: 'Agendamento alterado com sucesso.'
        };
    }

}

module.exports = new MinhaAgendaAdapter();