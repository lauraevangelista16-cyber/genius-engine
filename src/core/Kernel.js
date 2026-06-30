class Kernel {
    constructor() {
        this.engines = {};
    }

    registrar(nome, engine) {
        this.engines[nome] = engine;
    }

    async execute(engine, action, dados) {
        const instancia = this.engines[engine];

        if (!instancia) {
            throw new Error(`Engine "${engine}" não encontrada.`);
        }

        return await instancia.execute(action, dados);
    }
}

module.exports = new Kernel();