const Debugger = require('../core/Debugger');

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function normalizarTelefone(telefone) {
    return String(telefone || '').replace(/\D/g, '');
}

function nomeExatoNoTexto(textoOpcao, cliente) {
    const clienteNormalizado = normalizarTexto(cliente);

    const linhas = String(textoOpcao || '')
        .split('\n')
        .map(linha => normalizarTexto(linha))
        .filter(Boolean);

    return linhas.some(linha => linha === clienteNormalizado);
}

function nomeContemNoTexto(textoOpcao, cliente) {
    const textoNormalizado = normalizarTexto(textoOpcao);
    const clienteNormalizado = normalizarTexto(cliente);

    return clienteNormalizado && textoNormalizado.includes(clienteNormalizado);
}

function telefoneExisteNoTexto(textoOpcao) {
    return normalizarTelefone(textoOpcao).length >= 8;
}

function telefoneCombinaNoTexto(textoOpcao, telefone) {
    const telefoneNormalizado = normalizarTelefone(telefone);
    const textoTelefone = normalizarTelefone(textoOpcao);

    if (!telefoneNormalizado || !textoTelefone) return false;

    return (
        textoTelefone.includes(telefoneNormalizado) ||
        telefoneNormalizado.includes(textoTelefone)
    );
}

async function encontrarCampoCliente(page) {
    const candidatos = [
        page.getByRole('textbox', { name: /cliente/i }),
        page.locator('input[placeholder*="Cliente" i]'),
        page.locator('input[name*="cliente" i]')
    ];

    for (const campo of candidatos) {
        const total = await campo.count().catch(() => 0);

        if (total === 0) continue;

        for (let i = 0; i < total; i++) {
            const item = campo.nth(i);
            const visivel = await item.isVisible().catch(() => false);

            if (visivel) return item;
        }
    }

    return null;
}

async function clicarBotaoAdicionarCliente(page) {
    const candidatos = [
        page.getByText('ADICIONAR CLIENTE', { exact: false }),
        page.getByText('Adicionar cliente', { exact: false }),
        page.getByText('Novo cliente', { exact: false }),
        page.getByText('Cadastrar cliente', { exact: false }),
        page.getByRole('button', { name: /adicionar cliente/i }),
        page.getByRole('button', { name: /novo cliente/i }),
        page.getByRole('button', { name: /cadastrar cliente/i }),
        page.locator('button').filter({ hasText: /adicionar/i }),
        page.locator('button').filter({ hasText: /cliente/i })
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        if (total === 0) continue;

        for (let i = 0; i < total; i++) {
            const botao = candidato.nth(i);
            const visivel = await botao.isVisible().catch(() => false);

            if (!visivel) continue;

            await botao.click({
                force: true,
                timeout: 10000
            });

            return true;
        }
    }

    return false;
}

