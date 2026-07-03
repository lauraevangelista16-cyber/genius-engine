const Debugger = require('../core/Debugger');

async function listarCamposDownshift(page) {
    const campos = page.locator('input[id^="downshift-"][id$="-input"]');
    const total = await campos.count().catch(() => 0);

    const visiveis = [];

    for (let i = 0; i < total; i++) {
        const campo = campos.nth(i);
        const visivel = await campo.isVisible().catch(() => false);

        if (!visivel) continue;

        const id = await campo.getAttribute('id').catch(() => '');
        const value = await campo.inputValue().catch(() => '');

        visiveis.push({
            indice: i,
            campo,
            id,
            value
        });
    }

    return visiveis;
}

async function buscarOpcoesServico(page, servico) {
    const opcoes = page
        .locator('[id^="downshift-"][id*="-item"], li, [role="option"], .MuiAutocomplete-option')
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

    await page.waitForTimeout(2500);

    const campos = await listarCamposDownshift(page);

    await Debugger.step(page, `008-total-campos-downshift-visiveis-${campos.length}`);

    if (!campos.length) {
        throw new Error('Nenhum campo de serviço foi encontrado.');
    }

    let campoCorreto = null;
    let opcoesCorretas = null;

    for (const item of campos.reverse()) {
        await Debugger.step(page, `008-testando-campo-servico-${item.id || item.indice}`);

        await item.campo.click({ force: true, timeout: 10000 });
        await item.campo.fill('');
        await item.campo.fill(servico);

        await page.waitForTimeout(1500);

        const { opcoes, total } = await buscarOpcoesServico(page, servico);

        await Debugger.step(page, `009-opcoes-no-campo-${item.id || item.indice}-${total}`);

        if (total > 0) {
            campoCorreto = item.campo;
            opcoesCorretas = opcoes;
            break;
        }
    }

    if (!campoCorreto || !opcoesCorretas) {
        throw new Error('Nenhuma opção de serviço foi encontrada.');
    }

    await opcoesCorretas.first().click({
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