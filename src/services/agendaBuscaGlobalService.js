const Logger = require('../core/Logger');
const Debugger = require('../core/Debugger');

async function step(page, nome) {
    console.log(`[agendaBuscaGlobalService] ${nome}`);
    await Debugger.step(page, nome).catch(() => {});
}

/*
 * Localiza somente um campo visível da busca global.
 * Mantém o seletor original como primeira tentativa e
 * adiciona alternativas para pequenas mudanças na interface.
 */
const localizarCampoBuscaGlobal = async (page) => {
    const seletores = [
        'input[placeholder*="cliente" i][placeholder*="buscar" i]',
        'input[placeholder*="buscar cliente" i]',
        'input[placeholder*="cliente" i]',
        'input[placeholder*="buscar" i]',
        'input[placeholder*="pesquisar" i]',
        'input[aria-label*="cliente" i]',
        'input[aria-label*="buscar" i]',
        'input[aria-label*="pesquisar" i]',
        'input[type="search"]'
    ];

    for (const seletor of seletores) {
        const campos = page.locator(seletor);
        const total = await campos.count().catch(() => 0);

        for (let i = 0; i < total; i++) {
            const campo = campos.nth(i);

            const visivel = await campo
                .isVisible()
                .catch(() => false);

            if (!visivel) {
                continue;
            }

            Logger.info(
                `[agendaBuscaGlobalService] Campo de busca localizado com o seletor: ${seletor}`
            );

            return campo;
        }
    }

    return null;
};

/*
 * Aguarda o campo aparecer depois do clique na lupa.
 */
const aguardarCampoBuscaGlobal = async (
    page,
    timeout = 10000
) => {
    const inicio = Date.now();

    while (Date.now() - inicio < timeout) {
        const campoBusca = await localizarCampoBuscaGlobal(page);

        if (campoBusca) {
            return campoBusca;
        }

        await page.waitForTimeout(250);
    }

    return null;
};

const lerResultadosBuscaGlobal = async (page) => {
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
            .split('\t')
            .map(item => item.trim())
            .filter(Boolean);

        resultados.push({
            profissional: colunas[0] || '',
            data: colunas[1] || '',
            horario: colunas[2] || '',
            cliente: colunas[3] || '',
            servico: colunas[4] || '',
            situacao: colunas[5] || ''
        });
    }

    await step(page, '005-resultados-lidos');

    return {
        total: resultados.length,
        resultados
    };
};

const abrirBuscaGlobal = async (page, cliente) => {
    await step(page, '001-inicio-busca-global');

    let campoBusca = await localizarCampoBuscaGlobal(page);

    const buscaJaAberta = Boolean(campoBusca);

    if (buscaJaAberta) {
        Logger.info(
            '[agendaBuscaGlobalService] Busca global já estava aberta.'
        );

        await campoBusca.fill('');
        await campoBusca.fill(cliente);

        await step(page, '004-cliente-digitado');

        await page.waitForTimeout(3000);

        return await lerResultadosBuscaGlobal(page);
    }

    const botoes = page.locator('button, [role="button"]');
    const totalBotoes = await botoes.count().catch(() => 0);

    Logger.info(
        `[agendaBuscaGlobalService] Total de botões encontrados: ${totalBotoes}`
    );

    let botaoBusca = null;

    for (let i = 0; i < totalBotoes; i++) {
        const botao = botoes.nth(i);

        const visivel = await botao.isVisible().catch(() => false);

        if (!visivel) continue;

        const texto = await botao.innerText().catch(() => '');
        const ariaLabel = await botao
            .getAttribute('aria-label')
            .catch(() => '');
        const title = await botao
            .getAttribute('title')
            .catch(() => '');
        const html = await botao
            .evaluate(el => el.outerHTML)
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

        if (
            descricao.includes('buscar') ||
            descricao.includes('pesquisar') ||
            descricao.includes('search') ||
            descricao.includes('magnify')
        ) {
            botaoBusca = botao;

            Logger.info(
                `[agendaBuscaGlobalService] Botão de busca identificado no índice ${i}.`
            );

            break;
        }
    }

    if (!botaoBusca) {
        throw new Error(
            'Botão da busca global não encontrado.'
        );
    }

    await botaoBusca.click({
        force: true,
        timeout: 10000
    });

    await step(page, '002-clique-lupa');

    campoBusca = await aguardarCampoBuscaGlobal(
        page,
        10000
    );

    if (!campoBusca) {
        throw new Error(
            'Campo da busca global não apareceu após clicar na lupa.'
        );
    }

    await step(page, '003-campo-busca-aberto');

    await campoBusca.fill('');
    await campoBusca.fill(cliente);

    await step(page, '004-cliente-digitado');

    await page.waitForTimeout(3000);

    return await lerResultadosBuscaGlobal(page);
};

module.exports = {
    abrirBuscaGlobal
};