const Debugger = require('../core/Debugger');

async function encontrarCampoCliente(page) {
    const candidatos = [
        page.getByRole('textbox', { name: /cliente/i }),
        page.locator('input[placeholder*="Cliente" i]'),
        page.locator('input[name*="cliente" i]'),
        page.locator('input').filter({ hasText: /cliente/i })
    ];

    for (const campo of candidatos) {
        const total = await campo.count().catch(() => 0);

        if (total === 0) continue;

        const item = campo.first();
        const visivel = await item.isVisible().catch(() => false);

        if (visivel) {
            return item;
        }
    }

    return null;
}

async function selecionarCliente(page, cliente) {
    await Debugger.step(page, 'C001-selecionar-cliente-inicio');

    const campoCliente = await encontrarCampoCliente(page);

    if (!campoCliente) {
        await Debugger.step(page, 'C001-campo-cliente-nao-encontrado');
        return {
            status: 'ERRO_CAMPO_CLIENTE_NAO_ENCONTRADO'
        };
    }

    await campoCliente.click({ force: true, timeout: 10000 });
    await campoCliente.fill('');
    await campoCliente.fill(cliente);

    await Debugger.step(page, 'C002-cliente-digitado');

    await page.waitForTimeout(1500);

    const opcoes = page
        .locator('li, [role="option"], .MuiAutocomplete-option, [id*="option"], [id*="item"]')
        .filter({ hasText: new RegExp(cliente, 'i') });

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

    await page.getByText('ADICIONAR CLIENTE', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(1500);

    await Debugger.step(page, 'C007-modal-criar-cliente');

    const campos = page.getByRole('textbox');
    const totalCampos = await campos.count();

    await Debugger.step(page, `C007-total-campos-cliente-${totalCampos}`);

    if (totalCampos < 2) {
        return {
            status: 'ERRO_CAMPOS_CRIAR_CLIENTE'
        };
    }

    await campos.nth(0).click({ force: true, timeout: 10000 });
    await campos.nth(0).fill('');
    await campos.nth(0).fill(cliente);

    await Debugger.step(page, 'C008-nome-cliente-preenchido');

    if (telefone) {
        await campos.nth(1).click({ force: true, timeout: 10000 });
        await campos.nth(1).fill('');
        await campos.nth(1).fill(telefone);

        await Debugger.step(page, 'C009-telefone-cliente-preenchido');
    }

    await page.waitForTimeout(800);

    const botoesSalvar = page.getByRole('button', { name: /^salvar$/i });
    const totalSalvar = await botoesSalvar.count();

    await Debugger.step(page, `C009-total-botoes-salvar-${totalSalvar}`);

    if (totalSalvar === 0) {
        return {
            status: 'ERRO_BOTAO_SALVAR_CLIENTE'
        };
    }

    await botoesSalvar.last().click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(3000);

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

    if (selecao.status !== 'CLIENTE_NAO_ENCONTRADO') {
        return selecao;
    }

    const criacao = await criarCliente(page, {
        cliente,
        telefone
    });

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    if (criacao.status !== 'CLIENTE_CRIADO') {
        return criacao;
    }

    await page.waitForTimeout(2000);

    const selecaoAposCriar = await selecionarCliente(page, cliente);

    await Debugger.step(page, `C014-status-selecao-apos-criar-${selecaoAposCriar.status}`);

    if (selecaoAposCriar.status === 'CLIENTE_SELECIONADO') {
        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    return {
        status: 'ERRO_SELECIONAR_CLIENTE_APOS_CRIAR'
    };
}

module.exports = {
    selecionarCliente,
    criarCliente,
    selecionarOuCriarCliente
};