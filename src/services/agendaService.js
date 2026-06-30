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

    if (!telefoneNormalizado) {
        return nomeCombina;
    }

    const telefoneCombina = textoTelefone.includes(telefoneNormalizado);

    if (telefoneCombina) {
        return true;
    }

    return nomeCombina;
}

const abrirHorario = async (page, horario) => {
    try {
        await page.waitForTimeout(3000);

        const elementos = page.getByText(horario, { exact: true });
        const total = await elementos.count();

        for (let i = total - 1; i >= 0; i--) {
            try {
                await elementos.nth(i).click({ timeout: 3000 });
                await page.waitForTimeout(1500);

                const abriu = await page
                    .getByText('Criando Atendimento', { exact: false })
                    .isVisible()
                    .catch(() => false);

                if (abriu) {
                    return 'HORARIO_LIVRE';
                }
            } catch (erro) {
                continue;
            }
        }

        return 'HORARIO_OCUPADO';

    } catch (erro) {
        return 'HORARIO_OCUPADO';
    }
};

const selecionarServico = async (page, servico) => {
    await page.waitForTimeout(2000);

    const candidatos = [
        page.getByPlaceholder(/buscar/i),
        page.getByPlaceholder(/servi/i),
        page.locator('input').last(),
        page.locator('textarea').last()
    ];

    let campoServico = null;

    for (const candidato of candidatos) {
        const visivel = await candidato.isVisible().catch(() => false);
        const habilitado = await candidato.isEnabled().catch(() => false);

        if (visivel && habilitado) {
            campoServico = candidato;
            break;
        }
    }

    if (!campoServico) {
        throw new Error('Campo de serviço não encontrado.');
    }

    await campoServico.click();
    await campoServico.fill(servico);
    await page.waitForTimeout(1500);

    await page.getByText(servico, { exact: false }).last().click({
        timeout: 10000
    });

    await page.waitForTimeout(1000);
};

const salvarAgendamento = async (page) => {
    await page.getByRole('button', { name: /salvar/i }).click();
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
            texto: encontrados.map(item => item.texto)
        };
    }

    await encontrados[0].evento.click();
    await page.waitForTimeout(1500);

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
    await page.waitForTimeout(5000);

    const eventos = page.locator('.fc-time-grid-event');
    const total = await eventos.count();

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const texto = await eventos.nth(i).innerText();

        if (atendimentoCombina(texto, cliente, telefone)) {
            encontrados.push(extrairDadosDoTextoAtendimento(texto));
        }
    }

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
    await page.waitForTimeout(1500);

    await page.getByText('DELETAR', { exact: false }).click();

    await page.waitForTimeout(1000);

    await page.getByText('SIM', { exact: false }).click();

    await page.waitForTimeout(3000);
};

const alterarHorarioAgendamento = async (page, novoHorario) => {
    await page.waitForTimeout(1000);

    await page.getByText('EDITAR', { exact: false }).click();

    await page.waitForTimeout(2000);

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
        throw new Error('Campo de horário não encontrado.');
    }

    await campoHora.click();
    await campoHora.fill('');
    await campoHora.fill(novoHorario);

    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /salvar/i }).click();

    await page.waitForTimeout(3000);
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