async function selecionarCliente(page, cliente, telefone = '') {
    await Debugger.step(page, 'C001-selecionar-cliente-inicio');

    const campoCliente = await encontrarCampoCliente(page);

    if (!campoCliente) {
        await Debugger.step(page, 'C001-campo-cliente-nao-encontrado');
        return {
            status: 'ERRO_CAMPO_CLIENTE_NAO_ENCONTRADO'
        };
    }

    await campoCliente.click({ force: true, timeout: 10000 });
    await campoCliente.fill('');
    await campoCliente.fill(cliente);

    await Debugger.step(page, 'C002-cliente-digitado');

    await page.waitForTimeout(1500);

    const opcoes = page
        .locator('li, [role="option"], .MuiAutocomplete-option, [id*="option"], [id*="item"]')
        .filter({ hasText: new RegExp(cliente, 'i') });

    const totalOpcoes = await opcoes.count();

    await Debugger.step(page, `C003-opcoes-autocomplete-${totalOpcoes}`);

    if (totalOpcoes === 0) {
        await Debugger.step(page, 'C005-cliente-nao-encontrado');
        return {
            status: 'CLIENTE_NAO_ENCONTRADO'
        };
    }

    const opcoesLidas = [];

    for (let i = 0; i < totalOpcoes; i++) {
        const opcao = opcoes.nth(i);
        const texto = await opcao.innerText().catch(() => '');

        opcoesLidas.push({
            indice: i,
            opcao,
            texto,
            nomeExato: nomeExatoNoTexto(texto, cliente),
            nomeContem: nomeContemNoTexto(texto, cliente),
            temTelefone: telefoneExisteNoTexto(texto),
            telefoneCombina: telefoneCombinaNoTexto(texto, telefone)
        });
    }

    const porTelefone = opcoesLidas.filter(item => item.telefoneCombina);

    await Debugger.step(page, `C003-clientes-por-telefone-${porTelefone.length}`);

    if (porTelefone.length === 1) {
        await porTelefone[0].opcao.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1500);

        await Debugger.step(page, 'C004-cliente-selecionado-por-telefone');

        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    if (porTelefone.length > 1) {
        await Debugger.step(page, 'C005-cliente-ambiguo-telefone');

        return {
            status: 'CLIENTE_AMBIGUO',
            clientes: porTelefone.map(item => item.texto)
        };
    }

    const exatosSemTelefoneDiferente = opcoesLidas.filter(item => {
        if (!item.nomeExato) return false;

        if (item.temTelefone && telefone) {
            return false;
        }

        return true;
    });

    await Debugger.step(page, `C003-clientes-nome-exato-seguros-${exatosSemTelefoneDiferente.length}`);

    if (exatosSemTelefoneDiferente.length === 1) {
        await exatosSemTelefoneDiferente[0].opcao.click({
            force: true,
            timeout: 5000
        });

        await page.waitForTimeout(1500);

        await Debugger.step(page, 'C004-cliente-selecionado-por-nome-exato');

        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    if (exatosSemTelefoneDiferente.length > 1) {
        await Debugger.step(page, 'C005-cliente-ambiguo-nome-exato');

        return {
            status: 'CLIENTE_AMBIGUO',
            clientes: exatosSemTelefoneDiferente.map(item => item.texto)
        };
    }

    const parecidos = opcoesLidas.filter(item => item.nomeContem);

    if (parecidos.length > 0) {
        await Debugger.step(page, 'C005-clientes-parecidos-ignorados');
    }

    return {
        status: 'CLIENTE_NAO_ENCONTRADO'
    };
}

async function criarCliente(page, dados) {
    await Debugger.step(page, 'C006-criar-cliente-inicio');

    const { cliente, telefone } = dados;

    const clicouAdicionar = await clicarBotaoAdicionarCliente(page);

    await Debugger.step(page, `C006-clicou-adicionar-cliente-${clicouAdicionar}`);

    if (!clicouAdicionar) {
        return {
            status: 'ERRO_BOTAO_ADICIONAR_CLIENTE'
        };
    }

    await page.waitForTimeout(1500);

    await Debugger.step(page, 'C007-modal-criar-cliente');

    const campos = page.getByRole('textbox');
    const totalCampos = await campos.count();

    await Debugger.step(page, `C007-total-campos-cliente-${totalCampos}`);

    if (totalCampos < 2) {
        return {
            status: 'ERRO_CAMPOS_CRIAR_CLIENTE'
        };
    }

    await campos.nth(0).click({ force: true, timeout: 10000 });
    await campos.nth(0).fill('');
    await campos.nth(0).fill(cliente);

    await Debugger.step(page, 'C008-nome-cliente-preenchido');

    if (telefone) {
        await campos.nth(1).click({ force: true, timeout: 10000 });
        await campos.nth(1).fill('');
        await campos.nth(1).fill(telefone);

        await Debugger.step(page, 'C009-telefone-cliente-preenchido');
    }

    await page.waitForTimeout(800);

    const botoesSalvar = page.getByRole('button', { name: /^salvar$/i });
    const totalSalvar = await botoesSalvar.count();

    await Debugger.step(page, `C009-total-botoes-salvar-${totalSalvar}`);

    if (totalSalvar === 0) {
        return {
            status: 'ERRO_BOTAO_SALVAR_CLIENTE'
        };
    }

    await botoesSalvar.last().click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(3000);

    await Debugger.step(page, 'C010-cliente-salvo');

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function selecionarOuCriarCliente(page, dados) {
    await Debugger.step(page, 'C011-selecionar-ou-criar-inicio');

    const { cliente, telefone } = dados;

    const selecao = await selecionarCliente(page, cliente, telefone);

    await Debugger.step(page, `C012-status-selecao-${selecao.status}`);

    if (selecao.status === 'CLIENTE_SELECIONADO') {
        return selecao;
    }

    if (selecao.status === 'CLIENTE_AMBIGUO') {
        return selecao;
    }

    if (selecao.status !== 'CLIENTE_NAO_ENCONTRADO') {
        return selecao;
    }

    const criacao = await criarCliente(page, {
        cliente,
        telefone
    });

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    if (criacao.status !== 'CLIENTE_CRIADO') {
        return criacao;
    }

    await page.waitForTimeout(2000);

    const selecaoAposCriar = await selecionarCliente(page, cliente, telefone);

    await Debugger.step(page, `C014-status-selecao-apos-criar-${selecaoAposCriar.status}`);

    if (selecaoAposCriar.status === 'CLIENTE_SELECIONADO') {
        return {
            status: 'CLIENTE_SELECIONADO'
        };
    }

    return {
        status: 'ERRO_SELECIONAR_CLIENTE_APOS_CRIAR'
    };
}

module.exports = {
    selecionarCliente,
    criarCliente,
    selecionarOuCriarCliente
};