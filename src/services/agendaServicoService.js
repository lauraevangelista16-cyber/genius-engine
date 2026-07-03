const Debugger = require('../core/Debugger');

async function listarCamposServico(page) {
    const candidatos = [
        page.getByRole('textbox', { name: /servi|procedimento|atendimento/i }),
        page.locator('input[placeholder*="Serv" i]'),
        page.locator('input[placeholder*="Proced" i]'),
        page.locator('input[id^="downshift-"][id$="-input"]')
    ];

    const campos = [];
    const idsUsados = new Set();

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);
            const visivel = await campo.isVisible().catch(() => false);

            if (!visivel) continue;

            const id = await campo.getAttribute('id').catch(() => '');
            const placeholder = await campo.getAttribute('placeholder').catch(() => '');
            const value = await campo.inputValue().catch(() => '');
            const chave = id || `${placeholder}-${i}`;

            if (idsUsados.has(chave)) continue;
            idsUsados.add(chave);

            campos.push({
                campo,
                id,
                placeholder,
                value,
                indice: campos.length
            });
        }
    }

    return campos;
}

async function buscarOpcoesServico(page, servico) {
    const seletorOpcoes = '[role="option"], li, .MuiAutocomplete-option, [id^="downshift-"][id*="-item"]';

    const opcoesFiltradas = page
        .locator(seletorOpcoes)
        .filter({ hasText: new RegExp(servico, 'i') });

    const totalFiltradas = await opcoesFiltradas.count().catch(() => 0);

    if (totalFiltradas > 0) {
        return {
            opcoes: opcoesFiltradas,
            total: totalFiltradas,
            tipo: 'filtradas'
        };
    }

    const opcoesVisiveis = page.locator(seletorOpcoes);
    const total = await opcoesVisiveis.count().catch(() => 0);

    return {
        opcoes: opcoesVisiveis,
        total,
        tipo: 'visiveis'
    };
}

async function limparEPreencherCampo(page, campo, texto) {
    await campo.click({ force: true, timeout: 10000 });

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});

    await campo.fill('').catch(() => {});
    await campo.type(texto, { delay: 80 }).catch(async () => {
        await campo.fill(texto);
    });
}

async function servicoFoiSelecionado(page) {
    const textoTela = await page.locator('body').innerText().catch(() => '');

    if (!textoTela.includes('Total: R$ 0,00')) return true;
    if (textoTela.includes('Total: R$') && !textoTela.includes('Total: R$ 0,00')) return true;

    return false;
}

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    if (!servico) {
        throw new Error('Serviço não informado.');
    }

    await page.waitForTimeout(2500);

    const campos = await listarCamposServico(page);

    await Debugger.step(page, `008-total-campos-servico-visiveis-${campos.length}`);

    if (!campos.length) {
        throw new Error('Nenhum campo de serviço foi encontrado.');
    }

    const camposOrdenados = [...campos].reverse();

    for (const item of camposOrdenados) {
        await Debugger.step(
            page,
            `008-testando-campo-servico-${item.id || item.placeholder || item.indice}`
        );

        await limparEPreencherCampo(page, item.campo, servico);

        await page.waitForTimeout(2500);

        const { opcoes, total, tipo } = await buscarOpcoesServico(page, servico);

        await Debugger.step(
            page,
            `009-opcoes-servico-${item.id || item.placeholder || item.indice}-${tipo}-${total}`
        );

        if (total > 0) {
            await opcoes.first().click({
                force: true,
                timeout: 10000
            });

            await page.waitForTimeout(2500);

            const selecionado = await servicoFoiSelecionado(page);

            if (selecionado) {
                await Debugger.step(page, '012-servico-confirmado');
                return;
            }

            await Debugger.step(page, '011-servico-nao-confirmado-tentando-proximo');
        }

        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
    }

    throw new Error(`Nenhuma opção de serviço foi encontrada para: ${servico}`);
};

module.exports = {
    selecionarServico
};