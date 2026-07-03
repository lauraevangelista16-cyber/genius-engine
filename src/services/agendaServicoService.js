const Debugger = require('../core/Debugger');

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    await page.waitForTimeout(1000);

    const campoServico = page.locator('#downshift-1-input');

    await campoServico.waitFor({
        state: 'visible',
        timeout: 10000
    });

    await campoServico.click({ force: true });
    await campoServico.fill('');
    await campoServico.fill(servico);

    await Debugger.step(page, '009-servico-digitado');

    await page.waitForTimeout(1500);

    const opcoes = page
        .locator('[id^="downshift-1-item"], li, [role="option"]')
        .filter({ hasText: new RegExp(servico, 'i') });

    const totalOpcoes = await opcoes.count();

    await Debugger.step(page, `009-total-opcoes-servico-${totalOpcoes}`);

    if (totalOpcoes > 0) {
        await opcoes.first().click({
            force: true,
            timeout: 5000
        });
    } else {
        await page.keyboard.press('ArrowDown').catch(() => {});
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter').catch(() => {});
    }

    await page.waitForTimeout(2000);

    await Debugger.step(page, '010-servico-selecionado');

    const textoTela = await page.locator('body').innerText().catch(() => '');

    if (textoTela.includes('Total: R$ 0,00')) {
        await Debugger.step(page, '011-servico-nao-selecionado');

        throw new Error('Serviço não foi selecionado corretamente.');
    }

    await Debugger.step(page, '012-servico-confirmado');
};

module.exports = {
    selecionarServico
};