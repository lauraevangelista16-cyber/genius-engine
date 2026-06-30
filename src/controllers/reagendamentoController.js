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

    const nomeCombina = textoNormalizado.includes(clienteNormalizado);

    if (!telefoneNormalizado) {
        return nomeCombina;
    }

    const telefoneCombina = textoTelefone.includes(telefoneNormalizado);

    return nomeCombina && telefoneCombina;
}

const abrirHorario = async (page, horario) => {
    try {
        await page.getByText(horario).nth(1).click({ timeout: 3000 });
        await page.waitForTimeout(1000);

        const campoClienteApareceu = await page
            .getByRole('textbox', { name: 'Cliente' })
            .isVisible()
            .catch(() => false);

        return campoClienteApareceu ? 'HORARIO_LIVRE' : 'HORARIO_OCUPADO';

    } catch (erro) {
        return 'HORARIO_OCUPADO';
    }
};

const selecionarServico = async (page, servico) => {
    const campoServico = page.getByRole('textbox', {
        name: 'Digite para buscar ou'
    });

    await campoServico.click();
    await campoServico.fill(servico);
    await page.waitForTimeout(1000);

    await page.getByText(servico, { exact: false }).last().click();
};

const salvarAgendamento = async (page) => {
    await page.getByRole('button', { name: 'Salvar' }).click();
    await page.waitForTimeout(2000);
};

const listarAtendimentosDoDia = async (page) => {
    await page.waitForTimeout(5000);

    const eventos = page.locator('.fc-time-grid-event');
    const total = await eventos.count();

    const atendimentos = [];

    for (let i = 0; i < total; i++) {
        const texto = await eventos.nth(i).innerText();
        atendimentos.push(texto);
    }

    return atendimentos;
};

const abrirAtendimentoPorCliente = async (page, cliente, telefone) => {
    await page.waitForTimeout(5000);

    const eventos = page.locator('.fc-time-grid-event');
    const total = await eventos.count();

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const texto = await evento.innerText();

        if (atendimentoCombina(texto, cliente, telefone)) {
            encontrados.push({
                indice: i,
                evento,
                texto
            });
        }
    }

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
            texto: encontrados.map((item) => item.texto)
        };
    }

    await encontrados[0].evento.click();
    await page.waitForTimeout(2000);

    return {
        encontrado: true,
        multiplos: false,
        texto: encontrados[0].texto
    };
};

function extrairDadosDoTextoAtendimento(texto) {
    const linhas = texto
        .split('\n')
        .map((linha) => linha.trim())
        .filter(Boolean);

    const horario = linhas[0] || null;
    const cliente = linhas[1] || null;
    const servico = linhas[2] || null;

    let inicio = null;
    let fim = null;

    if (horario && horario.includes('-')) {
        const partes = horario.split('-').map((parte) => parte.trim());
        inicio = partes[0] || null;
        fim = partes[1] || null;
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
    await page.waitForTimeout(5000);

    const eventos = page.locator('.fc-time-grid-event');
    const total = await eventos.count();

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const texto = await evento.innerText();

        if (atendimentoCombina(texto, cliente, telefone)) {
            encontrados.push(extrairDadosDoTextoAtendimento(texto));
        }
    }

    if (encontrados.length === 0) {
        return {
            encontrado: false,
            multiplos: false,
            inicio: null,
            fim: null,
            horario: null,
            cliente,
            telefone,
            servico: null,
            textoOriginal: null
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
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
        const elementos = Array.from(document.querySelectorAll('button, div, span, p'));

        const botaoDeletar = elementos.find((elemento) => {
            return elemento.innerText && elemento.innerText.trim().toUpperCase() === 'DELETAR';
        });

        if (!botaoDeletar) {
            throw new Error('Botão DELETAR não encontrado.');
        }

        botaoDeletar.click();
    });

    await page.waitForTimeout(1500);

    await page.evaluate(() => {
        const elementos = Array.from(document.querySelectorAll('button, div, span, p'));

        const botaoSim = elementos.find((elemento) => {
            return elemento.innerText && elemento.innerText.trim().toUpperCase() === 'SIM';
        });

        if (!botaoSim) {
            throw new Error('Botão SIM não encontrado.');
        }

        botaoSim.click();
    });

    await page.waitForTimeout(3000);
};

module.exports = {
    abrirHorario,
    selecionarServico,
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento
};