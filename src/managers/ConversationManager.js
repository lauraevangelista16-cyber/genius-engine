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
            'AGUARDANDO_NOVA_DATA'
        ];
    }

    possuiEtapaPendente(etapa) {
        return this.etapasPendentes.includes(etapa);
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

        const sessao = await SessionManager.get(
            sessionId
        );

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
         * Existe etapa pendente de horário.
         * A mensagem será interpretada diretamente como horário.
         */
        if (sessao.etapa === 'AGUARDANDO_HORARIO') {
            const horario =
                this.normalizarHorario(
                    mensagemNormalizada
                );

            if (!horario) {
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
                        campo: 'horario',
                        mensagem:
                            'Não consegui entender o horário. Informe, por exemplo, 10h ou 10:30.'
                    }
                };
            }

            const sessaoAtualizada =
                await SessionManager.update(
                    sessionId,
                    {
                        dados: {
                            horario
                        }
                    }
                );

            const resultadoValidacao =
                SessionValidator.validar(
                    sessaoAtualizada
                );

            const sessaoFinal =
                await SessionManager.update(
                    sessionId,
                    {
                        etapa:
                            resultadoValidacao.etapa
                    }
                );

            return {
                tipo: 'agenda',
                continuarSessao: true,
                usarInterpretador: false,
                telefoneWhatsApp: sessionId,
                mensagem: mensagemNormalizada,
                action:
                    sessaoFinal.action ||
                    sessaoAtualizada.action ||
                    null,
                etapa:
                    sessaoFinal.etapa,
                dados:
                    sessaoFinal.dados || {},
                validacao:
                    resultadoValidacao.validacao
            };
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
                campo: 'data',
                mensagem:
                    'Não consegui entender a data. Informe, por exemplo, amanhã, terça-feira ou 20/07.'
            }
        };
    }

    const sessaoAtualizada =
        await SessionManager.update(
            sessionId,
            {
                dados: {
                    data
                }
            }
        );

    const resultadoValidacao =
        SessionValidator.validar(
            sessaoAtualizada
        );

    const sessaoFinal =
        await SessionManager.update(
            sessionId,
            {
                etapa:
                    resultadoValidacao.etapa
            }
        );

    return {
        tipo: 'agenda',
        continuarSessao: true,
        usarInterpretador: false,
        telefoneWhatsApp: sessionId,
        mensagem: mensagemNormalizada,
        action:
            sessaoFinal.action ||
            sessaoAtualizada.action ||
            null,
        etapa:
            sessaoFinal.etapa,
        dados:
            sessaoFinal.dados || {},
        validacao:
            resultadoValidacao.validacao
    };
}

        /*
         * Outras etapas ainda serão implementadas.
         * Por enquanto, o fluxo não deve cair na IA.
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