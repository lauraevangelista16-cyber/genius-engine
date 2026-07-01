const irParaData = async (page, data) => {
    if (!data) {
        throw new Error('Data obrigatória para navegar na agenda.');
    }

    await page.goto('https://portal.minhaagendaapp.com.br/agenda', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    await page.evaluate((dataAlvo) => {
        const tentarFullCalendar = () => {
            if (window.$) {
                const elementos = window.$('.fc');

                for (let i = 0; i < elementos.length; i++) {
                    const el = window.$(elementos[i]);

                    try {
                        el.fullCalendar('gotoDate', dataAlvo);
                        return true;
                    } catch (erro) {}
                }
            }

            return false;
        };

        tentarFullCalendar();
    }, data);

    await page.waitForTimeout(5000);
};

module.exports = {
    irParaData
};