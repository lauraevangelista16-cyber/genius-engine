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
    const grupos = page
        .locator('div[role="group"]')
        .filter({ hasText: 'Hoje' });

    const totalGrupos = await grupos.count();

    if (!totalGrupos) {
        throw new Error('Grupo Hoje não encontrado na agenda.');
    }

    const grupoHoje = grupos.first();
    const botoes = grupoHoje.locator('button');

    const totalBotoes = await botoes.count();

    if (!totalBotoes) {
        throw new Error('Botões de navegação da agenda não encontrados.');
    }

    const indice = direcao === 'proximo'
        ? totalBotoes - 1
        : 0;

    await botoes.nth(indice).evaluate(el => el.click());

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
        await navegarDia(page, direcao);

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