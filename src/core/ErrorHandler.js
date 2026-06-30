const ResponseBuilder = require('./ResponseBuilder');

class ErrorHandler {

    tratar(erro) {

        if (erro instanceof Error) {

            return ResponseBuilder.erro(
                'ERRO',
                erro.message
            );

        }

        return ResponseBuilder.erro(
            'ERRO_DESCONHECIDO',
            'Ocorreu um erro inesperado.'
        );

    }

}

module.exports = new ErrorHandler();