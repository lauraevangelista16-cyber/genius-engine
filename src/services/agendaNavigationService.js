const Debugger = require('../core/Debugger');

function criarDataLocal(data) {
    const [ano, mes, dia] = String(data).split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}

async function clicarDataSeVisivel(page, data) {
    const botaoData = page.locator(`button[value="${data}"]`);
    const total = await botaoData.count();

    if (total === 0) return false;

    await botaoData.first().click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(1500);
    return true;
}

async function navegarDia(page, direcao = 'proximo') {
    const grupoHoje = page
        .locator('div[role="group"]')
        .filter({ hasText: 'Hoje' })
        .first();

    await grupoHoje.waitFor({ state: 'attached', timeout: 10000 });
    await grupoHoje.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const botoes = grupoHoje.locator('button');
    const total = await botoes.count();

    if (!total) {
        throw new Error('Botões de navegação da agenda não encontrados.');
    }

    const botao = direcao === 'proximo'
        ? botoes.nth(total - 1)
        : botoes.nth(0);

    await botao.evaluate((el) => el.click());

    await page.waitForTimeout(1500);
}

const irParaData = async (page, data) => {
    await Debugger.step(page, 'N001-ir-para-data-inicio');

    if (!data) {
        await Debugger.step(page, 'N002-data-ausente');
        throw new Error('Data obrigatória para navegar na agenda.');
    }

    await page.goto('https://portal.minhaagendaapp.com.br/agenda', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    await Debugger.step(page, `N003-agenda-aberta-${data}`);

    const clicouDireto = await clicarDataSeVisivel(page, data);

    if (clicouDireto) {
        await Debugger.step(page, `N004-data-visivel-clicada-${data}`);
        return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const alvo = criarDataLocal(data);
    alvo.setHours(0, 0, 0, 0);

    const direcao = alvo > hoje ? 'proximo' : 'anterior';

    for (let i = 0; i < 60; i++) {
        await clicarNavegacao(page, direcao);

        await Debugger.step(page, `N005-navegacao-${direcao}-${i + 1}`);

        const encontrou = await clicarDataSeVisivel(page, data);

        if (encontrou) {
            await Debugger.step(page, `N006-data-encontrada-${data}`);
            return;
        }
    }

    await Debugger.step(page, `N007-data-nao-encontrada-${data}`);

    throw new Error(`Não foi possível navegar até a data ${data}.`);
};


module.exports = {
    irParaData,
    navegarDia,
    clicarNavegacao: navegarDia
};