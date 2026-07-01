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

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1500);

    await Debugger.step(page, 'C003-cliente-enter-confirmado');

    const textoTela = await page.locator('body').innerText().catch(() => '');

    if (textoTela.toLowerCase().includes(cliente.toLowerCase())) {
        await Debugger.step(page, 'C004-cliente-selecionado');

        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    await Debugger.step(page, 'C005-cliente-nao-confirmado');

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

    await campos.nth(0).click();
    await campos.nth(0).fill(cliente);

    await Debugger.step(page, 'C008-nome-cliente-preenchido');

    if (telefone) {
        await campos.nth(1).click();
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

    const clienteNaTela = await page
        .getByText(cliente, { exact: false })
        .isVisible()
        .catch(() => false);

    await Debugger.step(page, `C014-cliente-na-tela-${clienteNaTela}`);

    return {
        status: 'CLIENTE_SELECIONADO'
    };
}

module.exports = {
    selecionarCliente,
    criarCliente,
    selecionarOuCriarCliente
};