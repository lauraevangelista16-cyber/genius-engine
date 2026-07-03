const Debugger = require('../core/Debugger');

async function diagnosticarInputs(page) {
    const inputs = page.locator('input');
    const total = await inputs.count().catch(() => 0);

    await Debugger.step(page, `008-total-inputs-visiveis-${total}`);

    for (let i = 0; i < total; i++) {
        const input = inputs.nth(i);
        const visivel = await input.isVisible().catch(() => false);

        if (!visivel) continue;

        const id = await input.getAttribute('id').catch(() => '');
        const name = await input.getAttribute('name').catch(() => '');
        const placeholder = await input.getAttribute('placeholder').catch(() => '');
        const value = await input.inputValue().catch(() => '');

        await Debugger.step(
            page,
            `008-input-${i}-id_${id || 'semid'}-name_${name || 'semname'}-ph_${placeholder || 'semplaceholder'}-value_${value || 'semvalue'}`
        );
    }
}

async function encontrarCampoServico(page) {
    const candidatos = [
        page.locator('#downshift-1-input'),
        page.locator('input[placeholder*="serviço" i]'),
        page.locator('input[placeholder*="servico" i]'),
        page.locator('input[name*="servico" i]'),
        page.locator('input[name*="service" i]'),
        page.getByRole('textbox', { name: /servi/i })
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        if (!total) continue;

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);
            const visivel = await campo.isVisible().catch(() => false);

            if (visivel) return campo;
        }
    }

    return null;
}

async function buscarOpcoesServico(page, servico) {
    const opcoes = page
        .locator('[id^="downshift-1-item"], [id*="downshift"][id*="item"], li, [role="option"], .MuiAutocomplete-option')
        .filter({ hasText: new RegExp(servico, 'i') });

    const total = await opcoes.count().catch(() => 0);

    return {
        opcoes,
        total
    };
}

async function servicoFoiSelecionado(page) {
    const textoTela = await page.locator('body').innerText().catch(() => '');
    return !textoTela.includes('Total: R$ 0,00');
}

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    await page.waitForTimeout(2000);

    await diagnosticarInputs(page);

    const campoServico = await encontrarCampoServico(page);

    if (!campoServico) {
        await Debugger.step(page, '008-campo-servico-nao-encontrado');
        throw new Error('Campo de serviço não encontrado.');
    }

    await campoServico.waitFor({
        state: 'visible',
        timeout: 10000
    });

    await campoServico.click({ force: true });
    await campoServico.fill('');
    await campoServico.fill(servico);

    await Debugger.step(page, '009-servico-digitado');

    let encontrouOpcao = false;

    for (let tentativa = 1; tentativa <= 4; tentativa++) {
        await page.waitForTimeout(1000);

        const { opcoes, total } = await buscarOpcoesServico(page, servico);

        await Debugger.step(page, `009-total-opcoes-servico-tentativa-${tentativa}-${total}`);

        if (total > 0) {
            await opcoes.first().click({
                force: true,
                timeout: 5000
            });

            encontrouOpcao = true;
            break;
        }

        await campoServico.click({ force: true }).catch(() => {});
        await page.keyboard.press('Control+A').catch(() => {});
        await page.keyboard.press('Backspace').catch(() => {});
        await campoServico.fill(servico).catch(() => {});
    }

    if (!encontrouOpcao) {
        await page.keyboard.press('ArrowDown').catch(() => {});
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter').catch(() => {});
    }

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