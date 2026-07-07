const Debugger = require('../core/Debugger');

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
        if (!total) continue;

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

async function obterCampoClienteAtendimento(page) {
    const candidatos = [
        page.locator('#downshift-0-input'),
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

            if (visivel) {
                return campo;
            }
        }
    }

    return null;
}

async function garantirClienteNoAtendimento(page, cliente, telefone) {
    await page.waitForTimeout(1500);

    const campoCliente = await obterCampoClienteAtendimento(page);

    if (!campoCliente) {
        await Debugger.step(page, 'C010-campo-cliente-atendimento-nao-encontrado');
        return false;
    }

    const clienteNormalizado = String(cliente || '').trim().toLowerCase();
    const telefoneNormalizado = String(telefone || '').replace(/\D/g, '');

    async function valorAtualCliente() {
        return (await campoCliente.inputValue().catch(() => '')).trim();
    }

    async function clienteEstaPreenchido() {
        const valor = (await valorAtualCliente()).toLowerCase();

        await Debugger.step(
            page,
            `C010-valor-atual-cliente-${valor || 'vazio'}`
        );

        return Boolean(valor && valor.includes(clienteNormalizado));
    }

    if (await clienteEstaPreenchido()) {
        await Debugger.step(page, 'C010-cliente-ja-estava-selecionado');
        return true;
    }

    async function digitarClienteEForcarAutocomplete(tentativa) {
        await campoCliente.click({ force: true, timeout: 10000 });
        await campoCliente.fill('');
        await page.waitForTimeout(300);

        await campoCliente.fill(cliente);
        await page.waitForTimeout(700);

        await Debugger.step(page, `C010-cliente-digitado-apos-criacao-tentativa-${tentativa}`);

        // Força o Downshift/MUI Autocomplete a recalcular a lista
        await campoCliente.press('End').catch(() => {});
        await campoCliente.type(' ').catch(() => {});
        await page.waitForTimeout(400);
        await campoCliente.press('Backspace').catch(() => {});
        await page.waitForTimeout(1200);

        await Debugger.step(page, `C010-autocomplete-forcado-tentativa-${tentativa}`);
    }

    async function selecionarOpcaoCliente(tentativa) {
        await page.waitForSelector('[role="option"], li, .MuiAutocomplete-option, [id*="option"], [id*="item"]', {
            timeout: 5000
        }).catch(() => {});

        const opcoes = page.locator(
            '[role="option"], li, .MuiAutocomplete-option, [id*="option"], [id*="item"]'
        );

        const totalOpcoes = await opcoes.count().catch(() => 0);

        await Debugger.step(
            page,
            `C010-opcoes-cliente-apos-criacao-${totalOpcoes}-tentativa-${tentativa}`
        );

        for (let i = 0; i < totalOpcoes; i++) {
            const opcao = opcoes.nth(i);
            const visivel = await opcao.isVisible().catch(() => false);
            if (!visivel) continue;

            const textoOriginal = await opcao.innerText().catch(() => '');
            const texto = textoOriginal.toLowerCase();
            const numeros = texto.replace(/\D/g, '');

            await Debugger.step(
                page,
                `C010-opcao-cliente-${i}-${String(textoOriginal).replace(/\s+/g, ' ').slice(0, 120)}`
            );

            const telefoneOk =
                telefoneNormalizado &&
                numeros.includes(telefoneNormalizado.slice(-8));

            const nomeOk =
                texto.includes(clienteNormalizado);

            if (telefoneOk || nomeOk) {
                await opcao.click({ force: true, timeout: 10000 });
                await page.waitForTimeout(1000);

                await Debugger.step(page, 'C010-cliente-selecionado-no-autocomplete');

                return true;
            }
        }

        return false;
    }

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        await digitarClienteEForcarAutocomplete(tentativa);

        const selecionou = await selecionarOpcaoCliente(tentativa);

        if (selecionou) {
            if (await clienteEstaPreenchido()) {
                await Debugger.step(page, `C010-cliente-confirmado-apos-selecao-tentativa-${tentativa}`);
                return true;
            }

            await Debugger.step(page, `C010-cliente-nao-confirmado-apos-clique-tentativa-${tentativa}`);
        }
    }

    await Debugger.step(page, 'C010-cliente-nao-encontrado-com-nome-e-telefone');

    return false;
}

function converterDataParaBR(dataISO) {
    if (!dataISO) return '';

    const partes = String(dataISO).split('-');
    if (partes.length !== 3) return String(dataISO);

    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
}

