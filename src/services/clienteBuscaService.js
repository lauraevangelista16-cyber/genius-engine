const Debugger = require('../utils/Debugger');

function normalizarTexto(valor = '') {
    return String(valor)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function somenteNumeros(valor = '') {
    return String(valor).replace(/\D/g, '');
}

function nomeExato(texto, cliente) {
    const textoNormalizado = normalizarTexto(texto);
    const clienteNormalizado = normalizarTexto(cliente);

    return textoNormalizado.startsWith(clienteNormalizado);
}

function nomeContem(texto, cliente) {
    return normalizarTexto(texto).includes(normalizarTexto(cliente));
}

function telefoneExiste(texto) {
    return somenteNumeros(texto).length >= 8;
}

function telefoneCombina(texto, telefone = '') {
    const telBusca = somenteNumeros(telefone);
    const telTexto = somenteNumeros(texto);

    if (!telBusca || !telTexto) return false;

    return telTexto.endsWith(telBusca) || telBusca.endsWith(telTexto);
}

async function encontrarCampoCliente(page) {
    const seletores = [
        'input[placeholder*="Cliente" i]',
        'input[name*="cliente" i]',
        'label:has-text("Cliente") + div input',
        'text=Cliente >> xpath=.. >> input',
        'input'
    ];

    for (const seletor of seletores) {
        const campo = page.locator(seletor).first();

        if (await campo.count().catch(() => 0)) {
            if (await campo.isVisible().catch(() => false)) {
                return campo;
            }
        }
    }

    return null;
}

async function buscarCliente(page, cliente, telefone = '') {
    await Debugger.step(page, 'C001-selecionar-cliente-inicio');

    const campo = await encontrarCampoCliente(page);

    if (!campo) {
        await Debugger.step(page, 'C001-campo-cliente-nao-encontrado');
        return { status: 'ERRO_CAMPO_CLIENTE_NAO_ENCONTRADO' };
    }

    await campo.click({ force: true });
    await campo.fill('');
    await campo.fill(cliente);

    await Debugger.step(page, 'C002-cliente-digitado');
    await page.waitForTimeout(1500);

    const opcoes = page
        .locator('li, [role="option"], .MuiAutocomplete-option, [id*="option"], [id*="item"]')
        .filter({ hasText: new RegExp(cliente, 'i') });

    const total = await opcoes.count();

    await Debugger.step(page, `C003-opcoes-autocomplete-${total}`);

    if (total === 0) {
        await Debugger.step(page, 'C005-cliente-nao-encontrado');
        return { status: 'CLIENTE_NAO_ENCONTRADO' };
    }

    const clientes = [];

    for (let i = 0; i < total; i++) {
        const opcao = opcoes.nth(i);
        const texto = await opcao.innerText().catch(() => '');

        await Debugger.step(
            page,
            `C003-texto-opcao-${i}-${String(texto).replace(/\s+/g, ' ').slice(0, 120)}`
        );

        clientes.push({
            opcao,
            texto,
            nomeExato: nomeExato(texto, cliente),
            nomeContem: nomeContem(texto, cliente),
            telefoneExiste: telefoneExiste(texto),
            telefoneCombina: telefoneCombina(texto, telefone)
        });
    }

    const porTelefone = clientes.filter(c => c.telefoneCombina);

    await Debugger.step(page, `C003-clientes-por-telefone-${porTelefone.length}`);

    if (porTelefone.length === 1) {
        await porTelefone[0].opcao.click({ force: true });
        await page.waitForTimeout(1000);
        await Debugger.step(page, 'C004-cliente-selecionado-por-telefone');
        return { status: 'CLIENTE_SELECIONADO' };
    }

    const nomeSeguro = clientes.filter(c => {
        if (!c.nomeExato) return false;
        if (telefone && c.telefoneExiste) return false;
        return true;
    });

    await Debugger.step(page, `C003-clientes-nome-exato-seguros-${nomeSeguro.length}`);

    if (nomeSeguro.length === 1) {
        await nomeSeguro[0].opcao.click({ force: true });
        await page.waitForTimeout(1000);
        await Debugger.step(page, 'C004-cliente-selecionado-por-nome');
        return { status: 'CLIENTE_SELECIONADO' };
    }

    const nomeContemSemTelefone = clientes.filter(c => {
        if (!c.nomeContem) return false;
        if (c.telefoneExiste && telefone) return false;
        return true;
    });

    await Debugger.step(page, `C003-clientes-nome-contem-sem-telefone-${nomeContemSemTelefone.length}`);

    if (nomeContemSemTelefone.length === 1) {
        await nomeContemSemTelefone[0].opcao.click({ force: true });
        await page.waitForTimeout(1000);
        await Debugger.step(page, 'C004-cliente-selecionado-por-unica-opcao-sem-telefone');
        return { status: 'CLIENTE_SELECIONADO' };
    }

    const parecidos = clientes.filter(c => c.nomeContem || c.nomeExato);

    if (parecidos.length) {
        await Debugger.step(page, 'C005-clientes-parecidos-ignorados');

        await campo.click({ force: true });
        await campo.press('End');
        await campo.type(' ');
        await page.waitForTimeout(800);

        await Debugger.step(page, 'C005B-espaco-adicionado-para-forcar-adicionar-cliente');

        return { status: 'CLIENTE_NAO_ENCONTRADO_COM_PARECIDOS' };
    }

    return { status: 'CLIENTE_NAO_ENCONTRADO' };
}

module.exports = {
    buscarCliente,
    encontrarCampoCliente
};