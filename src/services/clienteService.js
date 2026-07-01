const Debugger = require('../core/Debugger');

async function selecionarCliente(page, cliente) {
    await Debugger.step(page, 'C001-selecionar-cliente-inicio');

    const campoCliente = page.getByRole('textbox', {
        name: /cliente/i
    });

    await campoCliente.click({ force: true });
    await campoCliente.fill('');
    await campoCliente.fill(cliente);

    await Debugger.step(page, 'C002-cliente-digitado');

    await page.waitForTimeout(1500);

    const opcoes = page.locator('li, [role="option"], .MuiAutocomplete-option')
        .filter({ hasText: cliente });

    const totalOpcoes = await opcoes.count();

    await Debugger.step(page, `C003-opcoes-autocomplete-${totalOpcoes}`);

    if (totalOpcoes > 0) {
        await opcoes.first().click({ force: true, timeout: 5000 });

        await page.waitForTimeout(1500);

        await Debugger.step(page, 'C004-cliente-clicado-na-opcao');

        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    await Debugger.step(page, 'C005-cliente-nao-encontrado');

    return {
        status: 'CLIENTE_NAO_ENCONTRADO'
    };
}

async function criarCliente(page, dados) {
    await Debugger.step(page, 'C006-criar-cliente-inicio');

    const { cliente, telefone } = dados;

    await page.getByText('ADICIONAR CLIENTE', { exact: false }).click();

    await page.waitForTimeout(1000);

    await Debugger.step(page, 'C007-modal-criar-cliente');

    const campos = page.getByRole('textbox');

    await campos.nth(0).click({ force: true });
    await campos.nth(0).fill('');
    await campos.nth(0).fill(cliente);

    await Debugger.step(page, 'C008-nome-cliente-preenchido');

    if (telefone) {
        await campos.nth(1).click({ force: true });
        await campos.nth(1).fill('');
        await campos.nth(1).fill(telefone);

        await Debugger.step(page, 'C009-telefone-cliente-preenchido');
    }

    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /salvar/i }).last().click();

    await page.waitForTimeout(2500);

    await Debugger.step(page, 'C010-cliente-salvo');

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function selecionarOuCriarCliente(page, dados) {
    await Debugger.step(page, 'C011-selecionar-ou-criar-inicio');

    const { cliente, telefone } = dados;

    const selecao = await selecionarCliente(page, cliente);

    await Debugger.step(page, `C012-status-selecao-${selecao.status}`);

    if (selecao.status === 'CLIENTE_SELECIONADO') {
        return selecao;
    }

    const criacao = await criarCliente(page, {
        cliente,
        telefone
    });

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    if (criacao.status !== 'CLIENTE_CRIADO') {
        return {
            status: 'ERRO_CRIAR_CLIENTE'
        };
    }

    await page.waitForTimeout(1500);

    const selecaoAposCriar = await selecionarCliente(page, cliente);

    await Debugger.step(page, `C014-status-selecao-apos-criar-${selecaoAposCriar.status}`);

    if (selecaoAposCriar.status === 'CLIENTE_SELECIONADO') {
        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    return {
        status: 'ERRO_SELECIONAR_CLIENTE'
    };
}

module.exports = {
    selecionarCliente,
    criarCliente,
    selecionarOuCriarCliente
};