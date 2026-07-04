const Debugger = require('../core/Debugger');

async function clicarBotaoAdicionarCliente(page) {
    const candidatos = [
        page.getByText('ADICIONAR CLIENTE', { exact: false }),
        page.getByText('Adicionar cliente', { exact: false }),
        page.getByText('Novo cliente', { exact: false }),
        page.getByText('Cadastrar cliente', { exact: false }),
        page.getByRole('button', { name: /adicionar cliente/i }),
        page.getByRole('button', { name: /novo cliente/i }),
        page.getByRole('button', { name: /cadastrar cliente/i }),
        page.locator('button').filter({ hasText: /adicionar/i }),
        page.locator('button').filter({ hasText: /cliente/i })
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);
        if (!total) continue;

        for (let i = 0; i < total; i++) {
            const botao = candidato.nth(i);
            const visivel = await botao.isVisible().catch(() => false);
            if (!visivel) continue;

            await botao.click({ force: true, timeout: 10000 });
            return true;
        }
    }

    return false;
}

async function obterCampoClienteAtendimento(page) {
    const candidatos = [
        page.locator('#downshift-0-input'),
        page.getByRole('textbox', { name: /cliente/i }),
        page.locator('input[placeholder*="Cliente" i]'),
        page.locator('input[name*="cliente" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);
        if (!total) continue;

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);
            const visivel = await campo.isVisible().catch(() => false);

            if (visivel) {
                return campo;
            }
        }
    }

    return null;
}

async function garantirClienteNoAtendimento(page, cliente) {
    await page.waitForTimeout(1000);

    const campoCliente = await obterCampoClienteAtendimento(page);

    if (!campoCliente) {
        await Debugger.step(page, 'C010-campo-cliente-atendimento-nao-encontrado');
        return false;
    }

    const valorAtual = await campoCliente.inputValue().catch(() => '');

    await Debugger.step(page, `C010-valor-cliente-apos-criacao-${valorAtual || 'vazio'}`);

    if (valorAtual && valorAtual.trim()) {
        return true;
    }

    await campoCliente.click({ force: true, timeout: 10000 });
    await campoCliente.fill('');
    await campoCliente.fill(cliente);

    await page.waitForTimeout(800);

    const valorDepois = await campoCliente.inputValue().catch(() => '');

    await Debugger.step(page, `C010-valor-cliente-repreenchido-${valorDepois || 'vazio'}`);

    return Boolean(valorDepois && valorDepois.trim());
}

async function criarCliente(page, dados) {
    await Debugger.step(page, 'C006-criar-cliente-inicio');

    const { cliente, telefone } = dados;

    if (!cliente) {
        return { status: 'ERRO_CLIENTE_OBRIGATORIO' };
    }

    const clicouAdicionar = await clicarBotaoAdicionarCliente(page);

    await Debugger.step(page, `C006-clicou-adicionar-cliente-${clicouAdicionar}`);

    if (!clicouAdicionar) {
        return { status: 'ERRO_BOTAO_ADICIONAR_CLIENTE' };
    }

    await page.waitForTimeout(1500);

    await Debugger.step(page, 'C007-modal-criar-cliente');

    const campos = page.getByRole('textbox');
    const totalCampos = await campos.count();

    await Debugger.step(page, `C007-total-campos-cliente-${totalCampos}`);

    if (totalCampos < 2) {
        return { status: 'ERRO_CAMPOS_CRIAR_CLIENTE' };
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

    await Debugger.step(page, `C009-total-botoes-salvar-cliente-${totalSalvar}`);

    if (totalSalvar === 0) {
        return { status: 'ERRO_BOTAO_SALVAR_CLIENTE' };
    }

    await botoesSalvar.last().click({ force: true, timeout: 10000 });

    await page.waitForTimeout(2500);

    await Debugger.step(page, 'C010-cliente-salvo-no-modal-atendimento');

    const clienteMantidoNoAtendimento = await garantirClienteNoAtendimento(page, cliente);

    await Debugger.step(page, `C010-cliente-mantido-no-atendimento-${clienteMantidoNoAtendimento}`);

    if (!clienteMantidoNoAtendimento) {
        return {
            status: 'ERRO_CLIENTE_NAO_MANTIDO_NO_ATENDIMENTO'
        };
    }

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function criarESelecionarCliente(page, dados) {
    const criacao = await criarCliente(page, dados);

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    return criacao;
}

module.exports = {
    criarCliente,
    criarESelecionarCliente,
    clicarBotaoAdicionarCliente
};