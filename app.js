const { criarAgendamento } = require('./src/controllers/agendamentoController');

const dados = {
    horario: process.argv[2],
    cliente: process.argv[3],
    servico: process.argv[4]
};

criarAgendamento(dados).then((resposta) => {
    console.log(resposta);
});