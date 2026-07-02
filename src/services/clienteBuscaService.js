const Debugger = require('../core/Debugger');

const {
    nomeExato,
    nomeContem,
    telefoneExiste,
    telefoneCombina
} = require('./clienteUtils');

async function encontrarCampoCliente(page) {
    const candidatos = [
        page.getByRole('textbox', { name: /cliente/i }),
        page.locator('input[placeholder*="Cliente" i]'),
        page.locator('input[name*="cliente" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        if (!total) continue;

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);

            const visivel = await campo.isVisible().catch(() => false);

            if (visivel) return campo;
        }
    }

    return null;
}

async function buscarCliente(page, cliente, telefone = '') {

    await Debugger.step(page, 'C001-selecionar-cliente-inicio');

    const campo = await encontrarCampoCliente(page);

    if (!campo) {

        await Debugger.step(page, 'C001-campo-cliente-nao-encontrado');

        return {
            status: 'ERRO_CAMPO_CLIENTE_NAO_ENCONTRADO'
        };
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

        return {
            status: 'CLIENTE_NAO_ENCONTRADO'
        };
    }

    const clientes = [];

    for (let i = 0; i < total; i++) {

        const opcao = opcoes.nth(i);

        const texto = await opcao.innerText().catch(() => '');

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

        return {
            status: 'CLIENTE_SELECIONADO'
        };

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

        return {
            status: 'CLIENTE_SELECIONADO'
        };

    }

    const parecidos = clientes.filter(c => c.nomeContem);

    if (parecidos.length) {

        await Debugger.step(page, 'C005-clientes-parecidos-ignorados');

    }

    return {

        status: 'CLIENTE_NAO_ENCONTRADO'

    };

}

module.exports = {

    buscarCliente,

    encontrarCampoCliente

};