const Debugger = require('../core/Debugger');

const { buscarCliente } = require('./clienteBuscaService');
const clienteCriacaoService = require('./clienteCriacaoService');

async function selecionarCliente(page, cliente, telefone = '') {
    return await buscarCliente(page, cliente, telefone);
}

async function criarCliente(page, dados) {
    return await clienteCriacaoService.criarCliente(page, dados);
}

async function selecionarOuCriarCliente(page, dados) {
    await Debugger.step(page, 'C011-selecionar-ou-criar-inicio');

    const { cliente, telefone } = dados;

    const selecao = await buscarCliente(page, cliente, telefone);

    await Debugger.step(page, `C012-status-selecao-${selecao.status}`);

    if (selecao.status === 'CLIENTE_SELECIONADO') {
        return selecao;
    }

    if (selecao.status === 'CLIENTE_AMBIGUO') {
        return selecao;
    }

    if (selecao.status !== 'CLIENTE_NAO_ENCONTRADO') {
        return selecao;
    }

    return await clienteCriacaoService.criarESelecionarCliente(page, {
        cliente,
        telefone
    });
}

module.exports = {
    selecionarCliente,
    criarCliente,
    selecionarOuCriarCliente
};