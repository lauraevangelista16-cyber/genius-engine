const Logger = require('../core/Logger');
const Debugger = require('../core/Debugger');

const {
    atendimentoCombina,
    extrairDadosDoTextoAtendimento
} = require('./agendaUtils');

async function step(page, nome) {
    console.log(`[agendaAtendimentoService] ${nome}`);
    await Debugger.step(page, nome).catch(() => {});
}

async function obterTextoTela(page) {
    return await Promise.race([
        page.evaluate(() => document.body ? document.body.innerText : ''),
        new Promise(resolve => setTimeout(() => resolve(''), 3000))
    ]);
}

const salvarAgendamento = async (page) => {
    await step(page, '013-antes-salvar-agendamento');

    const modalAtendimento = page.locator('[role="dialog"]').last();

    const botoesSalvar = modalAtendimento.getByRole('button', { name: /^salvar$/i });
    const total = await botoesSalvar.count().catch(() => 0);

    await step(page, `013B-total-botoes-salvar-atendimento-${total}`);

    if (total === 0) {
        return {
            status: 'ERRO_INTERNO',
            mensagem: 'Botão Salvar do atendimento não encontrado.'
        };
    }

    const botaoSalvar = botoesSalvar.first();

    await botaoSalvar.scrollIntoViewIfNeeded().catch(() => {});

    await step(page, '013C-antes-click-real-salvar');

    await botaoSalvar.click({ force: true, timeout: 10000 });

    await step(page, '014-depois-click-salvar');

    await page.waitForTimeout(3000);

    await step(page, '014B-depois-wait-salvar');

    const textoTela = await obterTextoTela(page);

    await step(page, '014C-texto-tela-coletado');

    if (textoTela.includes('Já existe atendimento')) {
        await step(page, '014C1-horario-ocupado-detectado');

        return {
            status: 'HORARIO_OCUPADO',
            mensagem: 'Esse horário já está ocupado.',
            detalhe: textoTela
        };
    }

    if (
        textoTela.includes('Preencha esse campo para continuar') ||
        textoTela.includes('campo obrigatório') ||
        textoTela.includes('obrigatório')
    ) {
        await step(page, '014C1-dados-incompletos-detectado');

        console.log('[DADOS_INCOMPLETOS_TEXTO]');
        console.log(textoTela);

        return {
            status: 'DADOS_INCOMPLETOS',
            mensagem: 'Existe um campo obrigatório não preenchido no Minha Agenda.',
            detalhe: textoTela
        };
    }

    await step(page, '014C2-passou-validacoes-texto');

    const dialogAberto = await Promise.race([
        page.locator('[role="dialog"]').count().catch(() => 0),
        new Promise(resolve => setTimeout(() => resolve(0), 2000))
    ]);

    await step(page, `014D-dialogs-abertos-${dialogAberto}`);

    const botaoSalvarAindaVisivel = await Promise.race([
        botaoSalvar.isVisible().catch(() => false),
        new Promise(resolve => setTimeout(() => resolve(false), 2000))
    ]);

    await step(page, `014E-botao-salvar-ainda-visivel-${botaoSalvarAindaVisivel}`);

    if (botaoSalvarAindaVisivel) {
        return {
            status: 'ERRO_INTERNO',
            mensagem: 'O sistema clicou em Salvar, mas o modal continuou aberto.',
            detalhe: textoTela
        };
    }

    await step(page, '015-agendamento-salvo');

    return {
        status: 'SALVO'
    };
};

