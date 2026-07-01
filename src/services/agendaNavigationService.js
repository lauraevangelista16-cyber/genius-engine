const normalizarData = (entrada) => {
    if (!entrada) return null;

    if (typeof entrada === 'string') {
        return entrada.trim();
    }

    if (typeof entrada === 'object') {
        return (
            entrada.data ||
            entrada.date ||
            entrada?.dados?.data ||
            entrada?.dados?.date ||
            null
        );
    }

    return null;
};

const irParaData = async (page, dataRecebida) => {
    const data = normalizarData(dataRecebida);

    if (!data) {
        throw new Error(`Data obrigatória para navegar na agenda. Valor recebido: ${JSON.stringify(dataRecebida)}`);
    }

    await page.goto('https://portal.minhaagendaapp.com.br/agenda', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForTimeout(5000);

    const navegou = await page.evaluate((dataAlvo) => {
        if (!window.$) {
            return false;
        }

        const elementos = window.$('.fc');

        for (let i = 0; i < elementos.length; i++) {
            const el = window.$(elementos[i]);

            try {
                el.fullCalendar('gotoDate', dataAlvo);
                return true;
            } catch (erro) {}
        }

        return false;
    }, data);

    await page.waitForTimeout(5000);

    if (!navegou) {
        throw new Error(`Não foi possível navegar para a data ${data}.`);
    }

    return {
        status: 'DATA_SELECIONADA',
        data
    };
};

module.exports = {
    irParaData
};