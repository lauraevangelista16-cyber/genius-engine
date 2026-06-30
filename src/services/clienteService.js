async function selecionarCliente(page, cliente) {
    const campoCliente = page.getByRole('textbox', {
        name: 'Cliente'
    });

    await campoCliente.click();
    await campoCliente.fill(cliente);

    await page.waitForTimeout(1200);

    const opcoes = page.getByText(cliente, { exact: false });
    const total = await opcoes.count();

    if (total > 0) {
        await opcoes.last().click();
        await page.waitForTimeout(800);

        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    return {
        status: 'CLIENTE_NAO_ENCONTRADO'
    };
}

async function criarCliente(page, dados) {
    const { cliente, telefone } = dados;

    await page.getByText('ADICIONAR CLIENTE', { exact: false }).click();

    await page.waitForTimeout(1000);

    const campos = page.getByRole('textbox');

    await campos.nth(0).click();
    await campos.nth(0).fill(cliente);

    if (telefone) {
        await campos.nth(1).click();
        await campos.nth(1).fill(telefone);
    }

    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /salvar/i }).last().click();

    await page.waitForTimeout(2500);

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function selecionarOuCriarCliente(page, dados) {
    const { cliente, telefone } = dados;

    const selecao = await selecionarCliente(page, cliente);

    if (selecao.status === 'CLIENTE_SELECIONADO') {
        return selecao;
    }

    const criacao = await criarCliente(page, {
        cliente,
        telefone
    });

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

    if (clienteNaTela) {
        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    return {
        status: 'CLIENTE_SELECIONADO'
    };
}

module.exports = {
    selecionarCliente,
    criarCliente,
    selecionarOuCriarCliente
};