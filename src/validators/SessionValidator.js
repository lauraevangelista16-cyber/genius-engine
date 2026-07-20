class SessionValidator {
    static validar(sessao = {}) {
        const action = String(
            sessao.action || 'indefinido'
        ).trim();

        const dados =
            sessao.dados &&
            typeof sessao.dados === 'object' &&
            !Array.isArray(sessao.dados)
                ? sessao.dados
                : {};

        const agendamentoParaTerceiro =
            action === 'criar' &&
            dados.agendamento_para_terceiro === true;

        const obrigatorios = {
            criar: agendamentoParaTerceiro
                ? [
                    'cliente',
                    'telefone',
                    'servico',
                    'data',
                    'horario'
                ]
                : [
                    'cliente',
                    'servico',
                    'data',
                    'horario'
                ],

            consultar: [],

            consultar_com_data: [
                'data'
            ],

            cancelar: [],

            alterar: [
                'data',
                'novo_horario'
            ],

            horarios: [
                'servico',
                'data'
            ]
        };

        const perguntas = {
            cliente:
                'Para quem será o atendimento?',

            telefone:
                dados.cliente
                    ? `Qual é o telefone de ${dados.cliente}?`
                    : 'Qual é o telefone da pessoa que será atendida?',

            servico:
                'Qual serviço você deseja?',

            data:
                'Qual é a data do atendimento?',

            horario:
                'Qual horário você deseja?',

            novo_horario:
                'Qual é o novo horário desejado?',

            nova_data:
                'Qual é a nova data desejada?'
        };

        const etapas = {
            action:
                'AGUARDANDO_ACAO',

            cliente:
                'AGUARDANDO_CLIENTE',

            telefone:
                'AGUARDANDO_TELEFONE',

            servico:
                'AGUARDANDO_SERVICO',

            data:
                'AGUARDANDO_DATA',

            horario:
                'AGUARDANDO_HORARIO',

            novo_horario:
                'AGUARDANDO_NOVO_HORARIO',

            nova_data:
                'AGUARDANDO_NOVA_DATA'
        };

        if (
            !action ||
            action === 'indefinido'
        ) {
            return {
                etapa:
                    etapas.action,

                validacao: {
                    ok: false,
                    campo: 'action',
                    mensagem:
                        'Não consegui identificar o que você deseja fazer.'
                }
            };
        }

        if (
            !Object.prototype.hasOwnProperty.call(
                obrigatorios,
                action
            )
        ) {
            return {
                etapa:
                    etapas.action,

                validacao: {
                    ok: false,
                    campo: 'action',
                    mensagem:
                        'Não consegui identificar o que você deseja fazer.'
                }
            };
        }

        const campos =
            obrigatorios[action];

        for (const campo of campos) {
            const valor =
                dados[campo];

            if (
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ''
            ) {
                return {
                    etapa:
                        etapas[campo],

                    validacao: {
                        ok: false,
                        campo,
                        mensagem:
                            perguntas[campo]
                    }
                };
            }
        }

        return {
            etapa:
                'PRONTO_PARA_EXECUTAR',

            validacao: {
                ok: true,
                campo: null,
                mensagem: null
            }
        };
    }
}

module.exports = SessionValidator;
