class SessionValidator {

    static validar(sessao = {}) {

        const action = sessao.action || 'indefinido';

        const dados = sessao.dados || {};

        const obrigatorios = {

            criar: [
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
                'Qual é o telefone da pessoa que será atendida?',

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

        const campos =
            obrigatorios[action] || [];

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

                ok: true
            }

        };

    }

}

module.exports = SessionValidator;