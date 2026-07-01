const { chromium } = require('playwright');
const fs = require('fs');
const Logger = require('../core/Logger');

class BrowserManager {
    constructor() {
        this.sessao = null;
    }

    async abrirSessao() {
        if (this.sessao && await this.sessaoEstaViva()) {
            Logger.info('Reutilizando sessão existente.');
            return this.sessao;
        }

        await this.fecharSessao();

        if (!fs.existsSync('auth.json')) {
            throw new Error('Arquivo auth.json não encontrado. Rode node gravar.js e faça login primeiro.');
        }

        Logger.info('Abrindo navegador...');

        const browser = await chromium.launch({
            headless: false,
slowMo: 500,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const context = await browser.newContext({
            storageState: 'auth.json',
            viewport: null
        });

        const page = await context.newPage();

        Logger.info('Acessando Minha Agenda...');

        await page.goto('https://portal.minhaagendaapp.com.br/agenda', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForTimeout(8000);

        if (page.url().includes('login')) {
            await browser.close();
            this.sessao = null;

            throw new Error('Sessão expirada. Apague auth.json, rode node gravar.js e faça login novamente.');
        }

        this.sessao = {
            browser,
            context,
            page
        };

        Logger.success('Sessão iniciada.');

        return this.sessao;
    }

    async sessaoEstaViva() {
        try {
            if (!this.sessao || !this.sessao.page || this.sessao.page.isClosed()) {
                return false;
            }

            await this.sessao.page.title();

            return true;
        } catch (erro) {
            return false;
        }
    }

    async fecharSessao(sessao = this.sessao) {
        if (!sessao || !sessao.browser) return;

        try {
            Logger.info('Fechando navegador antigo...');
            await sessao.browser.close();
        } catch (erro) {
            Logger.warn('Navegador antigo já estava fechado.');
        }

        if (sessao === this.sessao) {
            this.sessao = null;
        }
    }
}

module.exports = new BrowserManager();