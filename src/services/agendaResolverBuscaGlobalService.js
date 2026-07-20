const { abrirBuscaGlobal } = require('./agendaBuscaGlobalService');

async function resolverBuscaGlobal(page, dados = {}) {

    if (dados.data) {
        return {
            ok: true,
            dados
        };
    }

    const busca = await abrirBuscaGlobal(
        page,
        dados.cliente
    );

    if (!busca || busca.total === 0) {
        return {
            ok: false,
            status: 'AGENDAMENTO_NAO_ENCONTRADO'
        };
    }

    if (busca.total > 1) {
        return {
            ok: false,
            status: 'MULTIPLOS_AGENDAMENTOS',
            atendimentos: busca.resultados
        };
    }

    const resultado = busca.resultados[0];

Logger.info(
    JSON.stringify(busca.resultados, null, 2)
);

    return {
        ok: true,
        dados: {
            ...dados,
            data: resultado.data,
            horario: resultado.horario,
            servico: resultado.servico
        }
    };
}

module.exports = {
    resolverBuscaGlobal
};