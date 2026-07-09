class CommandValidator {

    agenda(action, dados = {}) {

        switch (action) {

            case 'criar':
                return this.criar(dados);

            case 'cadastrar_cliente':
                return this.cadastrarCliente(dados);

            case 'consultar':
                return this.buscar(dados);

             case 'consultar_com_data':
                return this.buscar(dados);

            case 'cancelar':
                return this.buscar(dados);

            case 'alterar':
                return this.alterar(dados);

            case 'reagendar':
                return this.reagendar(dados);

            case 'horarios':
                return this.horarios(dados);

            default:
                throw new Error(`Ação "${action}" não existe.`);
        }

    }

    validarTelefone(telefone) {
        const numero = String(telefone || '').replace(/\D/g, '');

        if (!numero) {
            throw new Error('Telefone obrigatório.');
        }

        if (!/^\d{10,11}$/.test(numero)) {
            throw new Error('Telefone inválido.');
        }
    }

    validarHorario(horario, mensagem = 'Horário obrigatório.') {
        if (!horario) {
            throw new Error(mensagem);
        }

        if (!/^\d{2}:\d{2}$/.test(horario)) {
            throw new Error('Horário inválido.');
        }
    }

    criar(dados) {
        this.validarHorario(dados.horario);

        if (!dados.cliente) {
            throw new Error('Cliente obrigatório.');
        }

        this.validarTelefone(dados.telefone);

        if (!dados.servico) {
            throw new Error('Serviço obrigatório.');
        }
    }

    cadastrarCliente(dados) {
        if (!dados.cliente) {
            throw new Error('Cliente obrigatório.');
        }

        this.validarTelefone(dados.telefone);
    }

    buscar(dados) {
        if (!dados.cliente && !dados.telefone) {
            throw new Error('Informe cliente ou telefone.');
        }

        if (dados.telefone) {
            this.validarTelefone(dados.telefone);
        }
    }

    alterar(dados) {
    this.buscar(dados);

    if (
        !dados.novo_horario &&
        !dados.novoHorario &&
        !dados.nova_data &&
        !dados.novaData &&
        !dados.servico &&
        !dados.clienteNovo
    ) {
        throw new Error('Nenhuma alteração informada.');
    }

    if (dados.horario) {
        this.validarHorario(dados.horario);
    }

    if (dados.novo_horario) {
        this.validarHorario(dados.novo_horario, 'Novo horário inválido.');
    }

    if (dados.novoHorario) {
        this.validarHorario(dados.novoHorario, 'Novo horário inválido.');
    }
}

    reagendar(dados) {
        this.buscar(dados);
        this.validarHorario(dados.novoHorario, 'Novo horário obrigatório.');
    }

    horarios(dados) {
        if (!dados.servico) {
            throw new Error('Serviço obrigatório.');
        }
    }

}

module.exports = new CommandValidator();