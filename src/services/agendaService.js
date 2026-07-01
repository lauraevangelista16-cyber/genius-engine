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

        const elementos = page.getByText(horario, { exact: true });
        const total = await elementos.count();

        await Debugger.step(page, `002-total-horarios-${total}`);

        for (let i = total - 1; i >= 0; i--) {
            try {
                await elementos.nth(i).click({ timeout: 3000 });

                await Debugger.step(page, `003-click-horario-${i}`);

                await page.waitForTimeout(1500);

                const abriu = await page
                    .getByText('Criando Atendimento', { exact: false })
                    .isVisible()
                    .catch(() => false);

                await Debugger.step(page, `004-modal-criando-${abriu}`);

                if (abriu) return 'HORARIO_LIVRE';

            } catch (erro) {
                await Debugger.step(page, `005-erro-click-horario-${i}`);
                continue;
            }
        }

        await Debugger.step(page, '006-horario-ocupado');

        return 'HORARIO_OCUPADO';

    } catch (erro) {
        await Debugger.step(page, '007-erro-geral-abrir-horario');
        return 'HORARIO_OCUPADO';
    }
};

const selecionarServico = async (page, servico) => {
    await Debugger.step(page, '008-inicio-selecionar-servico');
await page.screenshot({ path: 'servico.png', fullPage: true });
    await page.waitForTimeout(1200);

    const areaServico = page.getByText('Serviços', { exact: false }).last();

    await areaServico.click({
        force: true,
        timeout: 5000
    });

    await Debugger.step(page, '009-click-area-servicos');
console.log(await page.locator('body').innerText());
    await page.waitForTimeout(1000);

    const opcaoServico = page
        .getByText(new RegExp(servico, 'i'))
        .last();

    await opcaoServico.click({
        force: true,
        timeout: 5000
    });

    await Debugger.step(page, '010-servico-clicado');

    await page.waitForTimeout(1500);

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

    await page.waitForTimeout(6000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await Debugger.step(page, `016-total-eventos-${total}`);

    const atendimentos = [];

    for (let i = 0; i < total; i++) {
        const texto = await eventos.nth(i).innerText();
        atendimentos.push(texto);
    }

    return atendimentos;
};

const abrirAtendimentoPorCliente = async (page, cliente, telefone) => {
    await Debugger.step(page, '017-inicio-abrir-atendimento');

    await page.waitForTimeout(6000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await Debugger.step(page, `018-total-eventos-abrir-${total}`);

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const texto = await evento.innerText();

        console.log(`[EVENTO ${i}]`, texto);

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

    await page.waitForTimeout(6000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await Debugger.step(page, `022-total-eventos-consulta-${total}`);

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const texto = await eventos.nth(i).innerText();

        console.log(`[CONSULTA EVENTO ${i}]`, texto);

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

    await page.getByText('DELETAR', { exact: false }).click();

    await Debugger.step(page, '025-clicou-deletar');

    await page.waitForTimeout(1000);

    await page.getByText('SIM', { exact: false }).click();

    await page.waitForTimeout(3000);

    await Debugger.step(page, '026-deletado');
};

const alterarHorarioAgendamento = async (page, novoHorario) => {
    await Debugger.step(page, '027-inicio-alterar-horario');

    await page.waitForTimeout(1000);

    await page.getByText('EDITAR', { exact: false }).click();

    await page.waitForTimeout(2000);

    await Debugger.step(page, '028-tela-editar-aberta');

    const inputs = page.locator('input');
    const total = await inputs.count();

    let campoHora = null;

    for (let i = 0; i < total; i++) {
        const input = inputs.nth(i);
        const valor = await input.inputValue().catch(() => '');

        if (/^\d{2}:\d{2}$/.test(valor)) {
            campoHora = input;
            break;
        }
    }

    if (!campoHora) {
        await Debugger.step(page, '029-campo-horario-nao-encontrado');
        throw new Error('Campo de horário não encontrado.');
    }

    await campoHora.click();
    await campoHora.fill('');
    await campoHora.fill(novoHorario);

    await page.waitForTimeout(800);

    await Debugger.step(page, '030-horario-alterado');

    await page.getByRole('button', { name: /salvar/i }).click();

    await page.waitForTimeout(3000);

    await Debugger.step(page, '031-alteracao-salva');
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