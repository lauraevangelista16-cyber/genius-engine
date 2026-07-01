const { abrirBrowser } = require('./src/utils/browser');

(async () => {
    try {
        console.log('Abrindo Minha Agenda...');

        await abrirBrowser();

        console.log('Sessão aberta.');
        console.log('Pode usar o app. Para encerrar, pressione CTRL + C no terminal.');

        await new Promise(() => {});
    } catch (erro) {
        console.error(erro);
    }
})();