const BrowserManager = require('../managers/BrowserManager');

async function abrirBrowser() {
    return await BrowserManager.abrirSessao();
}

module.exports = {
    abrirBrowser
};