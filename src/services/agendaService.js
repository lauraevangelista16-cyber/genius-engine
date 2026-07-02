const Debugger = require('../core/Debugger');

function normalizarBusca(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function normalizarTelefone(telefone) {
    return String(telefone || '').replace(/\D/g, '');
}

function atendimentoCombina(texto, cliente, telefone) {
    const textoNormalizado = normalizarBusca(texto);
    const clienteNormalizado = normalizarBusca(cliente);

    const textoTelefone = normalizarTelefone(texto);
    const telefoneNormalizado = normalizarTelefone(telefone);

    const nomeCombina =
        clienteNormalizado &&
        textoNormalizado.includes(clienteNormalizado);

    if (!telefoneNormalizado) return nomeCombina;

    const telefoneCombina = textoTelefone.includes(telefoneNormalizado);

    return telefoneCombina || nomeCombina;
}

const abrirHorario = async (page, horario) => {
    await Debugger.step(page, '001-inicio-abrir-horario');

    try {
        await page.waitForTimeout(3000);

        const horarioLimpo = String(horario).replace(/^0/, '');
        const linhaHorario = page.locator(`tr[data-time="${horarioLimpo}"]`);
        const totalLinhas = await linhaHorario.count();

        await Debugger.step(page, `002-linha-horario-${horarioLimpo}-${totalLinhas}`);

        if (totalLinhas === 0) {
            return 'ERRO_LINHA_HORARIO_NAO_ENCONTRADA';
        }

        const linha = linhaHorario.last();

        const celulas = linha.locator('td');
        const totalCelulas = await celulas.count();

        await Debugger.step(page, `003-total-celulas-horario-${totalCelulas}`);

        if (totalCelulas === 0) {
            return 'ERRO_CELULA_HORARIO_NAO_ENCONTRADA';
        }

        let clicou = false;

        for (let i = totalCelulas - 1; i >= 0; i--) {
            const celula = celulas.nth(i);
            const visivel = await celula.isVisible().catch(() => false);
            const box = await celula.boundingBox().catch(() => null);

            if (!visivel || !box || box.width < 10 || box.height < 10) {
                continue;
            }

            await Debugger.step(page, `004-tentando-celula-${i}`);

            await celula.click({
                force: true,
                timeout: 5000
            }).catch(async () => {
                await page.mouse.click(
                    box.x + box.width / 2,
                    box.y + box.height / 2
                );
            });

            await page.waitForTimeout(1500);

            const abriu = await page
                .getByText('Criando Atendimento', { exact: false })
                .isVisible()
                .catch(() => false);

            await Debugger.step(page, `005-modal-abriu-celula-${i}-${abriu}`);

            if (abriu) {
                clicou = true;
                break;
            }
        }

        if (!clicou) {
            return 'ERRO_MODAL_NAO_ABRIU';
        }

        const campoHora = page.locator('input[name="startTime"]');

        await campoHora.waitFor({
            state: 'visible',
            timeout: 10000
        });

        await campoHora.click({ force: true });
        await campoHora.fill('');
        await campoHora.fill(horario);

        await page.waitForTimeout(500);

        const valorHorario = await campoHora.inputValue().catch(() => '');

        await Debugger.step(page, `006-horario-modal-ajustado-${valorHorario}`);

        if (valorHorario !== horario) {
            return 'ERRO_HORARIO_MODAL_DIFERENTE';
        }

        return 'HORARIO_LIVRE';

    } catch (erro) {
        console.log('[ERRO abrirHorario]', erro.message);
        await Debugger.step(page, '007-erro-geral-abrir-horario');
        return 'ERRO_ABRIR_HORARIO';
    }
};

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');

    await page.waitForTimeout(1000);

    const campoServico = page.locator('#downshift-1-input');

    await campoServico.waitFor({
        state: 'visible',
        timeout: 10000
    });

    await campoServico.click({ force: true });
    await campoServico.fill('');
    await campoServico.fill(servico);

    await Debugger.step(page, '009-servico-digitado');

    await page.waitForTimeout(1500);

    const opcaoServico = page
        .locator('[id^="downshift-1-item"], li, [role="option"]')
        .filter({ hasText: new RegExp(servico, 'i') })
        .first();

    const totalOpcoes = await opcaoServico.count();

    if (totalOpcoes > 0) {
        await opcaoServico.click({ force: true, timeout: 5000 });
    } else {
        await page.keyboard.press('ArrowDown').catch(() => {});
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter').catch(() => {});
    }

    await page.waitForTimeout(2000);

    await Debugger.step(page, '010-servico-selecionado');

    const textoTela = await page.locator('body').innerText().catch(() => '');

    if (textoTela.includes('Total: R$ 0,00')) {
        await Debugger.step(page, '011-servico-nao-selecionado');
        throw new Error('Serviço não foi selecionado corretamente.');
    }

    await Debugger.step(page, '012-servico-confirmado');
};