async function obterCampoDataAtendimento(page) {
    const candidatos = [
        page.locator('input[name="date"]'),
        page.locator('input[name="data"]'),
        page.locator('input[placeholder*="Data" i]'),
        page.locator('input[aria-label*="Data" i]')
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

async function obterCampoHoraAtendimento(page) {
    const candidatos = [
        page.locator('input[name="startTime"]'),
        page.locator('input[name="horaInicio"]'),
        page.locator('input[placeholder*="Hora" i]'),
        page.locator('input[aria-label*="Hora" i]')
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

async function garantirDataHoraNoAtendimento(page, data, horario) {
    await page.waitForTimeout(500);

    const campoData = await obterCampoDataAtendimento(page);
    const campoHora = await obterCampoHoraAtendimento(page);

    const valorDataAtual = campoData ? await campoData.inputValue().catch(() => '') : '';
    const valorHoraAtual = campoHora ? await campoHora.inputValue().catch(() => '') : '';

    await Debugger.step(page, `C010B-data-hora-apos-salvar-cliente-data-${valorDataAtual || 'vazio'}-hora-${valorHoraAtual || 'vazio'}`);

    let dataOk = Boolean(valorDataAtual && valorDataAtual.trim());
    let horaOk = Boolean(valorHoraAtual && valorHoraAtual.trim());

    if (!dataOk && campoData && data) {
        const dataBR = converterDataParaBR(data);

        await campoData.click({ force: true, timeout: 10000 });
        await campoData.fill('');
        await campoData.fill(dataBR);

        await page.waitForTimeout(500);

        const dataDepois = await campoData.inputValue().catch(() => '');

        await Debugger.step(page, `C010B-data-repreenchida-${dataDepois || 'vazio'}`);

        dataOk = Boolean(dataDepois && dataDepois.trim());
    }

    if (!horaOk && campoHora && horario) {
        await campoHora.click({ force: true, timeout: 10000 });
        await campoHora.fill('');
        await campoHora.fill(horario);

        await page.waitForTimeout(500);

        const horaDepois = await campoHora.inputValue().catch(() => '');

        await Debugger.step(page, `C010B-hora-repreenchida-${horaDepois || 'vazio'}`);

        horaOk = Boolean(horaDepois && horaDepois.trim());
    }

    return dataOk && horaOk;
}

async function criarCliente(page, dados) {
    await Debugger.step(page, 'C006-criar-cliente-inicio');

    const { cliente, telefone, data, horario } = dados;

    if (!cliente) {
        return { status: 'ERRO_CLIENTE_OBRIGATORIO' };
    }

    const clicouAdicionar = await clicarBotaoAdicionarCliente(page);

    await Debugger.step(page, `C006-clicou-adicionar-cliente-${clicouAdicionar}`);

    if (!clicouAdicionar) {
        return { status: 'ERRO_BOTAO_ADICIONAR_CLIENTE' };
    }

    await page.waitForTimeout(1500);

    await Debugger.step(page, 'C007-modal-criar-cliente');

    const modalCliente = page.locator('[role="dialog"]').last();

    const campos = modalCliente.getByRole('textbox');
    const totalCampos = await campos.count();
    await Debugger.step(page, `C007-total-campos-cliente-${totalCampos}`);

    if (totalCampos < 2) {
        return { status: 'ERRO_CAMPOS_CRIAR_CLIENTE' };
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

    const botoesSalvar = modalCliente.getByRole('button', { name: /^salvar$/i });
    const totalSalvar = await botoesSalvar.count();

    await Debugger.step(page, `C009-total-botoes-salvar-cliente-${totalSalvar}`);

    if (totalSalvar === 0) {
        return { status: 'ERRO_BOTAO_SALVAR_CLIENTE' };
    }

    await botoesSalvar.first().click({ force: true, timeout: 10000 });
    await page.waitForTimeout(2500);

    await Debugger.step(page, 'C010-cliente-salvo-no-modal-atendimento');

    const clienteMantidoNoAtendimento = await garantirClienteNoAtendimento(
    page,
    cliente,
    telefone
);

    await Debugger.step(page, `C010-cliente-mantido-no-atendimento-${clienteMantidoNoAtendimento}`);

    if (!clienteMantidoNoAtendimento) {
        return {
            status: 'ERRO_CLIENTE_NAO_MANTIDO_NO_ATENDIMENTO'
        };
    }

    const dataHoraMantidas = await garantirDataHoraNoAtendimento(page, data, horario);

    await Debugger.step(page, `C010B-data-hora-mantidas-${dataHoraMantidas}`);

    if (!dataHoraMantidas) {
        return {
            status: 'ERRO_DATA_HORA_NAO_MANTIDAS_NO_ATENDIMENTO'
        };
    }

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function criarESelecionarCliente(page, dados) {
    const criacao = await criarCliente(page, dados);

    await Debugger.step(page, `C013-status-criacao-${criacao.status}`);

    return criacao;
}

module.exports = {
    criarCliente,
    criarESelecionarCliente,
    clicarBotaoAdicionarCliente
};