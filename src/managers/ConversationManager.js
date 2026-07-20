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