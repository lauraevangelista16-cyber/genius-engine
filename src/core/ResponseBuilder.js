class ResponseBuilder {

    sucesso(status, mensagem, dados = {}) {
        return {
            sucesso: true,
            status,
            mensagem,
            ...dados
        };
    }

    erro(status, mensagem, dados = {}) {
        return {
            sucesso: false,
            status,
            mensagem,
            ...dados
        };
    }

}

module.exports = new ResponseBuilder();