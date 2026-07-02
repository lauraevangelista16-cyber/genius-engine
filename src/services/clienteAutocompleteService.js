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

function nomeExato(textoOpcao, cliente) {
    const clienteNormalizado = normalizarTexto(cliente);

    return String(textoOpcao || '')
        .split('\n')
        .map(linha => normalizarTexto(linha))
        .filter(Boolean)
        .some(linha => linha === clienteNormalizado);
}

function telefoneCombina(textoOpcao, telefone) {
    const telefoneCliente = normalizarTelefone(telefone);
    const telefoneOpcao = normalizarTelefone(textoOpcao);

    if (!telefoneCliente || !telefoneOpcao) return false;

    return telefoneOpcao.includes(telefoneCliente) || telefoneCliente.includes(telefoneOpcao);
}

async function encontrarCampoCliente(page) {
    const candidatos = [
        page.getByRole('textbox', { name: /cliente/i }),
        page.locator('input[placeholder*="Cliente" i]'),
        page.locator('input[name*="cliente" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);
            const visivel = await campo.isVisible().catch(() => false);

            if (visivel) return campo;
        }
    }

    return null;
}

async function preencherBuscaCliente(page, cliente) {
    const campo = await encontrarCampoCliente(page);

    if (!campo) return null;

    await campo.click({ force: true, timeout: 10000 });
    await campo.fill('');
    await campo.fill(cliente);

    await page.waitForTimeout(1500);

    return campo;
}

async function lerOpcoesCliente(page, cliente, telefone) {
    const opcoes = page
        .locator('li, [role="option"], .MuiAutocomplete-option, [id*="option"], [id*="item"]')
        .filter({ hasText: new RegExp(cliente, 'i') });

    const total = await opcoes.count();
    const resultado = [];

    for (let i = 0; i < total; i++) {
        const opcao = opcoes.nth(i);
        const texto = await opcao.innerText().catch(() => '');

        resultado.push({
            indice: i,
            opcao,
            texto,
            nomeExato: nomeExato(texto, cliente),
            telefoneCombina: telefoneCombina(texto, telefone),
            possuiTelefone: normalizarTelefone(texto).length >= 8
        });
    }

    return resultado;
}

async function clicarAdicionarCliente(page) {
    const candidatos = [
        page.getByText('ADICIONAR CLIENTE', { exact: false }),
        page.getByText('Adicionar cliente', { exact: false }),
        page.getByRole('button', { name: /adicionar cliente/i }),
        page.locator('button').filter({ hasText: /adicionar/i })
    ];

    for (const candidato of candidatos) {
        const total = await candidato.count().catch(() => 0);

        for (let i = 0; i < total; i++) {
            const botao = candidato.nth(i);
            const visivel = await botao.isVisible().catch(() => false);

            if (!visivel) continue;

            await botao.click({ force: true, timeout: 10000 });
            return true;
        }
    }

    return false;
}

module.exports = {
    normalizarTexto,
    normalizarTelefone,
    preencherBuscaCliente,
    lerOpcoesCliente,
    clicarAdicionarCliente
};