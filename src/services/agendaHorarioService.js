const Debugger = require('../core/Debugger');

function normalizarHorario(horario) {
    const texto = String(horario || '').trim();

    if (!texto) return '';

    const match = texto.match(/^(\d{1,2})(?::?(\d{2}))?$/);

    if (!match) return texto;

    const hora = String(match[1]).padStart(2, '0');
    const minuto = String(match[2] || '00').padStart(2, '0');

    return `${hora}:${minuto}`;
}

function horarioParaDataTime(horario) {
    return normalizarHorario(horario).replace(/^0/, '');
}

async function obterValorCampo(page, seletores) {
    for (const seletor of seletores) {
        const campo = page.locator(seletor);
        const existe = await campo.count().catch(() => 0);

        if (!existe) continue;

        const visivel = await campo.first().isVisible().catch(() => false);
        if (!visivel) continue;

        const valor = await campo.first().inputValue().catch(() => '');

        if (valor && String(valor).trim()) {
            return String(valor).trim();
        }
    }

    return '';
}

async function modalAtendimentoAberto(page) {
    return await page
        .getByText('Criando Atendimento', { exact: false })
        .isVisible()
        .catch(() => false);
}

async function validarDataHoraModal(page, horarioEsperado) {
    const horarioNormalizado = horarioEsperado
    ? normalizarHorario(horarioEsperado)
    : '';

    const valorHora = await obterValorCampo(page, [
        'input[name="startTime"]',
        'input[name="horaInicio"]',
        'input[placeholder*="Hora" i]',
        'input[aria-label*="Hora" i]'
    ]);

    await Debugger.step(page, `006-horario-modal-detectado-${valorHora || 'vazio'}`);

    if (!valorHora) {
        return {
            ok: false,
            status: 'ERRO_HORA_MODAL_VAZIA'
        };
    }

    if (
    horarioNormalizado &&
    valorHora !== horarioNormalizado
) {
        return {
            ok: false,
            status: `ERRO_HORARIO_MODAL_DIFERENTE-${valorHora}`
        };
    }

    const valorData = await obterValorCampo(page, [
        'input[name="date"]',
        'input[name="data"]',
        'input[placeholder*="Data" i]',
        'input[aria-label*="Data" i]'
    ]);

    await Debugger.step(page, `006-data-modal-detectada-${valorData || 'vazio'}`);

    if (!valorData) {
        return {
            ok: false,
            status: 'ERRO_DATA_MODAL_VAZIA'
        };
    }

    return {
        ok: true,
        status: 'HORARIO_LIVRE'
    };
}
async function verificarHorarioOcupadoNaGrade(page, horario) {
    const horarioNormalizado = normalizarHorario(horario);
    const [hora, minuto] = horarioNormalizado.split(':').map(Number);

    if (
        Number.isNaN(hora) ||
        Number.isNaN(minuto)
    ) {
        return false;
    }

    const horarioEmMinutos = (hora * 60) + minuto;

    const eventos = page.locator(
        '.fc-time-grid-event, .fc-event, .fc-timegrid-event'
    );

    const totalEventos = await eventos.count().catch(() => 0);
await Debugger.step(
    page,
    `002A-total-eventos-grade-${totalEventos}`
);


    for (let i = 0; i < totalEventos; i++) {
        const evento = eventos.nth(i);

        const visivel = await evento.isVisible().catch(() => false);
        if (!visivel) continue;

        const texto = await evento.innerText().catch(() => '');
const dataStart = await evento.getAttribute('data-start').catch(() => null);
const dataEnd = await evento.getAttribute('data-end').catch(() => null);
const title = await evento.getAttribute('title').catch(() => null);


        const intervalo = texto.match(
            /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/
        );

        if (!intervalo) continue;

        const [horaInicio, minutoInicio] = intervalo[1]
            .split(':')
            .map(Number);

        const [horaFim, minutoFim] = intervalo[2]
            .split(':')
            .map(Number);

        const inicioEmMinutos = (horaInicio * 60) + minutoInicio;
        const fimEmMinutos = (horaFim * 60) + minutoFim;

        if (
            horarioEmMinutos >= inicioEmMinutos &&
            horarioEmMinutos < fimEmMinutos
        ) {
            await Debugger.step(
                page,
                `002B-horario-ocupado-grade-${horarioNormalizado}`
            );

            return true;
        }
    }

    return false;
}
const abrirHorario = async (
    page,
    horario,
    horarioDesejado = horario
) => {
    await Debugger.step(page, '001-inicio-abrir-horario');

    try {
        await page.waitForTimeout(3000);

        const horarioNormalizado = normalizarHorario(horario);
        const horarioDataTime = horarioParaDataTime(horario);

        if (!horarioNormalizado) {
            return 'ERRO_HORARIO_NAO_INFORMADO';
        }
const horarioOcupado = await verificarHorarioOcupadoNaGrade(
    page,
    horarioDesejado
);

if (horarioOcupado) {
    return 'HORARIO_OCUPADO';
}
        const linhaHorario = page.locator(`tr[data-time="${horarioDataTime}"]`);
        const totalLinhas = await linhaHorario.count();

        await Debugger.step(page, `002-linha-horario-${horarioDataTime}-${totalLinhas}`);

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

        let encontrouCelulaOcupada = false;

        for (let i = totalCelulas - 1; i >= 0; i--) {
            const celula = celulas.nth(i);
            const visivel = await celula.isVisible().catch(() => false);
            const box = await celula.boundingBox().catch(() => null);

            if (!visivel || !box || box.width < 10 || box.height < 10) {
                continue;
            }

            const textoCelula = (await celula.innerText().catch(() => '')).trim();

            await Debugger.step(
                page,
                `004-tentando-celula-${i}-texto-${textoCelula || 'vazio'}`
            );

            if (textoCelula && textoCelula.toLowerCase().includes('unha')) {
                encontrouCelulaOcupada = true;
                await Debugger.step(page, `004B-celula-ocupada-${i}`);
                continue;
            }

            await celula.click({ force: true, timeout: 5000 }).catch(async () => {
                await page.mouse.click(
                    box.x + box.width / 2,
                    box.y + box.height / 2
                );
            });

            await page.waitForTimeout(1000);

            let abriu = await modalAtendimentoAberto(page);

            if (!abriu) {
                await celula.dblclick({ force: true, timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(1000);
                abriu = await modalAtendimentoAberto(page);
            }

            if (!abriu) {
                await page.mouse.click(
                    box.x + box.width / 2,
                    box.y + box.height / 2
                );
                await page.waitForTimeout(1000);
                abriu = await modalAtendimentoAberto(page);
            }

            await Debugger.step(page, `005-modal-abriu-celula-${i}-${abriu}`);

            if (abriu) {
                const abriuPorFallback =
    normalizarHorario(horarioDesejado) !== horarioNormalizado;

const validacao = await validarDataHoraModal(
    page,
    abriuPorFallback
        ? null
        : horarioNormalizado
);

if (!validacao.ok) {
    return validacao.status;
}

                return 'HORARIO_LIVRE';
            }
        }

        if (encontrouCelulaOcupada) {
            await Debugger.step(page, '006-horario-ocupado-detectado-sem-modal');
            return 'HORARIO_OCUPADO';
        }

        return 'ERRO_MODAL_NAO_ABRIU';

    } catch (erro) {
        await Debugger.step(page, '007-erro-geral-abrir-horario');

        return 'ERRO_ABRIR_HORARIO';
    }
};

module.exports = {
    abrirHorario
};

