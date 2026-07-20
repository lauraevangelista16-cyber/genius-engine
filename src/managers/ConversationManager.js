const SessionManager = require('./SessionManager');
const SessionValidator = require('../validators/SessionValidator');

class ConversationManager {
    constructor() {
        this.etapasPendentes = [
            'AGUARDANDO_ACAO',
            'AGUARDANDO_CLIENTE',
            'AGUARDANDO_TELEFONE',
            'AGUARDANDO_SERVICO',
            'AGUARDANDO_DATA',
            'AGUARDANDO_HORARIO',
            'AGUARDANDO_NOVO_HORARIO',
            'AGUARDANDO_NOVA_DATA',
            'AGUARDANDO_CONFIRMACAO'
        ];
    }

    possuiEtapaPendente(etapa) {
        return this.etapasPendentes.includes(etapa);
    }

 respostaPositiva(texto = '') {
    const resposta = String(texto || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const possuiEmojiPositivo =
        /👍(?:🏻|🏼|🏽|🏾|🏿)?/u.test(
            resposta
        );

    const semEmoji = resposta
        .replace(
            /👍(?:🏻|🏼|🏽|🏾|🏿)?/gu,
            ''
        )
        .trim();

    return (
        possuiEmojiPositivo ||
        [
            'sim',
            's',
            'ok',
            'confirmo',
            'confirmar',
            'pode confirmar',
            'pode',
            'correto'
        ].includes(semEmoji)
    );
}

respostaNegativa(texto = '') {
    const resposta = String(texto || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const possuiEmojiNegativo =
        /👎(?:🏻|🏼|🏽|🏾|🏿)?/u.test(
            resposta
        );

    const semEmoji = resposta
        .replace(
            /👎(?:🏻|🏼|🏽|🏾|🏿)?/gu,
            ''
        )
        .trim();

    return (
        possuiEmojiNegativo ||
        [
            'nao',
            'n',
            'nao confirmo',
            'desistir',
            'desisto'
        ].includes(semEmoji)
    );
}

exigeConfirmacao(action) {
    const actionNormalizada =
        action === 'reagendar'
            ? 'alterar'
            : action;

    return [
        'criar',
        'alterar',
        'cancelar'
    ].includes(actionNormalizada);
}

montarMensagemConfirmacao(action, dados = {}) {
    const actionNormalizada =
        action === 'reagendar'
            ? 'alterar'
            : action;

    const cliente =
        dados.cliente || 'cliente informado';

    const servico =
        dados.servico || null;

    const data =
        dados.data || null;

    const horario =
        dados.horario || null;

    const novaData =
        dados.nova_data || null;

    const novoHorario =
        dados.novo_horario || null;

    if (actionNormalizada === 'criar') {
        return [
            'Confirma a criação deste agendamento?',
            `Cliente: ${cliente}`,
            servico
                ? `Serviço: ${servico}`
                : null,
            data
                ? `Data: ${data}`
                : null,
            horario
                ? `Horário: ${horario}`
                : null,
            'Responda sim ou não.'
        ]
            .filter(Boolean)
            .join('\n');
    }

    if (actionNormalizada === 'alterar') {
        return [
            'Confirma a alteração deste agendamento?',
            `Cliente: ${cliente}`,
            servico
                ? `Serviço: ${servico}`
                : null,
            data
                ? `Data atual: ${data}`
                : null,
            horario
                ? `Horário atual: ${horario}`
                : null,
            novaData
                ? `Nova data: ${novaData}`
                : null,
            novoHorario
                ? `Novo horário: ${novoHorario}`
                : null,
            'Responda sim ou não.'
        ]
            .filter(Boolean)
            .join('\n');
    }

    if (actionNormalizada === 'cancelar') {
        return [
            'Confirma o cancelamento deste agendamento?',
            `Cliente: ${cliente}`,
            servico
                ? `Serviço: ${servico}`
                : null,
            data
                ? `Data: ${data}`
                : null,
            horario
                ? `Horário: ${horario}`
                : null,
            'Responda sim ou não.'
        ]
            .filter(Boolean)
            .join('\n');
    }

    return null;
}

async aplicarConfirmacaoAposValidacao({
    sessionId,
    sessao,
    resultadoValidacao
}) {
    const dadosCompletos =
        resultadoValidacao &&
        resultadoValidacao.etapa ===
            'PRONTO_PARA_EXECUTAR';

    if (
        !dadosCompletos ||
        !this.exigeConfirmacao(sessao.action)
    ) {
        return {
            sessaoFinal:
                await SessionManager.update(
                    sessionId,
                    {
                        etapa:
                            resultadoValidacao.etapa
                    }
                ),
            resultadoValidacao
        };
    }

    const mensagemConfirmacao =
        this.montarMensagemConfirmacao(
            sessao.action,
            sessao.dados || {}
        );

    const sessaoFinal =
        await SessionManager.update(
            sessionId,
            {
                etapa:
                    'AGUARDANDO_CONFIRMACAO',
                confirmacao: {
                    pendente: true,
                    action: sessao.action,
                    mensagem:
                        mensagemConfirmacao
                }
            }
        );

    return {
        sessaoFinal,
        resultadoValidacao: {
            etapa:
                'AGUARDANDO_CONFIRMACAO',
            validacao: {
                ok: false,
                campo: 'confirmacao',
                mensagem:
                    mensagemConfirmacao
            }
        }
    };
}

identificarAcaoExplicita(mensagem = '') {
        const texto = String(
            mensagem || ''
        )
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (!texto) {
            return null;
        }

        /*
         * Consulta de horários deve ser identificada
         * antes da consulta de agendamentos.
         */
        if (
            /\b(horarios?|disponibilidade)\b/.test(
                texto
            )
        ) {
            return 'horarios';
        }

        if (
            /\b(cancelar|desmarcar|excluir)\b/.test(
                texto
            )
        ) {
            return 'cancelar';
        }

        if (
            /\b(alterar|reagendar|remarcar)\b/.test(
                texto
            )
        ) {
            return 'alterar';
        }

        if (
            /\b(consultar|buscar|procurar)\b/.test(
                texto
            ) ||
            /\b(ver|visualizar)\b.*\b(agendamento|atendimento|agenda)\b/.test(
                texto
            ) ||
            /\b(meus?|minhas?)\s+(agendamentos?|atendimentos?)\b/.test(
                texto
            )
        ) {
            return 'consultar';
        }

        if (
            /\b(agendar|marcar|criar)\b/.test(
                texto
            )
        ) {
            return 'criar';
        }

        return null;
    }

    normalizarHorario(mensagem = '') {
        const texto = String(mensagem)
            .trim()
            .toLowerCase();

        if (!texto) {
            return null;
        }

        const match = texto.match(
            /\b([01]?\d|2[0-3])(?:\s*(?:h|:|horas?)\s*(\d{1,2})?)?\b/
        );

        if (!match) {
            return null;
        }

        const hora = Number(match[1]);

        const minuto = match[2]
            ? Number(match[2])
            : 0;

        if (
            Number.isNaN(hora) ||
            Number.isNaN(minuto) ||
            hora < 0 ||
            hora > 23 ||
            minuto < 0 ||
            minuto > 59
        ) {
            return null;
        }

        return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
    }

    normalizarData(mensagem = '') {
        const texto = String(mensagem)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (!texto) {
            return null;
        }

        const hoje = new Date();

        hoje.setHours(0, 0, 0, 0);

        /*
         * amanhã
         */
        if (
            texto === 'amanha' ||
            texto.includes('amanha')
        ) {
            const data = new Date(hoje);

            data.setDate(
                data.getDate() + 1
            );

            return this.formatarDataISO(data);
        }

        /*
         * hoje
         */
        if (
            texto === 'hoje' ||
            texto.includes('hoje')
        ) {
            return this.formatarDataISO(hoje);
        }

        /*
         * Formatos:
         * 20/07
         * 20/07/2026
         */
        const formatoNumerico = texto.match(
            /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/
        );

        if (formatoNumerico) {
            const dia = Number(
                formatoNumerico[1]
            );

            const mes = Number(
                formatoNumerico[2]
            );

            const ano = formatoNumerico[3]
                ? Number(formatoNumerico[3])
                : hoje.getFullYear();

            const data = new Date(
                ano,
                mes - 1,
                dia
            );

            const dataValida =
                data.getFullYear() === ano &&
                data.getMonth() === mes - 1 &&
                data.getDate() === dia;

            if (!dataValida) {
                return null;
            }

            return this.formatarDataISO(data);
        }

        /*
         * Dias da semana.
         * Retorna a próxima ocorrência futura.
         */
        const diasSemana = {
            domingo: 0,
            segunda: 1,
            'segunda-feira': 1,
            terca: 2,
            'terca-feira': 2,
            quarta: 3,
            'quarta-feira': 3,
            quinta: 4,
            'quinta-feira': 4,
            sexta: 5,
            'sexta-feira': 5,
            sabado: 6
        };

        const diaSemana =
            Object.keys(diasSemana).find(
                dia => texto.includes(dia)
            );

        if (diaSemana) {
            const destino =
                diasSemana[diaSemana];

            const atual =
                hoje.getDay();

            let diferenca =
                (destino - atual + 7) % 7;

            /*
             * Se o usuário disser o mesmo dia da semana,
             * assume a próxima semana.
             */
            if (diferenca === 0) {
                diferenca = 7;
            }

            const data = new Date(hoje);

            data.setDate(
                data.getDate() + diferenca
            );

            return this.formatarDataISO(data);
        }

        return null;
    }

    formatarDataISO(data) {
        const ano =
            data.getFullYear();

        const mes =
            String(
                data.getMonth() + 1
            ).padStart(2, '0');

        const dia =
            String(
                data.getDate()
            ).padStart(2, '0');

        return `${ano}-${mes}-${dia}`;
    }

    normalizarTelefone(mensagem = '') {
        const telefone = String(mensagem)
            .replace(/\D/g, '')
            .trim();

        if (!telefone) {
            return null;
        }

        /*
         * Aceita telefone com DDD e também telefone
         * contendo o código do país.
         *
         * Exemplos:
         * 75999999999
         * 5575999999999
         */
        if (
            telefone.length < 10 ||
            telefone.length > 13
        ) {
            return null;
        }

        return telefone;
    }

    async atualizarDadosEValidar({
        sessionId,
        sessao,
        campo,
        valor
    }) {
        /*
         * Os dados anteriores são preservados explicitamente.
         *
         * Isso evita que uma implementação de update com merge
         * superficial apague os campos coletados anteriormente.
         */
        const sessaoAtualizada =
            await SessionManager.update(
                sessionId,
                {
                    dados: {
                        ...(
                            sessao.dados ||
                            {}
                        ),
                        [campo]: valor
                    }
                }
            );

        const resultadoValidacao =
            SessionValidator.validar(
                sessaoAtualizada
            );

      const resultadoConfirmacao =
    await this.aplicarConfirmacaoAposValidacao({
        sessionId,
        sessao: sessaoAtualizada,
        resultadoValidacao
    });

    const sessaoFinal =
    resultadoConfirmacao.sessaoFinal;

    const resultadoFinal =
    resultadoConfirmacao.resultadoValidacao;

        return {
            sessaoAtualizada,
            sessaoFinal,
            resultadoValidacao:
            resultadoFinal
        };
    }

    montarRetornoValidacaoInvalida({
        sessionId,
        mensagem,
        sessao,
        campo,
        textoValidacao
    }) {
        return {
            tipo: 'agenda',
            continuarSessao: true,
            usarInterpretador: false,
            telefoneWhatsApp: sessionId,
            mensagem,
            action: sessao.action || null,
            etapa: sessao.etapa || null,
            dados: sessao.dados || {},
            validacao: {
                ok: false,
                campo,
                mensagem: textoValidacao
            }
        };
    }

    montarRetornoSessaoAtualizada({
        sessionId,
        mensagem,
        sessaoAtualizada,
        sessaoFinal,
        resultadoValidacao
    }) {
        return {
            tipo: 'agenda',
            continuarSessao: true,
            usarInterpretador: false,
            telefoneWhatsApp: sessionId,
            mensagem,
            action:
                sessaoFinal.action ||
                sessaoAtualizada.action ||
                null,
            etapa:
                sessaoFinal.etapa ||
                null,
            dados:
                sessaoFinal.dados ||
                sessaoAtualizada.dados ||
                {},
            validacao:
                resultadoValidacao.validacao
        };
    }

    async analisarEntrada({
        telefoneWhatsApp,
        mensagem = ''
    } = {}) {
        if (!telefoneWhatsApp) {
            throw new Error(
                'telefoneWhatsApp é obrigatório para analisar a conversa.'
            );
        }

        const sessionId = String(
            telefoneWhatsApp
        ).trim();

        const mensagemNormalizada = String(
            mensagem || ''
        ).trim();

        const sessao =
            await SessionManager.get(
                sessionId
            ) || {};

        const continuarSessao =
            this.possuiEtapaPendente(
                sessao.etapa
            );

        /*
         * Não existe etapa pendente.
         * A mensagem deve seguir para o Genius Interpretador.
         */
        if (!continuarSessao) {
            return {
                tipo: 'agenda',
                continuarSessao: false,
                usarInterpretador: true,
                telefoneWhatsApp: sessionId,
                mensagem: mensagemNormalizada,
                action: sessao.action || null,
                etapa: sessao.etapa || null,
                dados: sessao.dados || {}
            };
        }

        /*
         * Existe etapa pendente de ação.
         *
         * A identificação da intenção deve continuar sendo
         * responsabilidade do Genius Interpretador.
         */
        if (sessao.etapa === 'AGUARDANDO_ACAO') {
            return {
                tipo: 'agenda',
                continuarSessao: true,
                usarInterpretador: true,
                telefoneWhatsApp: sessionId,
                mensagem: mensagemNormalizada,
                action: sessao.action || null,
                etapa: sessao.etapa,
                dados: sessao.dados || {}
            };
        }

        /*
         * Existe uma etapa de coleta pendente, mas o usuário
         * informou explicitamente uma ação diferente.
         *
         * Nesse caso, o fluxo anterior é encerrado e a mensagem
         * volta ao Genius Interpretador como uma nova intenção.
         */
        const acaoExplicita =
            this.identificarAcaoExplicita(
                mensagemNormalizada
            );

        const actionAtual =
            sessao.action === 'reagendar'
                ? 'alterar'
                : sessao.action === 'consultar_com_data'
                    ? 'consultar'
                    : sessao.action;

        if (
            acaoExplicita &&
            acaoExplicita !== actionAtual
        ) {
            const sessaoResetada =
                await SessionManager.resetFluxo(
                    sessionId
                );

            console.log(
                '[CONVERSATION] Nova intenção detectada durante fluxo pendente:',
                {
                    actionAnterior:
                        sessao.action || null,
                    novaAcao:
                        acaoExplicita,
                    etapaAnterior:
                        sessao.etapa || null
                }
            );

            return {
                tipo: 'agenda',
                continuarSessao: false,
                usarInterpretador: true,
                telefoneWhatsApp: sessionId,
                mensagem: mensagemNormalizada,
                action:
                    sessaoResetada.action ||
                    null,
                etapa:
                    sessaoResetada.etapa ||
                    null,
                dados:
                    sessaoResetada.dados ||
                    {}
            };
        }
 /*
 * Existe uma confirmação pendente antes da execução
 * de uma operação modificadora.
 */
if (
    sessao.etapa ===
    'AGUARDANDO_CONFIRMACAO'
) {
    if (
        this.respostaPositiva(
            mensagemNormalizada
        )
    ) {
        const sessaoConfirmada =
            await SessionManager.update(
                sessionId,
                {
                    etapa:
                        'PRONTO_PARA_EXECUTAR',
                    confirmacao: null
                }
            );

        console.log(
            '[CONVERSATION] Operação confirmada pelo usuário:',
            {
                action:
                    sessaoConfirmada.action ||
                    null,
                etapa:
                    sessaoConfirmada.etapa
            }
        );

        return {
            tipo: 'agenda',
            continuarSessao: true,
            usarInterpretador: false,
            telefoneWhatsApp: sessionId,
            mensagem: mensagemNormalizada,
            action:
                sessaoConfirmada.action ||
                null,
            etapa:
                sessaoConfirmada.etapa,
            dados:
                sessaoConfirmada.dados ||
                {},
            validacao: {
                ok: true,
                campo: null,
                mensagem: null
            }
        };
    }

    if (
        this.respostaNegativa(
            mensagemNormalizada
        )
    ) {
        const actionCancelada =
            sessao.action || null;

        const sessaoResetada =
            await SessionManager.resetFluxo(
                sessionId
            );

        console.log(
            '[CONVERSATION] Operação não confirmada pelo usuário:',
            {
                action:
                    actionCancelada
            }
        );

        return {
            tipo: 'agenda',
            continuarSessao: true,
            usarInterpretador: false,
            telefoneWhatsApp: sessionId,
            mensagem: mensagemNormalizada,
            action:
                sessaoResetada.action ||
                null,
            etapa:
                sessaoResetada.etapa ||
                null,
            dados:
                sessaoResetada.dados ||
                {},
            validacao: {
                ok: false,
                campo: 'confirmacao',
                mensagem:
                    'Tudo bem. A operação foi cancelada e nenhuma alteração foi realizada.'
            }
        };
    }

    return {
        tipo: 'agenda',
        continuarSessao: true,
        usarInterpretador: false,
        telefoneWhatsApp: sessionId,
        mensagem: mensagemNormalizada,
        action: sessao.action || null,
        etapa: sessao.etapa,
        dados: sessao.dados || {},
        validacao: {
            ok: false,
            campo: 'confirmacao',
            mensagem:
                'Não consegui entender a resposta. Confirme respondendo sim ou não.'
        }
    };
}

        /*
         * Existe etapa pendente de cliente.
         */
        if (sessao.etapa === 'AGUARDANDO_CLIENTE') {
            const cliente = mensagemNormalizada;

            if (!cliente) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'cliente',
                    textoValidacao:
                        'Informe o nome do cliente para continuar.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'cliente',
                    valor: cliente
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Existe etapa pendente de telefone.
         */
        if (sessao.etapa === 'AGUARDANDO_TELEFONE') {
            const telefone =
                this.normalizarTelefone(
                    mensagemNormalizada
                );

            if (!telefone) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'telefone',
                    textoValidacao:
                        'Não consegui entender o telefone. Informe o número com DDD, por exemplo, 75999999999.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'telefone',
                    valor: telefone
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Existe etapa pendente de serviço.
         */
        if (sessao.etapa === 'AGUARDANDO_SERVICO') {
            const servico = mensagemNormalizada;

            if (!servico) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'servico',
                    textoValidacao:
                        'Informe o serviço desejado para continuar.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'servico',
                    valor: servico
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Existe etapa pendente de data.
         */
        if (sessao.etapa === 'AGUARDANDO_DATA') {
            const data =
                this.normalizarData(
                    mensagemNormalizada
                );

            if (!data) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'data',
                    textoValidacao:
                        'Não consegui entender a data. Informe, por exemplo, amanhã, terça-feira ou 20/07.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'data',
                    valor: data
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Existe etapa pendente de horário.
         * A mensagem será interpretada diretamente como horário.
         */
        if (sessao.etapa === 'AGUARDANDO_HORARIO') {
            const horario =
                this.normalizarHorario(
                    mensagemNormalizada
                );

            if (!horario) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'horario',
                    textoValidacao:
                        'Não consegui entender o horário. Informe, por exemplo, 10h ou 10:30.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'horario',
                    valor: horario
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Existe etapa pendente de novo horário.
         */
        if (
            sessao.etapa ===
            'AGUARDANDO_NOVO_HORARIO'
        ) {
            const novoHorario =
                this.normalizarHorario(
                    mensagemNormalizada
                );

            if (!novoHorario) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'novo_horario',
                    textoValidacao:
                        'Não consegui entender o novo horário. Informe, por exemplo, 14h ou 14:30.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'novo_horario',
                    valor: novoHorario
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Existe etapa pendente de nova data.
         */
        if (
            sessao.etapa ===
            'AGUARDANDO_NOVA_DATA'
        ) {
            const novaData =
                this.normalizarData(
                    mensagemNormalizada
                );

            if (!novaData) {
                return this.montarRetornoValidacaoInvalida({
                    sessionId,
                    mensagem: mensagemNormalizada,
                    sessao,
                    campo: 'nova_data',
                    textoValidacao:
                        'Não consegui entender a nova data. Informe, por exemplo, amanhã, terça-feira ou 20/07.'
                });
            }

            const resultado =
                await this.atualizarDadosEValidar({
                    sessionId,
                    sessao,
                    campo: 'nova_data',
                    valor: novaData
                });

            return this.montarRetornoSessaoAtualizada({
                sessionId,
                mensagem: mensagemNormalizada,
                ...resultado
            });
        }

        /*
         * Proteção para uma eventual etapa registrada
         * como pendente, mas sem tratamento implementado.
         */
        return {
            tipo: 'agenda',
            continuarSessao: true,
            usarInterpretador: false,
            telefoneWhatsApp: sessionId,
            mensagem: mensagemNormalizada,
            action: sessao.action || null,
            etapa: sessao.etapa || null,
            dados: sessao.dados || {},
            validacao: {
                ok: false,
                campo: null,
                mensagem:
                    'A conversa possui uma etapa pendente que ainda não foi implementada.'
            }
        };
    }
}

module.exports = new ConversationManager();
