const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 200
    });

    const context = await browser.newContext({
        viewport: null
    });

    const page = await context.newPage();

    await page.goto('https://portal.minhaagendaapp.com.br/login', {
        waitUntil: 'domcontentloaded'
    });

    console.log('Faça login normalmente. Depois que a agenda abrir, volte aqui e pressione ENTER.');

    process.stdin.resume();

    process.stdin.once('data', async () => {
        await context.storageState({
            path: 'auth.json'
        });

        console.log('Sessão salva em auth.json.');

        await browser.close();

        process.exit(0);
    });
})();