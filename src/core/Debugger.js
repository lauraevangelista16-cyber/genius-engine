const fs = require('fs');
const path = require('path');

class Debugger {

    constructor() {
        this.enabled = true;

        this.base = path.join(process.cwd(), 'debug');
        this.screens = path.join(this.base, 'screenshots');
        this.html = path.join(this.base, 'html');
        this.logs = path.join(this.base, 'logs');

        [
            this.base,
            this.screens,
            this.html,
            this.logs
        ].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    timestamp() {
        return new Date()
            .toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-');
    }

    async step(page, etapa) {

        if (!this.enabled) return;

        const nome = `${this.timestamp()}-${etapa}`;

        console.log(`🟢 ${etapa}`);

        try {

            await page.screenshot({
                path: path.join(
                    this.screens,
                    `${nome}.png`
                ),
                fullPage: true
            });

        } catch (e) {}

        try {

            const html = await page.content();

            fs.writeFileSync(
                path.join(
                    this.html,
                    `${nome}.html`
                ),
                html
            );

        } catch (e) {}

        try {

            fs.appendFileSync(
                path.join(this.logs, 'debug.log'),
                `[${new Date().toISOString()}] ${etapa}\n`
            );

        } catch (e) {}

    }

}

module.exports = new Debugger();