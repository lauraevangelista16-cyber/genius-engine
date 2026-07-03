const Debugger = require('../core/Debugger');

const { buscarCliente } = require('./clienteBuscaService');

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

async function confirmarClienteCriado(page, dados) {
    const { cliente, telefone } = dados;

    await Debugger.step(page, 'C010-confirmando-cliente-criado');

    await page.waitForTimeout(2000);

    const encontrado = await buscarCliente(page, cliente, telefone).catch(async erro => {
        await Debugger.step(page, `C010-erro-confirmar-cliente-${erro.message}`);
        return null;
    });

    if (!encontrado) {
        await Debugger.step(page, 'C010-cliente-nao-confirmado');
        return false;
    }

    if (
        encontrado.status === 'CLIENTE_ENCONTRADO' ||
        encontrado.status === 'CLIENTE_SELECIONADO' ||
        encontrado.status === 'CLIENTE_JA_EXISTE'
    ) {
        await Debugger.step(page, `C010-cliente-confirmado-${encontrado.status}`);
        return true;
    }

    await Debugger.step(page, `C010-cliente-nao-confirmado-status-${encontrado.status}`);
    return false;
}

async function criarCliente(page, dados) {
    await Debugger.step(page, 'C006-criar-cliente-inicio');

    const { cliente, telefone } = dados;

    if (!cliente) {
        return {
            status: 'ERRO_CLIENTE_OBRIGATORIO'
        };
    }

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

    await botoesSalvar.last().click({ force: true, timeout: 10000 });

    await page.waitForTimeout(4000);

    const clienteConfirmado = await confirmarClienteCriado(page, dados);

    if (!clienteConfirmado) {
        return {
            status: 'ERRO_CLIENTE_NAO_CONFIRMADO'
        };
    }

    await Debugger.step(page, 'C010-cliente-salvo-confirmado');

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function modalAtendimentoDisponivel(page) {
    const criandoAtendimento = await page
        .getByText('Criando Atendimento', { exact: false })
        .isVisible()
        .catch(() => false);

    const campoServico = await page
        .locator('#downshift-1-input')
        .isVisible()
        .catch(() => false);

    return criandoAtendimento && campoServico;
}

async function criarESelecionarCliente(page, dados) {
    const criacao = await criarCliente(page, dados);

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    if (criacao.status !== 'CLIENTE_CRIADO') {
        return criacao;
    }

    await Debugger.step(page, 'C014-cliente-criado-precisa-reabrir');

    return {
        status: 'CLIENTE_CRIADO_PRECISA_REABRIR'
    };
}

module.exports = {
    criarCliente,
    criarESelecionarCliente,
    clicarBotaoAdicionarCliente
};