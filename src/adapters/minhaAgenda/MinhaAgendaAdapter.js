const { snapshotFormulario } = require('../../services/formInspectorService');
const { irParaData } = require('../../services/agendaNavigationService');
const { abrirBrowser } = require('../../utils/browser');
const Debugger = require('../../core/Debugger');
const Logger = require('../../core/Logger');
const {
    abrirBuscaGlobal
} = require('../../services/agendaBuscaGlobalService');
const {
    validarHorarioExpediente
} = require('../../engines/agenda/horarioExpediente');

const {
    horarioParaMinutos,
    obterDuracaoDoServico,
    estaDentroDoHorarioFuncionamento
} = require('../../engines/agenda/agendaRules');

const {
    abrirHorario,
    selecionarServico,
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento,
    alterarHorarioAgendamento,
    ajustarHorarioNoModal
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

function adicionarDias(data, quantidade) {
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() + quantidade);
    return novaData;
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
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
            Logger.error(
                `[MinhaAgendaAdapter] erro listarAtendimentos: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao listar atendimentos.'
            };
        }
    }

    async consultarAgendamentoGlobal(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);
        const page = await obterPage();

        try {
            const resultado = await abrirBuscaGlobal(
                page,
                dadosNormalizados.cliente
            );

            const atendimentos = resultado.resultados || [];

            if (atendimentos.length === 0) {
                return {
                    status: 'AGENDAMENTO_NAO_ENCONTRADO',
                    mensagem: 'Nenhum agendamento encontrado.',
                    atendimentos: []
                };
            }

            if (atendimentos.length === 1) {
                return {
                    status: 'AGENDAMENTO_ENCONTRADO',
                    atendimento: atendimentos[0]
                };
            }

            return {
                status: 'MULTIPLOS_AGENDAMENTOS',
                atendimentos,
                total: atendimentos.length
            };
        } catch (erro) {
            Logger.error(
                `[MinhaAgendaAdapter] erro consultarAgendamentoGlobal: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao consultar agendamentos.'
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

            await step(
                page,
                `A000-status-horario-cadastro-${statusHorario}`
            );

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

            await step(
                page,
                `A000-status-cliente-ja-existe-${clienteJaExiste.status}`
            );

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

            await step(
                page,
                `A000-status-cadastro-cliente-${criacao.status}`
            );

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
            Logger.error(
                `[MinhaAgendaAdapter] erro cadastrarCliente: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem: erro.message || 'Erro ao cadastrar cliente.'
            };
        }
    }

    async criarAgendamento(dados = {}) {
        const dadosNormalizados = normalizarDados(dados);

        const duracaoServico = obterDuracaoDoServico(
            dadosNormalizados.servico
        );

        if (duracaoServico === null) {
            return {
                status: 'SERVICO_NAO_ENCONTRADO',
                mensagem: `O serviço "${dadosNormalizados.servico}" não foi encontrado.`
            };
        }
        const inicioEmMinutos = horarioParaMinutos(
            dadosNormalizados.horario
        );

        const fimEmMinutos =
            inicioEmMinutos + duracaoServico;

        if (
            !estaDentroDoHorarioFuncionamento(
                inicioEmMinutos,
                fimEmMinutos
            )
        ) {
            return {
                status: 'FORA_DO_EXPEDIENTE',
                mensagem:
                    `O atendimento iniciaria às ${dadosNormalizados.horario} e terminaria fora do ` +
                    'horário de funcionamento.'
            };
        }

        const page = await obterPage();

        try {
            await step(page, 'A003-criar-inicio');

            await irParaData(
                page,
                dadosNormalizados.data
            );

            await step(page, 'A004-criar-data');

            let statusHorario = await abrirHorario(
                page,
                dadosNormalizados.horario
            );

            if (
                statusHorario ===
                'ERRO_LINHA_HORARIO_NAO_ENCONTRADA'
            ) {
                const [hora, minuto] =
                    dadosNormalizados.horario
                        .split(':')
                        .map(Number);

                const minutoBase =
                    minuto < 30 ? 0 : 30;

                const horarioBase =
                    `${String(hora).padStart(2, '0')}:` +
                    `${String(minutoBase).padStart(2, '0')}`;

                statusHorario = await abrirHorario(
                    page,
                    horarioBase,
                    dadosNormalizados.horario
                );

                if (statusHorario === 'HORARIO_LIVRE') {
                    const ajusteHorario =
                        await ajustarHorarioNoModal(
                            page,
                            dadosNormalizados.horario
                        );

                    await step(
                        page,
                        `A005A-ajuste-horario-${ajusteHorario.status}`
                    );

                    if (
                        ajusteHorario.status !==
                        'HORARIO_MODAL_AJUSTADO'
                    ) {
                        await page.keyboard
                            .press('Escape')
                            .catch(() => {});

                        return ajusteHorario;
                    }
                }
            }

            await snapshotFormulario(
                page,
                'depois-abrir-horario'
            );

            await step(
                page,
                `A005-status-horario-${statusHorario}`
            );

            if (statusHorario === 'HORARIO_OCUPADO') {
                return {
                    status: 'HORARIO_OCUPADO',
                    mensagem:
                        `O horário ${dadosNormalizados.horario} já está ocupado.`
                };
            }

            if (statusHorario !== 'HORARIO_LIVRE') {
                return {
                    status:
                        statusHorario ||
                        'ERRO_ABRIR_HORARIO',
                    mensagem:
                        `Não foi possível abrir o horário ${dadosNormalizados.horario}.`
                };
            }

            await step(
                page,
                'A005B-modal-aberto-antes-cliente'
            );

            const cliente = await selecionarCliente(
                page,
                dadosNormalizados.cliente,
                dadosNormalizados.telefone
            );

            await step(
                page,
                `A006-status-cliente-${cliente.status}`
            );

            const deveCriarCliente = [
                'CLIENTE_NAO_ENCONTRADO',
                'CLIENTE_NAO_ENCONTRADO_COM_PARECIDOS'
            ].includes(cliente.status);

            if (deveCriarCliente) {
                await step(
                    page,
                    'A006-cliente-nao-encontrado-criando-no-mesmo-atendimento'
                );

                const criacao = await criarCliente(
                    page,
                    {
                        cliente:
                            dadosNormalizados.cliente,
                        telefone:
                            dadosNormalizados.telefone,
                        data:
                            dadosNormalizados.data,
                        horario:
                            dadosNormalizados.horario
                    }
                );

                await step(
                    page,
                    `A006-status-cliente-criado-no-modal-${criacao.status}`
                );

                if (
                    criacao.status !==
                    'CLIENTE_CRIADO'
                ) {
                    await page.keyboard
                        .press('Escape')
                        .catch(() => {});

                    return {
                        status: 'ERRO_CLIENTE',
                        mensagem:
                            'Não foi possível criar o cliente no atendimento.',
                        detalhe: criacao
                    };
                }
            } else if (
                cliente.status !==
                'CLIENTE_SELECIONADO'
            ) {
                await page.keyboard
                    .press('Escape')
                    .catch(() => {});

                return {
                    status: 'ERRO_CLIENTE',
                    mensagem:
                        'Não foi possível selecionar o cliente.',
                    detalhe: cliente
                };
            }
            await step(
                page,
                'A006B-cliente-pronto-antes-servico'
            );

            await snapshotFormulario(
                page,
                'depois-cliente'
            );

            const resultadoServico =
                await selecionarServico(
                    page,
                    dadosNormalizados.servico
                );

            await step(
                page,
                'A007-servico-selecionado'
            );

            await snapshotFormulario(
                page,
                'depois-servico'
            );

            if (
                resultadoServico &&
                resultadoServico.status &&
                resultadoServico.status !==
                    'SERVICO_SELECIONADO'
            ) {
                return resultadoServico;
            }

            await snapshotFormulario(
                page,
                'antes-salvar'
            );

            const textoTelaAntesSalvar =
                await page
                    .locator('body')
                    .innerText();

            if (
                textoTelaAntesSalvar.includes(
                    'Cliente'
                ) &&
                textoTelaAntesSalvar.includes(
                    'Preencha esse campo para continuar'
                )
            ) {
                await step(
                    page,
                    'A007B-cliente-vazio-antes-salvar'
                );

                return {
                    status:
                        'ERRO_CLIENTE_NAO_SELECIONADO',
                    mensagem:
                        'O cliente foi criado, mas não ficou selecionado no atendimento.'
                };
            }

            const resultadoSalvar =
                await salvarAgendamento(page);

            await step(
                page,
                `A008-status-salvar-${resultadoSalvar.status}`
            );

            if (
                resultadoSalvar.status !==
                'SALVO'
            ) {
                return resultadoSalvar;
            }

            await step(
                page,
                'A008-agendamento-salvo'
            );

            await irParaData(
                page,
                dadosNormalizados.data
            );

            await step(
                page,
                'A009-data-confirmacao'
            );

            const confirmacao =
                await consultarAtendimentoPorCliente(
                    page,
                    dadosNormalizados.cliente,
                    dadosNormalizados.telefone,
                    dadosNormalizados.horario,
                    dadosNormalizados.servico
                );

            await step(
                page,
                `A010-confirmacao-${confirmacao.encontrado}`
            );

            if (!confirmacao.encontrado) {
                return {
                    status:
                        'AGENDAMENTO_NAO_CONFIRMADO',
                    mensagem:
                        'O sistema tentou criar o agendamento, mas ele não apareceu na agenda. Não vou confirmar como criado.'
                };
            }

            return {
                status: 'AGENDAMENTO_CRIADO',
                mensagem:
                    'Agendamento criado com sucesso.',
                atendimento: confirmacao
            };
        } catch (erro) {
            Logger.error(
                `[MinhaAgendaAdapter] erro criarAgendamento: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem:
                    erro.message ||
                    'Erro ao criar agendamento.'
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

            const resultado =
                await consultarAtendimentoPorCliente(
                    page,
                    dadosNormalizados.cliente,
                    dadosNormalizados.telefone,
                    dadosNormalizados.horario,
                    dadosNormalizados.servico
                );

            await step(
                page,
                `A013-consultar-encontrado-${resultado.encontrado}`
            );

            if (!resultado.encontrado) {
                return {
                    status: 'AGENDAMENTO_NAO_ENCONTRADO',
                    mensagem:
                        'Nenhum agendamento encontrado.'
                };
            }

            if (resultado.multiplos) {
                return {
                    status: 'MULTIPLOS_AGENDAMENTOS',
                    atendimentos:
                        resultado.atendimentos
                };
            }

            return {
                status: 'AGENDAMENTO_ENCONTRADO',
                atendimento: resultado
            };
        } catch (erro) {
            Logger.error(
                `[MinhaAgendaAdapter] erro consultarAgendamento: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem:
                    erro.message ||
                    'Erro ao consultar agendamento.'
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

            const atendimento =
                await abrirAtendimentoPorCliente(
                    page,
                    dadosNormalizados.cliente,
                    dadosNormalizados.telefone,
                    dadosNormalizados.horario,
                    dadosNormalizados.servico
                );

            await step(
                page,
                `A016-cancelar-encontrado-${atendimento.encontrado}`
            );

            if (!atendimento.encontrado) {
                return {
                    status: 'AGENDAMENTO_NAO_ENCONTRADO',
                    mensagem:
                        'Nenhum agendamento encontrado.'
                };
            }

            if (atendimento.multiplos) {
                return {
                    status: 'MULTIPLOS_AGENDAMENTOS',
                    atendimentos:
                        atendimento.texto ||
                        atendimento.atendimentos
                };
            }

            await deletarAgendamento(page);

            await step(page, 'A017-cancelado');

            await step(
                page,
                'A017B-confirmacao-cancelamento-inicio'
            );

            await irParaData(
                page,
                dadosNormalizados.data
            );

            const confirmacaoCancelamento =
                await consultarAtendimentoPorCliente(
                    page,
                    dadosNormalizados.cliente,
                    dadosNormalizados.telefone,
                    dadosNormalizados.horario,
                    dadosNormalizados.servico
                );

            Logger.info(
                `[MinhaAgendaAdapter] Confirmação pós-cancelamento: ${JSON.stringify(confirmacaoCancelamento)}`
            );

            if (
                confirmacaoCancelamento.encontrado
            ) {
                await step(
                    page,
                    'A017C-cancelamento-nao-confirmado'
                );

                return {
                    status:
                        'ERRO_CANCELAMENTO_NAO_CONFIRMADO',
                    mensagem:
                        'O cancelamento foi executado, mas o agendamento ainda aparece na agenda.'
                };
            }

            await step(
                page,
                'A017D-cancelamento-confirmado'
            );

            return {
                status: 'AGENDAMENTO_CANCELADO',
                mensagem:
                    'Agendamento cancelado com sucesso.'
            };
        } catch (erro) {
            Logger.error(
                `[MinhaAgendaAdapter] erro cancelarAgendamento: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem:
                    erro.message ||
                    'Erro ao cancelar agendamento.'
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

            const atendimento =
                await abrirAtendimentoPorCliente(
                    page,
                    dadosNormalizados.cliente,
                    dadosNormalizados.telefone,
                    dadosNormalizados.horario,
                    dadosNormalizados.servico
                );

            await step(
                page,
                `A020-alterar-encontrado-${atendimento.encontrado}`
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
                    mensagem: 'Encontrei mais de um agendamento.',
                    atendimentos:
                        atendimento.texto ||
                        atendimento.atendimentos ||
                        []
                };
            }

            const horarioParaAlterar =
                dadosNormalizados.novo_horario ||
                dadosNormalizados.novoHorario ||
                '';

            const dataParaAlterar =
                dadosNormalizados.nova_data ||
                dadosNormalizados.novaData ||
                '';

            const horarioFinalParaValidar =
                horarioParaAlterar ||
                dadosNormalizados.horario;

            let servicoEfetivo = String(
                dadosNormalizados.servico || ''
            ).trim();

            if (!servicoEfetivo && atendimento.texto) {
                const linhasAtendimento = String(
                    atendimento.texto
                )
                    .split('\n')
                    .map(item => item.trim())
                    .filter(Boolean);

                const linhaServico = linhasAtendimento.find(
                    item =>
                        item.startsWith('-') ||
                        (
                            !item.includes(':') &&
                            item.toLowerCase() !==
                                String(
                                    dadosNormalizados.cliente
                                )
                                    .trim()
                                    .toLowerCase()
                        )
                );

                if (linhaServico) {
                    servicoEfetivo = linhaServico
                        .replace(/^-+\s*/, '')
                        .trim();
                }
            }

            Logger.info(
                `[MinhaAgendaAdapter] Serviço efetivo da alteração: ${servicoEfetivo}`
            );

            const duracaoServico =
                obterDuracaoDoServico(servicoEfetivo);

            if (duracaoServico === null) {
                await page.keyboard
                    .press('Escape')
                    .catch(() => {});

                return {
                    status: 'SERVICO_NAO_ENCONTRADO',
                    mensagem: servicoEfetivo
                        ? `O serviço "${servicoEfetivo}" não foi encontrado.`
                        : 'Não foi possível identificar o serviço do agendamento.'
                };
            }

            const inicioEmMinutos =
                horarioParaMinutos(
                    horarioFinalParaValidar
                );

            if (inicioEmMinutos === null) {
                await page.keyboard
                    .press('Escape')
                    .catch(() => {});

                return {
                    status: 'HORARIO_INVALIDO',
                    mensagem:
                        'O novo horário informado é inválido.'
                };
            }

            const fimEmMinutos =
                inicioEmMinutos + duracaoServico;

            if (
                !estaDentroDoHorarioFuncionamento(
                    inicioEmMinutos,
                    fimEmMinutos
                )
            ) {
                await page.keyboard
                    .press('Escape')
                    .catch(() => {});

                return {
                    status: 'FORA_DO_EXPEDIENTE',
                    mensagem:
                        `O atendimento iniciaria às ${horarioFinalParaValidar} ` +
                        'e terminaria fora do horário de funcionamento.'
                };
            }

            let houveAlteracao = false;

            if (horarioParaAlterar || dataParaAlterar) {
                const resultadoAlteracao =
                    await alterarHorarioAgendamento(
                        page,
                        horarioParaAlterar,
                        dataParaAlterar
                    );

                if (
                    resultadoAlteracao &&
                    resultadoAlteracao.status &&
                    resultadoAlteracao.status !== 'SALVO'
                ) {
                    return resultadoAlteracao;
                }

                await step(
                    page,
                    'A021-horario-alterado'
                );

                houveAlteracao = true;
            }

            if (dadosNormalizados.clienteNovo) {
                const clienteAlterado =
                    await selecionarOuCriarCliente(
                        page,
                        {
                            cliente:
                                dadosNormalizados.clienteNovo,
                            telefone:
                                dadosNormalizados.telefoneNovo ||
                                dadosNormalizados.telefone,
                            data:
                                dataParaAlterar ||
                                dadosNormalizados.data,
                            horario:
                                horarioParaAlterar ||
                                dadosNormalizados.horario
                        }
                    );

                await step(
                    page,
                    `A022-cliente-alterado-${clienteAlterado.status}`
                );

                if (
                    clienteAlterado.status !==
                        'CLIENTE_SELECIONADO' &&
                    clienteAlterado.status !==
                        'CLIENTE_CRIADO'
                ) {
                    return {
                        status: 'ERRO_CLIENTE',
                        mensagem:
                            'Não foi possível alterar o cliente do agendamento.',
                        detalhe: clienteAlterado
                    };
                }

                houveAlteracao = true;
            }

            if (!houveAlteracao) {
                return {
                    status: 'DADOS_INCOMPLETOS',
                    mensagem:
                        'Nenhuma alteração informada.'
                };
            }

            const dataFinal =
                dataParaAlterar ||
                dadosNormalizados.data;

            const horarioFinal =
                horarioParaAlterar ||
                dadosNormalizados.horario;

            await step(
                page,
                'A022-confirmacao-alteracao-inicio'
            );

            await irParaData(page, dataFinal);

            await step(
                page,
                'A023-confirmacao-alteracao-data'
            );

            const confirmacao =
                await consultarAtendimentoPorCliente(
                    page,
                    dadosNormalizados.cliente,
                    dadosNormalizados.telefone,
                    horarioFinal,
                    servicoEfetivo
                );

            Logger.info(
                `[MinhaAgendaAdapter] Confirmação pós-alteração: ${JSON.stringify(confirmacao)}`
            );

            if (!confirmacao.encontrado) {
                await irParaData(
                    page,
                    dadosNormalizados.data
                );

                await step(
                    page,
                    'A023B-verificar-origem-apos-falha-destino'
                );

                const atendimentoOriginal =
                    await consultarAtendimentoPorCliente(
                        page,
                        dadosNormalizados.cliente,
                        dadosNormalizados.telefone,
                        dadosNormalizados.horario,
                        servicoEfetivo
                    );

                Logger.info(
                    `[MinhaAgendaAdapter] Origem após falha no destino: ${JSON.stringify(atendimentoOriginal)}`
                );

                if (atendimentoOriginal.encontrado) {
                    return {
                        status: 'HORARIO_OCUPADO',
                        mensagem:
                            `O horário ${horarioFinal} já está ocupado.`
                    };
                }

                return {
                    status: 'ALTERACAO_NAO_CONFIRMADA',
                    mensagem:
                        'A alteração foi enviada, mas não foi possível confirmar o atendimento nem no horário novo nem no horário original.'
                };
            }

            const mudouData =
                dataFinal !== dadosNormalizados.data;

            const mudouHorario =
                horarioFinal !==
                dadosNormalizados.horario;

            if (
                (mudouData || mudouHorario) &&
                dadosNormalizados.horario
            ) {
                await irParaData(
                    page,
                    dadosNormalizados.data
                );

                await step(
                    page,
                    'A023B-verificar-origem-removida'
                );

                const atendimentoOriginal =
                    await consultarAtendimentoPorCliente(
                        page,
                        dadosNormalizados.cliente,
                        dadosNormalizados.telefone,
                        dadosNormalizados.horario,
                        servicoEfetivo
                    );

                Logger.info(
                    `[MinhaAgendaAdapter] Verificação do atendimento original: ${JSON.stringify(atendimentoOriginal)}`
                );

                if (atendimentoOriginal.encontrado) {
                    return {
                        status: 'HORARIO_OCUPADO',
                        mensagem:
                            `O horário ${horarioFinal} já está ocupado.`
                    };
                }
            }

            await step(
                page,
                'A024-alteracao-finalizada'
            );

            return {
                status: 'AGENDAMENTO_ALTERADO',
                mensagem: 'Agendamento alterado com sucesso.',
                atendimento: confirmacao
            };
        } catch (erro) {
            Logger.error(
                `[MinhaAgendaAdapter] erro alterarAgendamento: ${erro.message}`
            );

            return {
                status: 'ERRO',
                mensagem:
                    erro.message ||
                    'Erro ao alterar agendamento.'
            };
        }
    }
}

module.exports = new MinhaAgendaAdapter();