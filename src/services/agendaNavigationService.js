const irParaData = async (page, data) => {
    if (!data) return;

    await page.goto(`https://portal.minhaagendaapp.com.br/agenda?date=${data}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForTimeout(6000);
};

module.exports = {
    irParaData
};