const { snapshotFormulario } = require('../../services/formInspectorService');
const { irParaData } = require('../../services/agendaNavigationService');
const { abrirBrowser } = require('../../utils/browser');
const Debugger = require('../../core/Debugger');
const Logger = require('../../core/Logger');

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
    selecionarCliente,
    selecionarOuCriarCliente,
    criarCliente
} = require('../../services/clienteService');

async function step(page, nome) {
    Logger.info(`[MinhaAgendaAdapter] ${nome}`);
    await Debugger.step(page, nome).catch(() => {});
}

async function obterPage() {
    const { page } = await abrirBrowser();

    if (!page) {
        throw new Error('Não foi possível abrir a sessão do navegador.');
    }

    return page;
}

function normalizarDados(dados) {
    if (!dados) return {};
    if (dados.dados) return dados.dados;
    return dados;
}

class MinhaAgendaAdapter {

    async listarAtendimentos(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            await step(page, 'A001-listar-inicio');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A002-listar-data');

            const atendimentos = await listarAtendimentosDoDia(page);

            return {
                status: 'ATENDIMENTOS_LISTADOS',
                atendimentos
            };
        } catch (erro) {
            Logger.error(`[MinhaAgendaAdapter] erro listarAtendimentos: ${erro.message}`);

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao listar atendimentos.'
            };
        }
    }

    async cadastrarCliente(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            await step(page, 'A000-cadastrar-cliente-inicio');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A000-cadastrar-cliente-data');

            const statusHorario = await abrirHorario(
                page,
                dadosNormalizados.horario
            );

            await step(page, `A000-status-horario-cadastro-${statusHorario}`);

            if (statusHorario !== 'HORARIO_LIVRE') {
                return {
                    status: 'HORARIO_OCUPADO',
                    mensagem: `O horário ${dadosNormalizados.horario} está ocupado.`
                };
            }

            const clienteJaExiste = await selecionarCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(page, `A000-status-cliente-ja-existe-${clienteJaExiste.status}`);

            if (clienteJaExiste.status === 'CLIENTE_SELECIONADO') {
                await page.keyboard.press('Escape').catch(() => {});

                return {
                    status: 'CLIENTE_JA_CADASTRADO',
                    mensagem: 'Cliente já estava cadastrado.'
                };
            }

            const criacao = await criarCliente(page, {
                cliente: dadosNormalizados.cliente,
                telefone: dadosNormalizados.telefone,
                data: dadosNormalizados.data,
                horario: dadosNormalizados.horario
            });

            await step(page, `A000-status-cadastro-cliente-${criacao.status}`);

            await page.keyboard.press('Escape').catch(() => {});
            await page.waitForTimeout(1000);

            if (criacao.status !== 'CLIENTE_CRIADO') {
                return {
                    status: 'ERRO_CLIENTE',
                    mensagem: 'Não foi possível cadastrar o cliente.',
                    detalhe: criacao
                };
            }

            return {
                status: 'CLIENTE_CADASTRADO',
                mensagem: 'Cliente cadastrado com sucesso.'
            };
        } catch (erro) {
            Logger.error(`[MinhaAgendaAdapter] erro cadastrarCliente: ${erro.message}`);

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao cadastrar cliente.'
            };
        }
    }
    async criarAgendamento(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            await step(page, 'A003-criar-inicio');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A004-criar-data');

            const statusHorario = await abrirHorario(
                page,
                dadosNormalizados.horario
            );

            await snapshotFormulario(page, 'depois-abrir-horario');

            await step(page, `A005-status-horario-${statusHorario}`);

            if (statusHorario !== 'HORARIO_LIVRE') {
                return {
                    status: 'HORARIO_OCUPADO',
                    mensagem: `O horário ${dadosNormalizados.horario} já está ocupado.`
                };
            }

            await step(page, 'A005B-modal-aberto-antes-cliente');

            const cliente = await selecionarCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(page, `A006-status-cliente-${cliente.status}`);

            if (cliente.status === 'CLIENTE_NAO_ENCONTRADO') {
                await step(page, 'A006-cliente-nao-encontrado-criando-no-mesmo-atendimento');

                const criacao = await criarCliente(page, {
                    cliente: dadosNormalizados.cliente,
                    telefone: dadosNormalizados.telefone,
                    data: dadosNormalizados.data,
                    horario: dadosNormalizados.horario
                });

                await step(page, `A006-status-cliente-criado-no-modal-${criacao.status}`);

                if (criacao.status !== 'CLIENTE_CRIADO') {
                    await page.keyboard.press('Escape').catch(() => {});

                    return {
                        status: 'ERRO_CLIENTE',
                        mensagem: 'Não foi possível criar o cliente no atendimento.',
                        detalhe: criacao
                    };
                }
            } else if (cliente.status !== 'CLIENTE_SELECIONADO') {
                await page.keyboard.press('Escape').catch(() => {});

                return {
                    status: 'ERRO_CLIENTE',
                    mensagem: 'Não foi possível selecionar o cliente.',
                    detalhe: cliente
                };
            }

            await step(page, 'A006B-cliente-pronto-antes-servico');

            await snapshotFormulario(page, 'depois-cliente');

            const resultadoServico = await selecionarServico(
                page,
                dadosNormalizados.servico
            );

            await step(page, 'A007-servico-selecionado');

            await snapshotFormulario(page, 'depois-servico');

            if (
                resultadoServico &&
                resultadoServico.status &&
                resultadoServico.status !== 'SERVICO_SELECIONADO'
            ) {
                return resultadoServico;
            }

            await snapshotFormulario(page, 'antes-salvar');

            const resultadoSalvar = await salvarAgendamento(page);

            await step(page, `A008-status-salvar-${resultadoSalvar.status}`);

            if (resultadoSalvar.status !== 'SALVO') {
                return resultadoSalvar;
            }

            await step(page, 'A008-agendamento-salvo');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A009-data-confirmacao');

            const confirmacao = await consultarAtendimentoPorCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(page, `A010-confirmacao-${confirmacao.encontrado}`);

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
        } catch (erro) {
            Logger.error(`[MinhaAgendaAdapter] erro criarAgendamento: ${erro.message}`);

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao criar agendamento.'
            };
        }
    }
    async consultarAgendamento(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            await step(page, 'A011-consultar-inicio');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A012-consultar-data');

            const resultado = await consultarAtendimentoPorCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(page, `A013-consultar-encontrado-${resultado.encontrado}`);

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
        } catch (erro) {
            Logger.error(`[MinhaAgendaAdapter] erro consultarAgendamento: ${erro.message}`);

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao consultar agendamento.'
            };
        }
    }

    async cancelarAgendamento(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            await step(page, 'A014-cancelar-inicio');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A015-cancelar-data');

            const atendimento = await abrirAtendimentoPorCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(page, `A016-cancelar-encontrado-${atendimento.encontrado}`);

            if (!atendimento.encontrado) {
                return {
                    status: 'AGENDAMENTO_NAO_ENCONTRADO',
                    mensagem: 'Nenhum agendamento encontrado.'
                };
            }

            if (atendimento.multiplos) {
                return {
                    status: 'MULTIPLOS_AGENDAMENTOS',
                    atendimentos: atendimento.texto || atendimento.atendimentos
                };
            }

            await deletarAgendamento(page);

            await step(page, 'A017-cancelado');

            return {
                status: 'AGENDAMENTO_CANCELADO',
                mensagem: 'Agendamento cancelado com sucesso.'
            };
        } catch (erro) {
            Logger.error(`[MinhaAgendaAdapter] erro cancelarAgendamento: ${erro.message}`);

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao cancelar agendamento.'
            };
        }
    }

    async alterarAgendamento(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            await step(page, 'A018-alterar-inicio');

            await irParaData(page, dadosNormalizados.data);

            await step(page, 'A019-alterar-data');

            const atendimento = await abrirAtendimentoPorCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(page, `A020-alterar-encontrado-${atendimento.encontrado}`);

            if (!atendimento.encontrado) {
                return {
                    status: 'AGENDAMENTO_NAO_ENCONTRADO',
                    mensagem: 'Nenhum agendamento encontrado.'
                };
            }

            if (atendimento.multiplos) {
                return {
                    status: 'MULTIPLOS_AGENDAMENTOS',
                    atendimentos: atendimento.texto || atendimento.atendimentos
                };
            }

            const horarioParaAlterar =
                dadosNormalizados.novo_horario ||
                dadosNormalizados.novoHorario ||
                dadosNormalizados.horario;

            let houveAlteracao = false;

            if (horarioParaAlterar) {
    await alterarHorarioAgendamento(page, horarioParaAlterar);
    await step(page, 'A021-horario-alterado');

    return {
        status: 'AGENDAMENTO_ALTERADO',
        mensagem: 'Agendamento alterado com sucesso.'
    };
}

            if (dadosNormalizados.clienteNovo) {
                const clienteAlterado = await selecionarOuCriarCliente(page, {
                    cliente: dadosNormalizados.clienteNovo,
                    telefone: dadosNormalizados.telefoneNovo || dadosNormalizados.telefone,
                    data: dadosNormalizados.data,
                    horario: horarioParaAlterar || dadosNormalizados.horario
                });

                await step(page, `A022-cliente-alterado-${clienteAlterado.status}`);

                if (
                    clienteAlterado.status !== 'CLIENTE_SELECIONADO' &&
                    clienteAlterado.status !== 'CLIENTE_CRIADO'
                ) {
                    return {
                        status: 'ERRO_CLIENTE',
                        mensagem: 'Não foi possível alterar o cliente do agendamento.',
                        detalhe: clienteAlterado
                    };
                }

                houveAlteracao = true;
            }

            if (dadosNormalizados.servico) {
                const resultadoServico = await selecionarServico(
                    page,
                    dadosNormalizados.servico
                );

                await step(page, 'A023-servico-alterado');

                if (
                    resultadoServico &&
                    resultadoServico.status &&
                    resultadoServico.status !== 'SERVICO_SELECIONADO'
                ) {
                    return resultadoServico;
                }

                houveAlteracao = true;
            }

            if (!houveAlteracao) {
                return {
                    status: 'DADOS_INCOMPLETOS',
                    mensagem: 'Nenhuma alteração informada.'
                };
            }

            const resultadoSalvar = await salvarAgendamento(page);

            await step(page, `A024-alteracao-salvar-${resultadoSalvar.status}`);

            if (resultadoSalvar.status !== 'SALVO') {
                return resultadoSalvar;
            }

            return {
                status: 'AGENDAMENTO_ALTERADO',
                mensagem: 'Agendamento alterado com sucesso.'
            };
        } catch (erro) {
            Logger.error(`[MinhaAgendaAdapter] erro alterarAgendamento: ${erro.message}`);

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao alterar agendamento.'
            };
        }
    }

}

module.exports = new MinhaAgendaAdapter();