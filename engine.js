const Kernel = require('./src/core/Kernel');
const AgendaEngine = require('./src/engines/agenda/agendaEngine');

Kernel.registrar('agenda', AgendaEngine);

async function executar() {

    const engine = process.argv[2];
    const action = process.argv[3];

    let dados = {};

    if (engine === 'agenda') {

        switch (action) {

            case 'criar':
                dados = {
                    horario: process.argv[4],
                    cliente: process.argv[5],
                    telefone: process.argv[6],
                    servico: process.argv[7]
                };
                break;

            case 'consultar':
                dados = {
                    cliente: process.argv[4],
                    telefone: process.argv[5]
                };
                break;

            case 'cancelar':
                dados = {
                    cliente: process.argv[4],
                    telefone: process.argv[5]
                };
                break;

            case 'horarios':
                dados = {
                    servico: process.argv[4],
                    limite: process.argv[5]
                };
                break;

            case 'alterar':
                dados = {
                    cliente: process.argv[4],
                    telefone: process.argv[5],
                    horario: process.argv[6],
                    servico: process.argv[7],
                    clienteNovo: process.argv[8]
                };
                break;

            case 'reagendar':
                dados = {
                    cliente: process.argv[4],
                    telefone: process.argv[5],
                    novoHorario: process.argv[6]
                };
                break;

            default:
                throw new Error(`Ação "${action}" não existe.`);
        }

    } else {

        throw new Error(`Engine "${engine}" não encontrada.`);

    }

    const resposta = await Kernel.execute(
        engine,
        action,
        dados
    );

    console.log(JSON.stringify(resposta, null, 2));

}

executar().catch((erro) => {

    console.error(erro);

    process.exit(1);

});