const listarAtendimentosDoDia = async (page) => {
    await step(page, '015-inicio-listar-atendimentos');

    await page.waitForTimeout(4000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await step(page, `016-total-eventos-${total}`);

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

const abrirAtendimentoPorCliente = async (page, cliente, telefone, horario = '', servico = '') => {
    await step(page, '017-inicio-abrir-atendimento');

    Logger.info(`[agendaAtendimentoService] Horário recebido: ${horario}`);
    Logger.info(`[agendaAtendimentoService] Serviço recebido: ${servico}`);

    await page.waitForTimeout(4000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await step(page, `018-total-eventos-abrir-${total}`);

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const visivel = await evento.isVisible().catch(() => false);

        if (!visivel) continue;

        const texto = await evento.innerText().catch(() => '');

        Logger.info(`[agendaAtendimentoService] Evento ${i}: ${texto}`);

        const combinaCliente = atendimentoCombina(texto, cliente, telefone);
        const combinaHorario = horario ? texto.includes(horario) : true;
        const combinaServico = servico
            ? texto.toLowerCase().includes(servico.toLowerCase())
            : true;

        Logger.info(
            `[agendaAtendimentoService] Evento ${i} | combinaCliente=${combinaCliente} | combinaHorario=${combinaHorario} | combinaServico=${combinaServico}`
        );

        if (combinaCliente && combinaHorario && combinaServico) {
            encontrados.push({
                indice: i,
                evento,
                texto
            });
        }
    }

    await step(page, `019-encontrados-abrir-${encontrados.length}`);

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

    await step(page, '020-atendimento-aberto');

    return {
        encontrado: true,
        multiplos: false,
        texto: encontrados[0].texto
    };
};

const consultarAtendimentoPorCliente = async (page, cliente, telefone, horario = '', servico = '') => {
    await step(page, '021-inicio-consultar-atendimento');

    Logger.info(`[agendaAtendimentoService] Horário recebido na consulta: ${horario}`);
    Logger.info(`[agendaAtendimentoService] Serviço recebido na consulta: ${servico}`);

    await page.waitForTimeout(4000);

    const eventos = page.locator('.fc-time-grid-event, .fc-event, .fc-timegrid-event');
    const total = await eventos.count();

    await step(page, `022-total-eventos-consulta-${total}`);

    const encontrados = [];

    for (let i = 0; i < total; i++) {
        const evento = eventos.nth(i);
        const visivel = await evento.isVisible().catch(() => false);

        if (!visivel) continue;

        const texto = await evento.innerText().catch(() => '');

        const combinaCliente = atendimentoCombina(texto, cliente, telefone);
        const combinaHorario = horario ? texto.includes(horario) : true;
        const combinaServico = servico
            ? texto.toLowerCase().includes(servico.toLowerCase())
            : true;

        Logger.info(
            `[agendaAtendimentoService] Consulta evento ${i} | combinaCliente=${combinaCliente} | combinaHorario=${combinaHorario} | combinaServico=${combinaServico}`
        );

        if (combinaCliente && combinaHorario && combinaServico) {
            encontrados.push(extrairDadosDoTextoAtendimento(texto));
        }
    }

    await step(page, `023-encontrados-consulta-${encontrados.length}`);

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
    await step(page, '024-inicio-deletar');

    await page.waitForTimeout(1500);

    await page.getByText('DELETAR', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await step(page, '025-clicou-deletar');

    await page.waitForTimeout(1000);

    await page.getByText('SIM', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(4000);

    await step(page, '026-deletado');
};

const alterarHorarioAgendamento = async (page, novoHorario, novaData = '') => {
    await step(page, '027-inicio-alterar-horario');

    await page.waitForTimeout(1000);

    await page.getByText('EDITAR', { exact: false }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(2000);

    await step(page, '028-tela-editar-aberta');

if (
    typeof novaData === 'string' &&
    novaData.trim() !== ''
) {
    const dataLimpa = novaData.trim();
    const partesData = dataLimpa.split('-');

    if (partesData.length !== 3) {
        return {
            status: 'ERRO_ALTERAR_DATA',
            mensagem: `Formato de nova data inválido: ${novaData}`
        };
    }

    const [ano, mes, dia] = partesData;
    const novaDataFormatada = `${dia}/${mes}/${ano}`;

const modalAtendimento = page.locator('[role="dialog"]').last();

const campoData = modalAtendimento.locator('input[name="date"]');

const totalCamposData = await campoData.count().catch(() => 0);

await step(page, `028A-total-campos-data-${totalCamposData}`);

if (totalCamposData === 0) {
    await step(page, '028B-campo-data-nao-encontrado');

    return {
        status: 'ERRO_INTERNO',
        mensagem: 'Campo de data do atendimento não encontrado.'
    };
}

await campoData.waitFor({
    state: 'visible',
    timeout: 10000
});

await campoData.click({ force: true });
await campoData.fill('');
await campoData.fill(novaDataFormatada);
await page.keyboard.press('Tab');

await page.waitForTimeout(800);

const dataPreenchida = await campoData.inputValue().catch(() => '');

await step(page, `028B-data-alterada-${dataPreenchida.replace(/\//g, '-')}`);

if (dataPreenchida !== novaDataFormatada) {
    return {
        status: 'ERRO_ALTERAR_DATA',
        mensagem: `A data deveria ficar em ${novaDataFormatada}, mas ficou em ${dataPreenchida}.`
    };
}

}
    if (novoHorario) {
        const campoHora = page.locator('input[name="startTime"]');

        await campoHora.waitFor({
            state: 'visible',
            timeout: 10000
        });

        await campoHora.click({ force: true });
        await campoHora.fill('');
        await campoHora.fill(novoHorario);

        await page.waitForTimeout(800);

        await step(page, '029-horario-alterado');
    }

    await page.getByRole('button', { name: /^salvar$/i }).click({
        force: true,
        timeout: 10000
    });

    await page.waitForTimeout(4000);

    await step(page, '030-alteracao-salva');

    return {
        status: 'SALVO'
    };
};

const ajustarHorarioNoModal = async (page, horarioDesejado) => {
    await step(page, '031-inicio-ajustar-horario-modal');

    const modalAtendimento = page.locator('[role="dialog"]').last();

    const campoHora = modalAtendimento.locator('input[name="startTime"]');

    const totalCampos = await campoHora.count().catch(() => 0);

    await step(page, `031A-total-campos-hora-${totalCampos}`);

    if (totalCampos === 0) {
        return {
            status: 'ERRO_CAMPO_HORARIO_NAO_ENCONTRADO',
            mensagem: 'O campo de horário não foi encontrado no modal.'
        };
    }

    await campoHora.waitFor({
        state: 'visible',
        timeout: 10000
    });

    await campoHora.click({ force: true });
    await campoHora.fill('');
    await campoHora.fill(horarioDesejado);

    await page.waitForTimeout(800);

    const horarioPreenchido = await campoHora.inputValue().catch(() => '');

    await step(
        page,
        `031B-horario-modal-${horarioPreenchido.replace(':', '-')}`
    );

    if (horarioPreenchido !== horarioDesejado) {
        return {
            status: 'ERRO_AJUSTAR_HORARIO',
            mensagem: `O campo deveria ficar em ${horarioDesejado}, mas ficou em ${horarioPreenchido}.`
        };
    }

    await step(page, '032-horario-modal-ajustado');

    return {
        status: 'HORARIO_MODAL_AJUSTADO',
        horario: horarioPreenchido
    };
};

module.exports = {
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento,
    alterarHorarioAgendamento,
    ajustarHorarioNoModal
};