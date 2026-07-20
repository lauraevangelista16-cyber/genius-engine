const RedisAdapter = require('../adapters/redis/RedisAdapter');

const SESSION_TTL_SECONDS = Number(
    process.env.SESSION_TTL_SECONDS || 60 * 60 * 24
);

class SessionManager {
    gerarChave(sessionId) {
        if (!sessionId) {
            throw new Error('sessionId é obrigatório.');
        }

        return `genius:session:${sessionId}`;
    }

    criarSessaoPadrao(sessionId) {
        const agora = new Date().toISOString();

        return {
            sessionId,
            estado: 'BOT_ATIVO',
            action: null,
            dados: {},
            etapa: null,
            confirmacao: null,
            tentativas: {
                interpretacao: 0,
                engine: 0
            },
            criadaEm: agora,
            atualizadoEm: agora
        };
    }

    filtrarDadosPreenchidos(dados = {}) {
        if (
            !dados ||
            typeof dados !== 'object' ||
            Array.isArray(dados)
        ) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(dados).filter(([, valor]) => {
                if (
                    valor === undefined ||
                    valor === null
                ) {
                    return false;
                }

                if (
                    typeof valor === 'string' &&
                    !valor.trim()
                ) {
                    return false;
                }

                return true;
            })
        );
    }

    async get(sessionId) {
        const chave = this.gerarChave(sessionId);
        const valor = await RedisAdapter.get(chave);

        if (!valor) {
            const sessao =
                this.criarSessaoPadrao(sessionId);

            await RedisAdapter.set(
                chave,
                JSON.stringify(sessao),
                SESSION_TTL_SECONDS
            );

            return sessao;
        }

        return JSON.parse(valor);
    }

    async update(sessionId, novosDados = {}) {
        const chave = this.gerarChave(sessionId);
        const sessaoAtual = await this.get(sessionId);

        const dadosRecebidos =
            this.filtrarDadosPreenchidos(
                novosDados.dados
            );

        const tentativasRecebidas =
            novosDados.tentativas &&
            typeof novosDados.tentativas === 'object'
                ? novosDados.tentativas
                : {};

        const sessaoAtualizada = {
            ...sessaoAtual,
            ...novosDados,

            dados: {
                ...sessaoAtual.dados,
                ...dadosRecebidos
            },

            tentativas: {
                ...sessaoAtual.tentativas,
                ...tentativasRecebidas
            },

            atualizadoEm: new Date().toISOString()
        };

        await RedisAdapter.set(
            chave,
            JSON.stringify(sessaoAtualizada),
            SESSION_TTL_SECONDS
        );

        return sessaoAtualizada;
    }

    /**
     * Limpa somente os dados relacionados ao fluxo atual.
     *
     * Preserva:
     * - sessionId
     * - estado do bot
     * - data de criação da sessão
     *
     * Limpa:
     * - action
     * - dados
     * - etapa
     * - confirmação
     * - tentativas
     */
    async resetFluxo(sessionId) {
        const chave = this.gerarChave(sessionId);
        const sessaoAtual = await this.get(sessionId);

        const sessaoResetada = {
            ...sessaoAtual,

            action: null,
            dados: {},
            etapa: null,
            confirmacao: null,

            tentativas: {
                interpretacao: 0,
                engine: 0
            },

            atualizadoEm: new Date().toISOString()
        };

        await RedisAdapter.set(
            chave,
            JSON.stringify(sessaoResetada),
            SESSION_TTL_SECONDS
        );

        return sessaoResetada;
    }

    /**
     * Aplica as instruções de memória enviadas pela Engine.
     *
     * Exemplos:
     *
     * Atualização:
     * {
     *   reset: false,
     *   action: 'criar',
     *   etapa: 'AGUARDANDO_HORARIO',
     *   dados: {
     *     servico: 'unha',
     *     data: '2026-07-20'
     *   }
     * }
     *
     * Reset:
     * {
     *   reset: true
     * }
     */
    async apply(sessionId, instrucoes = {}) {
        if (
            !instrucoes ||
            typeof instrucoes !== 'object' ||
            Array.isArray(instrucoes)
        ) {
            throw new Error(
                'Instruções de memória inválidas.'
            );
        }

        if (instrucoes.reset === true) {
            return this.resetFluxo(sessionId);
        }

        const atualizacao = {};

        if (
            Object.prototype.hasOwnProperty.call(
                instrucoes,
                'action'
            )
        ) {
            atualizacao.action = instrucoes.action;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                instrucoes,
                'etapa'
            )
        ) {
            atualizacao.etapa = instrucoes.etapa;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                instrucoes,
                'confirmacao'
            )
        ) {
            atualizacao.confirmacao =
                instrucoes.confirmacao;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                instrucoes,
                'estado'
            )
        ) {
            atualizacao.estado = instrucoes.estado;
        }

        if (
            instrucoes.dados &&
            typeof instrucoes.dados === 'object' &&
            !Array.isArray(instrucoes.dados)
        ) {
            atualizacao.dados = instrucoes.dados;
        }

        if (
            instrucoes.tentativas &&
            typeof instrucoes.tentativas === 'object' &&
            !Array.isArray(instrucoes.tentativas)
        ) {
            atualizacao.tentativas =
                instrucoes.tentativas;
        }

        if (Object.keys(atualizacao).length === 0) {
            return this.get(sessionId);
        }

        return this.update(
            sessionId,
            atualizacao
        );
    }

    async clear(sessionId) {
        const chave = this.gerarChave(sessionId);

        await RedisAdapter.del(chave);

        return {
            success: true,
            mensagem: 'Sessão limpa com sucesso.'
        };
    }

    async getDados(sessionId) {
        const sessao = await this.get(sessionId);

        return sessao.dados;
    }

    async setEstado(sessionId, estado) {
        const estadosValidos = [
            'BOT_ATIVO',
            'HUMANO_ATIVO',
            'PAUSADO',
            'ERRO_BLOQUEADO'
        ];

        if (!estadosValidos.includes(estado)) {
            throw new Error(
                `Estado de sessão inválido: ${estado}`
            );
        }

        return this.update(
            sessionId,
            {
                estado
            }
        );
    }
}

module.exports = new SessionManager();