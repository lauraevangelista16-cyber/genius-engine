class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    get(sessionId) {
        if (!sessionId) {
            throw new Error('sessionId é obrigatório.');
        }

        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                action: null,
                dados: {},
                etapa: null,
                atualizadoEm: new Date()
            });
        }

        return this.sessions.get(sessionId);
    }

    update(sessionId, novosDados = {}) {
        const session = this.get(sessionId);

        session.action = novosDados.action || session.action;

        session.dados = {
            ...session.dados,
            ...(novosDados.dados || {})
        };

        session.etapa = novosDados.etapa || session.etapa;
        session.atualizadoEm = new Date();

        this.sessions.set(sessionId, session);

        return session;
    }

    clear(sessionId) {
        this.sessions.delete(sessionId);

        return {
            success: true,
            mensagem: 'Sessão limpa com sucesso.'
        };
    }

    getDados(sessionId) {
        return this.get(sessionId).dados;
    }
}

module.exports = new SessionManager();