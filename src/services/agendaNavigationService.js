const Debugger = require('../core/Debugger');

function diasEntre(dataAlvo) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const alvo = new Date(`${dataAlvo}T00:00:00`);
    alvo.setHours(0, 0, 0, 0);

    return Math.round((alvo - hoje) / (1000 * 60 * 60 * 24));
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

    const diferenca = diasEntre(data);

    await Debugger.step(page, `N004-diferenca-dias-${diferenca}`);

    if (diferenca === 0) {
        await page.waitForTimeout(2000);
        await Debugger.step(page, 'N005-data-ja-atual');
        return;
    }

    const seletorBotao = diferenca > 0
        ? '.fc-next-button'
        : '.fc-prev-button';

    const quantidadeCliques = Math.abs(diferenca);

    for (let i = 0; i < quantidadeCliques; i++) {
        await page.locator(seletorBotao).click({
            force: true,
            timeout: 10000
        });

        await page.waitForTimeout(1200);

        await Debugger.step(page, `N006-click-data-${i + 1}-de-${quantidadeCliques}`);
    }

    await page.waitForTimeout(3000);

    await Debugger.step(page, 'N007-data-final');
};

module.exports = {
    irParaData
};