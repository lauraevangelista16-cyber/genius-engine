const Debugger = require('../core/Debugger');

async function encontrarCampoServico(page) {
    const downshifts = page.locator('input[id^="downshift-"][id$="-input"]');
    const total = await downshifts.count().catch(() => 0);

    for (let i = total - 1; i >= 0; i--) {
        const campo = downshifts.nth(i);
        const visivel = await campo.isVisible().catch(() => false);

        if (visivel) {
            return campo;
        }
    }

    return null;
}

async function buscarOpcoesServico(page, servico) {
    const opcoes = page
        .locator('[id^="downshift-"][id*="-item"], li, [role="option"], .MuiAutocomplete-option')
        .filter({ hasText: new RegExp(servico, 'i') });

    const total = await opcoes.count().catch(() => 0);

    return { opcoes, total };
}

async function servicoFoiSelecionado(page) {
    const textoTela = await page.locator('body').innerText().catch(() => '');
    return !textoTela.includes('Total: R$ 0,00');
}

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    await page.waitForTimeout(2500);

    const campoServico = await encontrarCampoServico(page);

    if (!campoServico) {
        await Debugger.step(page, '008-campo-servico-nao-encontrado');
        throw new Error('Campo de serviço não encontrado.');
    }

    await campoServico.click({ force: true, timeout: 10000 });
    await campoServico.fill('');
    await campoServico.fill(servico);

    await Debugger.step(page, '009-servico-digitado');

    await page.waitForTimeout(2000);

    const { opcoes, total } = await buscarOpcoesServico(page, servico);

    await Debugger.step(page, `009-total-opcoes-servico-${total}`);

    if (total === 0) {
        throw new Error('Nenhuma opção de serviço foi encontrada.');
    }

    await opcoes.first().click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(2500);

    await Debugger.step(page, '010-servico-selecionado');

    const selecionado = await servicoFoiSelecionado(page);

    if (!selecionado) {
        await Debugger.step(page, '011-servico-nao-selecionado');
        throw new Error('Serviço não foi selecionado corretamente.');
    }

    await Debugger.step(page, '012-servico-confirmado');
};

module.exports = {
    selecionarServico
};