const Debugger = require('../core/Debugger');

function escaparRegex(texto) {
    return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function obterValorCampo(campo) {
    return await campo.inputValue().catch(() => '');
}

async function campoClientePreenchido(page) {
    const campoCliente = page.locator('#downshift-0-input');

    const existe = await campoCliente.count().catch(() => 0);
    if (!existe) return true;

    const valor = await obterValorCampo(campoCliente);
    return Boolean(valor && valor.trim());
}

async function localizarCampoServico(page) {
    const campoServico = page.locator('#downshift-1-input');

    if (await campoServico.isVisible().catch(() => false)) {
        return campoServico;
    }

    return null;
}

async function preencherCampoServico(page, campoServico, servico) {
    await campoServico.click({ force: true, timeout: 10000 });

    await page.keyboard.press('Control+A').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});

    await campoServico.fill('').catch(() => {});
    await campoServico.type(servico, { delay: 100 }).catch(async () => {
        await campoServico.fill(servico);
    });

    await page.waitForTimeout(2500);
}

async function escolherOpcaoServico(page, servico) {
    const termo = escaparRegex(servico);

    const opcoesVinculadas = page
        .locator('[id^="downshift-1-item"]')
        .filter({ hasText: new RegExp(termo, 'i') });

    const totalVinculadas = await opcoesVinculadas.count().catch(() => 0);

    await Debugger.step(page, `009-opcoes-servico-vinculadas-${totalVinculadas}`);

    if (totalVinculadas > 0) {
        await opcoesVinculadas.first().click({ force: true, timeout: 10000 });
        return true;
    }

    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(1500);

    return true;
}

async function servicoFoiSelecionado(page, servico) {
    const textoTela = await page.locator('body').innerText().catch(() => '');

    const temTotalPago =
        textoTela.includes('Total: R$') &&
        !textoTela.includes('Total: R$ 0,00');

    const temServico = new RegExp(escaparRegex(servico), 'i').test(textoTela);

    return temTotalPago && temServico;
}

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    if (!servico) {
        throw new Error('Serviço não informado.');
    }

    await page.waitForTimeout(2000);

    const clienteAntes = await campoClientePreenchido(page);
    await Debugger.step(page, `008-cliente-preenchido-antes-servico-${clienteAntes}`);

    if (!clienteAntes) {
        throw new Error('Campo cliente ficou vazio antes de selecionar o serviço.');
    }

    const campoServico = await localizarCampoServico(page);

    if (!campoServico) {
        throw new Error('Campo de serviço não encontrado.');
    }

    await Debugger.step(page, '008-campo-servico-usado-downshift-1-input');

    await preencherCampoServico(page, campoServico, servico);

    const valorDigitado = await obterValorCampo(campoServico);
    await Debugger.step(page, `009-valor-campo-servico-${valorDigitado}`);

    await escolherOpcaoServico(page, servico);

    await page.waitForTimeout(2500);

    const clienteDepois = await campoClientePreenchido(page);
    await Debugger.step(page, `011-cliente-preenchido-depois-servico-${clienteDepois}`);

    if (!clienteDepois) {
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