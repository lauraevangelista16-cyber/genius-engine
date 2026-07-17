const Logger = require('../core/Logger');
const Debugger = require('../core/Debugger');

async function step(page, nome) {
    console.log(`[agendaBuscaGlobalService] ${nome}`);
    await Debugger.step(page, nome).catch(() => {});
}

const converterDataPorExtensoParaDate = (texto = '') => {
    const meses = {
        janeiro: 0,
        fevereiro: 1,
        março: 2,
        marco: 2,
        abril: 3,
        maio: 4,
        junho: 5,
        julho: 6,
        agosto: 7,
        setembro: 8,
        outubro: 9,
        novembro: 10,
        dezembro: 11
    };

    const match = String(texto)
        .trim()
        .toLowerCase()
        .match(/^(\d{1,2}) de ([a-zçãáâéêíóôõú]+),?\s*(\d{4})$/);

    if (!match) {
        return null;
    }

    const dia = Number(match[1]);
    const mes = meses[match[2]];
    const ano = Number(match[3]);

    if (mes === undefined) {
        return null;
    }

    const data = new Date(ano, mes, dia);
    data.setHours(0, 0, 0, 0);

    return data;
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

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const resultadosFiltrados = resultados.filter(resultado => {
        const dataResultado = converterDataPorExtensoParaDate(resultado.data);

        if (!dataResultado) {
            Logger.info(
                `[agendaBuscaGlobalService] Não foi possível interpretar a data "${resultado.data}". Mantendo resultado.`
            );
            return true;
        }

        const manter = dataResultado >= hoje;

        if (!manter) {
            Logger.info(
                `[agendaBuscaGlobalService] Ignorando agendamento passado: ${resultado.data} | ${resultado.horario} | ${resultado.cliente}`
            );
        }

        return manter;
    });

    await step(page, '005-resultados-lidos');

    return {
        total: resultadosFiltrados.length,
        resultados: resultadosFiltrados
    };
};

const abrirBuscaGlobal = async (page, cliente) => {
    await step(page, '001-inicio-busca-global');

    const campoBusca = page.locator(
        'input[placeholder*="cliente" i][placeholder*="buscar" i]'
    );

    const buscaJaAberta = await campoBusca
        .isVisible()
        .catch(() => false);

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
        throw new Error('Botão da busca global não encontrado.');
    }

    await botaoBusca.click({
        force: true,
        timeout: 10000
    });

    await step(page, '002-clique-lupa');

    await campoBusca.waitFor({
        state: 'visible',
        timeout: 10000
    });

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