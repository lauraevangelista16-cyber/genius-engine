function diasEntre(dataAlvo) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const alvo = new Date(`${dataAlvo}T00:00:00`);
    alvo.setHours(0, 0, 0, 0);

    return Math.round((alvo - hoje) / (1000 * 60 * 60 * 24));
}

const irParaData = async (page, data) => {
    if (!data) {
        throw new Error('Data obrigatória para navegar na agenda.');
    }

    await page.goto('https://portal.minhaagendaapp.com.br/agenda', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    const diferenca = diasEntre(data);

    if (diferenca === 0) {
        await page.waitForTimeout(2000);
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
    }

    await page.waitForTimeout(3000);
};

module.exports = {
    irParaData
};