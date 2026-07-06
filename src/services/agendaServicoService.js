const Debugger = require('../core/Debugger');

function escaparRegex(texto) {
    return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function obterValorCampo(campo) {
    return await campo.inputValue().catch(() => '');
}

function textoClienteValido(texto) {
    const valor = String(texto || '').trim();

    if (!valor) return false;
    if (/digite para buscar/i.test(valor)) return false;
    if (/nenhum resultado/i.test(valor)) return false;
    if (/adicionar cliente/i.test(valor)) return false;
    if (/cliente/i.test(valor) && valor.length <= 10) return false;

    return true;
}

async function obterTextoModal(page) {
    return await page.locator('[role="dialog"]').last().innerText().catch(async () => {
        return await page.locator('body').innerText().catch(() => '');
    });
}

async function campoClientePreenchido(page) {
    const campoCliente = page.locator('#downshift-0-input');
    const existeInput = await campoCliente.count().catch(() => 0);

    if (existeInput) {
        const valorInput = await obterValorCampo(campoCliente);

        if (textoClienteValido(valorInput)) {
            return true;
        }
    }

    const textoModal = await obterTextoModal(page);
    const match = String(textoModal || '').match(/Cliente\s*\n\s*([^\n]+)/i);

    if (!match) return false;

    return textoClienteValido(match[1]);
}

async function localizarCampoServico(page) {
    const campoServico = page.locator('#downshift-1-input');

    if (await campoServico.isVisible().catch(() => false)) {
        return campoServico;
    }

    return null;
}

async function preencherCampoServico(page, campoServico, servico) {
    await campoServico.click({ force: true, timeout: 10000 });

    await page.keyboard.press('Control+A').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});

    await campoServico.fill('').catch(() => {});
    await campoServico.type(servico, { delay: 100 }).catch(async () => {
        await campoServico.fill(servico);
    });

    await page.waitForTimeout(2500);
}

async function escolherOpcaoServico(page, servico) {
    const termo = escaparRegex(servico);

    const opcoesVinculadas = page
        .locator('[id^="downshift-1-item"]')
        .filter({ hasText: new RegExp(termo, 'i') });

    const totalVinculadas = await opcoesVinculadas.count().catch(() => 0);

    await Debugger.step(page, `009-opcoes-servico-vinculadas-${totalVinculadas}`);

    if (totalVinculadas > 0) {
        await opcoesVinculadas.first().click({ force: true, timeout: 10000 });
        return true;
    }

    const opcoesTexto = page
        .locator('li, [role="option"], [id*="item"]')
        .filter({ hasText: new RegExp(termo, 'i') });

    const totalTexto = await opcoesTexto.count().catch(() => 0);

    await Debugger.step(page, `009-opcoes-servico-texto-${totalTexto}`);

    if (totalTexto > 0) {
        await opcoesTexto.first().click({ force: true, timeout: 10000 });
        return true;
    }

    return false;
}

async function servicoFoiSelecionado(page, servico) {
    const termo = escaparRegex(servico);

    const campoServico = page.locator('#downshift-1-input');
    const valorInput = await obterValorCampo(campoServico);

    await Debugger.step(page, `011-valor-servico-apos-selecao-${valorInput || 'vazio'}`);

    if (new RegExp(termo, 'i').test(valorInput)) {
        return true;
    }

    const textoModal = await obterTextoModal(page);

    await Debugger.step(
        page,
        `011-texto-modal-pos-servico-${String(textoModal).replace(/\s+/g, ' ').slice(0, 120)}`
    );

    if (new RegExp(termo, 'i').test(textoModal)) {
        return true;
    }

    const servicosSelecionados = page
        .locator('body')
        .filter({ hasText: new RegExp(termo, 'i') });

    const total = await servicosSelecionados.count().catch(() => 0);

    return total > 0;
}

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    if (!servico) {
        return {
            status: 'SERVICO_OBRIGATORIO',
            mensagem: 'Informe um serviço.'
        };
    }

    await page.waitForTimeout(2000);

    const clienteAntes = await campoClientePreenchido(page);
    await Debugger.step(page, `008-cliente-preenchido-antes-servico-${clienteAntes}`);

    if (!clienteAntes) {
        return {
            status: 'ERRO_CLIENTE',
            mensagem: 'Campo cliente ficou vazio antes de selecionar o serviço.'
        };
    }

    const campoServico = await localizarCampoServico(page);

    if (!campoServico) {
        return {
            status: 'ERRO_CAMPO_SERVICO',
            mensagem: 'Campo de serviço não encontrado.'
        };
    }

    await Debugger.step(page, '008-campo-servico-usado-downshift-1-input');

    await preencherCampoServico(page, campoServico, servico);

    const valorDigitado = await obterValorCampo(campoServico);
    await Debugger.step(page, `009-valor-campo-servico-${valorDigitado || 'vazio'}`);

    const opcaoEscolhida = await escolherOpcaoServico(page, servico);

    if (!opcaoEscolhida) {
        await Debugger.step(page, '010-servico-sem-opcao-disponivel');

        return {
            status: 'SERVICO_INEXISTENTE',
            mensagem: `Não encontrei o serviço "${servico}".`
        };
    }

    await page.waitForTimeout(2500);

    const clienteDepois = await campoClientePreenchido(page);
    await Debugger.step(page, `011-cliente-preenchido-depois-servico-${clienteDepois}`);

    if (!clienteDepois) {
        return {
            status: 'ERRO_CLIENTE',
            mensagem: 'Campo cliente foi apagado durante a seleção do serviço.'
        };
    }

    const selecionado = await servicoFoiSelecionado(page, servico);

    if (!selecionado) {
        await Debugger.step(page, '011-servico-nao-confirmado');

        return {
            status: 'SERVICO_INEXISTENTE',
            mensagem: `Não encontrei o serviço "${servico}".`
        };
    }

    await Debugger.step(page, '012-servico-confirmado');

    return {
        status: 'SERVICO_SELECIONADO'
    };
};

module.exports = {
    selecionarServico
};