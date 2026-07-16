const Logger = require('../core/Logger');
const Debugger = require('../core/Debugger');

async function step(page, nome) {
    console.log(`[agendaBuscaGlobalService] ${nome}`);
    await Debugger.step(page, nome).catch(() => {});
}

const abrirBuscaGlobal = async (page, cliente) => {
    await step(page, '001-inicio-busca-global');

    const botoes = page.locator('button, [role="button"]');
    const totalBotoes = await botoes.count().catch(() => 0);

    Logger.info(
        `[agendaBuscaGlobalService] Total de botões encontrados: ${totalBotoes}`
    );

    let botaoBusca = null;

    for (let i = 0; i < totalBotoes; i++) {
        const botao = botoes.nth(i);

        const visivel = await botao.isVisible().catch(() => false);

        if (!visivel) {
            continue;
        }

        const texto = await botao.innerText().catch(() => '');
        const ariaLabel = await botao
            .getAttribute('aria-label')
            .catch(() => '');

        const title = await botao
            .getAttribute('title')
            .catch(() => '');

        const html = await botao
            .evaluate(elemento => elemento.outerHTML)
            .catch(() => '');

        const descricao = [
            texto,
            ariaLabel,
            title,
            html
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        Logger.info(
            `[agendaBuscaGlobalService] Botão ${i} | texto="${texto}" | aria-label="${ariaLabel || ''}" | title="${title || ''}"`
        );

        const pareceBusca =
            descricao.includes('buscar') ||
            descricao.includes('pesquisar') ||
            descricao.includes('search') ||
            descricao.includes('magnify') ||
            descricao.includes('magnifying');

        if (pareceBusca) {
            botaoBusca = botao;

            Logger.info(
                `[agendaBuscaGlobalService] Botão de busca identificado no índice ${i}.`
            );

            break;
        }
    }

    if (!botaoBusca) {
        throw new Error('Botão da busca global não encontrado.');
    }

    await botaoBusca.click({
        force: true,
        timeout: 10000
    });

    await step(page, '002-clique-lupa');

    const campoBusca = page.locator(
        'input[placeholder*="cliente" i][placeholder*="buscar" i]'
    );

    await campoBusca.waitFor({
        state: 'visible',
        timeout: 10000
    });

    await step(page, '003-campo-busca-aberto');

    await campoBusca.fill('');
    await campoBusca.fill(cliente);

    await step(page, '004-cliente-digitado');

    await page.waitForTimeout(3000);

   const linhas = page.locator('tbody tr');
const total = await linhas.count().catch(() => 0);

Logger.info(
    `[agendaBuscaGlobalService] Total de resultados: ${total}`
);

const resultados = [];

for (let i = 0; i < total; i++) {
    const texto = await linhas.nth(i).innerText().catch(() => '');

    Logger.info(
        `[agendaBuscaGlobalService] Resultado ${i}: ${texto}`
    );

    const colunas = texto
        .split(/\s{2,}/)
        .map(item => item.trim())
        .filter(Boolean);

    resultados.push({
        profissional: colunas[0] || '',
        data: colunas[1] || '',
        horario: colunas[2] || '',
        cliente: colunas[3] || '',
        servico: colunas[4] || '',
        situacao: colunas[colunas.length - 1] || ''
    });
}

await step(page, '005-resultados-lidos');

return {
    total,
    resultados
};

    await step(page, '005-resultados-lidos');

    return {
        total,
        resultados
    };
};

module.exports = {
    abrirBuscaGlobal
};