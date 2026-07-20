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

    /**
     * Remove somente valores que não devem sobrescrever
     * informações válidas já armazenadas na sessão.
     *
     * São ignorados:
     * - undefined
     * - null
     * - strings vazias
     * - strings contendo apenas espaços
     *
     * Valores como 0, false, arrays e objetos são preservados.
     */
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