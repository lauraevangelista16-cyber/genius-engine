const { cancelarAgendamento } = require('./src/controllers/cancelamentoController');

const dados = {
    cliente: process.argv[2]
};

cancelarAgendamento(dados).then((resposta) => {
    console.log(resposta);
});