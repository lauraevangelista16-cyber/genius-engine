const Debugger = require('../core/Debugger');

async function campoClientePreenchido(page) {
    const campoCliente = page.locator('#downshift-0-input');

    const existe = await campoCliente.count().catch(() => 0);
    if (!existe) return true;

    const valor = await campoCliente.inputValue().catch(() => '');
    return Boolean(valor && valor.trim());
}

async function localizarCampoServico(page) {
    const campoDireto = page.locator('#downshift-1-input');

    if (await campoDireto.isVisible().catch(() => false)) {
        return campoDireto;
    }

    const candidatos = [
        page.getByRole('textbox', { name: /servi|procedimento/i }),
        page.locator('input[placeholder*="Serv" i]'),
        page.locator('input[placeholder*="Proced" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);
            const visivel = await campo.isVisible().catch(() => false);
            if (visivel) return campo;
        }
    }

    return null;
}

async function buscarOpcaoServicoDoCampo(page, campoServico, servico) {
    const idCampo = await campoServico.getAttribute('id').catch(() => '');

    if (idCampo) {
        const numero = idCampo.replace('downshift-', '').replace('-input', '');
        const opcoesDoCampo = page
            .locator(`[id^="downshift-${numero}-item"]`)
            .filter({ hasText: new RegExp(servico, 'i') });

        const totalDoCampo = await opcoesDoCampo.count().catch(() => 0);

        await Debugger.step(page, `009-opcoes-servico-vinculadas-${idCampo}-${totalDoCampo}`);

        if (totalDoCampo > 0) {
            return opcoesDoCampo.first();
        }
    }

    const opcoesGerais = page
        .locator('[role="option"], .MuiAutocomplete-option, li')
        .filter({ hasText: new RegExp(servico, 'i') });

    const totalGerais = await opcoesGerais.count().catch(() => 0);

    await Debugger.step(page, `009-opcoes-servico-gerais-${totalGerais}`);

    if (totalGerais > 0) {
        return opcoesGerais.first();
    }

    return null;
}

async function preencherServico(page, campoServico, servico) {
    await campoServico.click({ force: true, timeout: 10000 });

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});

    await campoServico.fill('').catch(() => {});
    await campoServico.type(servico, { delay: 80 }).catch(async () => {
        await campoServico.fill(servico);
    });

    await page.waitForTimeout(2000);
}

async function servicoFoiSelecionado(page, servico) {
    const textoTela = await page.locator('body').innerText().catch(() => '');

    if (textoTela.includes('Total: R$') && !textoTela.includes('Total: R$ 0,00')) {
        return true;
    }

    if (new RegExp(servico, 'i').test(textoTela) && !textoTela.includes('ADICIONAR SERVIÇO')) {
        return true;
    }

    return false;
}

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    if (!servico) {
        throw new Error('Serviço não informado.');
    }

    await page.waitForTimeout(2000);

    const clienteOkAntes = await campoClientePreenchido(page);
    await Debugger.step(page, `008-cliente-preenchido-antes-servico-${clienteOkAntes}`);

    if (!clienteOkAntes) {
        throw new Error('Campo cliente ficou vazio antes de selecionar o serviço.');
    }

    const campoServico = await localizarCampoServico(page);

    if (!campoServico) {
        throw new Error('Campo de serviço não encontrado.');
    }

    const idCampoServico = await campoServico.getAttribute('id').catch(() => '');
    await Debugger.step(page, `008-campo-servico-usado-${idCampoServico || 'sem-id'}`);

    await preencherServico(page, campoServico, servico);

    const opcao = await buscarOpcaoServicoDoCampo(page, campoServico, servico);

    if (!opcao) {
        throw new Error(`Nenhuma opção de serviço foi encontrada para: ${servico}`);
    }

    await opcao.click({ force: true, timeout: 10000 });

    await page.waitForTimeout(2500);

    const clienteOkDepois = await campoClientePreenchido(page);
    await Debugger.step(page, `011-cliente-preenchido-depois-servico-${clienteOkDepois}`);

    if (!clienteOkDepois) {
        throw new Error('Campo cliente foi apagado ao selecionar o serviço.');
    }

    const selecionado = await servicoFoiSelecionado(page, servico);

    if (!selecionado) {
        await Debugger.step(page, '011-servico-nao-confirmado');
        throw new Error('Serviço não foi selecionado corretamente.');
    }

    await Debugger.step(page, '012-servico-confirmado');
};

module.exports = {
    selecionarServico
};