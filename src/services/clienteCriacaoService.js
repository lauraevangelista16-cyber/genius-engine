const Debugger = require('../core/Debugger');

const {
    buscarCliente
} = require('./clienteBuscaService');

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

            await botao.click({
                force: true,
                timeout: 10000
            });

            return true;
        }
    }

    return false;
}

async function criarCliente(page, dados) {
    await Debugger.step(page, 'C006-criar-cliente-inicio');

    const { cliente, telefone } = dados;

    const clicouAdicionar = await clicarBotaoAdicionarCliente(page);

    await Debugger.step(page, `C006-clicou-adicionar-cliente-${clicouAdicionar}`);

    if (!clicouAdicionar) {
        return {
            status: 'ERRO_BOTAO_ADICIONAR_CLIENTE'
        };
    }

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

async function criarESelecionarCliente(page, dados) {
    const criacao = await criarCliente(page, dados);

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    if (criacao.status !== 'CLIENTE_CRIADO') {
        return criacao;
    }

    await page.waitForTimeout(2000);

    const selecaoAposCriar = await buscarCliente(
        page,
        dados.cliente,
        dados.telefone
    );

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
    criarCliente,
    criarESelecionarCliente,
    clicarBotaoAdicionarCliente
};