const salvarAgendamento = async (page) => {
    await Debugger.step(page, '013-antes-salvar-agendamento');

    const botoesSalvar = page.getByRole('button', { name: /^salvar$/i });
    const total = await botoesSalvar.count();

    if (total === 0) {
        return {
            status: 'ERRO_INTERNO',
            mensagem: 'Botão Salvar não encontrado.'
        };
    }

    const botaoSalvar = botoesSalvar.nth(total - 1);

    await botaoSalvar.scrollIntoViewIfNeeded().catch(() => {});
    await botaoSalvar.click({ force: true, timeout: 10000 });

    await page.waitForTimeout(4000);

    await Debugger.step(page, '014-depois-click-salvar');

    const textoTela = await page.locator('body').innerText().catch(() => '');

    const modalAindaAberto = await page
        .getByText('Criando Atendimento', { exact: false })
        .isVisible()
        .catch(() => false);

    if (textoTela.includes('Já existe atendimento')) {
        return {
            status: 'HORARIO_OCUPADO',
            mensagem: 'Esse horário já está ocupado.'
        };
    }

    if (textoTela.includes('Preencha esse campo para continuar')) {
        return {
            status: 'DADOS_INCOMPLETOS',
            mensagem: 'Existe um campo obrigatório não preenchido no Minha Agenda.',
            detalhe: textoTela
        };
    }

    if (modalAindaAberto) {
        return {
            status: 'ERRO_INTERNO',
            mensagem: 'O sistema clicou em Salvar, mas o modal continuou aberto.',
            detalhe: textoTela
        };
    }

    await Debugger.step(page, '015-agendamento-salvo');

    return {
        status: 'SALVO'
    };
};

const listarAtendimentosDoDia = async (page) => {
    await Debugger.step(page, '015-inicio-listar-atendimentos');

    await page.waitForTimeout(4000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await Debugger.step(page, `016-total-eventos-${total}`);

    const atendimentos = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const visivel = await evento.isVisible().catch(() => false);

        if (!visivel) continue;

        const texto = await evento.innerText().catch(() => '');

        if (texto.trim()) {
            atendimentos.push(texto);
        }
    }

    return atendimentos;
};

const abrirAtendimentoPorCliente = async (page, cliente, telefone) => {
    await Debugger.step(page, '017-inicio-abrir-atendimento');

    await page.waitForTimeout(4000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await Debugger.step(page, `018-total-eventos-abrir-${total}`);

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const visivel = await evento.isVisible().catch(() => false);

        if (!visivel) continue;

        const texto = await evento.innerText().catch(() => '');

        if (atendimentoCombina(texto, cliente, telefone)) {
            encontrados.push({
                indice: i,
                evento,
                texto
            });
        }
    }

    await Debugger.step(page, `019-encontrados-abrir-${encontrados.length}`);

    if (encontrados.length === 0) {
        return {
            encontrado: false,
            multiplos: false,
            texto: null
        };
    }

    if (encontrados.length > 1) {
        return {
            encontrado: true,
            multiplos: true,
            texto: encontrados.map(item => item.texto)
        };
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);

    await encontrados[0].evento.click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(1500);

    await Debugger.step(page, '020-atendimento-aberto');

    return {
        encontrado: true,
        multiplos: false,
        texto: encontrados[0].texto
    };
};

function extrairDadosDoTextoAtendimento(texto) {
    const linhas = texto
        .split('\n')
        .map(linha => linha.trim())
        .filter(Boolean);

    const horario = linhas[0] || null;
    const cliente = linhas[1] || null;
    const servico = linhas[2] || null;

    let inicio = null;
    let fim = null;

    if (horario && horario.includes('-')) {
        const partes = horario.split('-').map(parte => parte.trim());
        inicio = partes[0];
        fim = partes[1];
    }

    return {
        inicio,
        fim,
        horario,
        cliente,
        servico,
        textoOriginal: texto
    };
}

const consultarAtendimentoPorCliente = async (page, cliente, telefone) => {
    await Debugger.step(page, '021-inicio-consultar-atendimento');

    await page.waitForTimeout(4000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await Debugger.step(page, `022-total-eventos-consulta-${total}`);

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const visivel = await evento.isVisible().catch(() => false);

        if (!visivel) continue;

        const texto = await evento.innerText().catch(() => '');

        if (atendimentoCombina(texto, cliente, telefone)) {
            encontrados.push(extrairDadosDoTextoAtendimento(texto));
        }
    }

    await Debugger.step(page, `023-encontrados-consulta-${encontrados.length}`);

    if (encontrados.length === 0) {
        return {
            encontrado: false,
            multiplos: false,
            atendimentos: []
        };
    }

    if (encontrados.length > 1) {
        return {
            encontrado: true,
            multiplos: true,
            atendimentos: encontrados
        };
    }

    return {
        encontrado: true,
        multiplos: false,
        ...encontrados[0]
    };
};

const deletarAgendamento = async (page) => {
    await Debugger.step(page, '024-inicio-deletar');

    await page.waitForTimeout(1500);

    await page.getByText('DELETAR', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await Debugger.step(page, '025-clicou-deletar');

    await page.waitForTimeout(1000);

    await page.getByText('SIM', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(4000);

    await Debugger.step(page, '026-deletado');
};

const alterarHorarioAgendamento = async (page, novoHorario) => {
    await Debugger.step(page, '027-inicio-alterar-horario');

    await page.waitForTimeout(1000);

    await page.getByText('EDITAR', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(2000);

    await Debugger.step(page, '028-tela-editar-aberta');

    const campoHora = page.locator('input[name="startTime"]');

    await campoHora.waitFor({
        state: 'visible',
        timeout: 10000
    });

    await campoHora.click({ force: true });
    await campoHora.fill('');
    await campoHora.fill(novoHorario);

    await page.waitForTimeout(800);

    await Debugger.step(page, '029-horario-alterado');

    await page.getByRole('button', { name: /^salvar$/i }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(4000);

    await Debugger.step(page, '030-alteracao-salva');
};

module.exports = {
    abrirHorario,
    selecionarServico,
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento,
    alterarHorarioAgendamento
};