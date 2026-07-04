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
    const horarioNormalizado = normalizarHorario(horarioEsperado);

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

    if (valorHora !== horarioNormalizado) {
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

const abrirHorario = async (page, horario) => {
    await Debugger.step(page, '001-inicio-abrir-horario');

    try {
        await page.waitForTimeout(3000);

        const horarioNormalizado = normalizarHorario(horario);
        const horarioDataTime = horarioParaDataTime(horario);

        if (!horarioNormalizado) {
            return 'ERRO_HORARIO_NAO_INFORMADO';
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

            await page.waitForTimeout(1800);

            const abriu = await modalAtendimentoAberto(page);

            await Debugger.step(page, `005-modal-abriu-celula-${i}-${abriu}`);

            if (abriu) {
                clicou = true;
                break;
            }
        }

        if (!clicou) {
            return 'ERRO_MODAL_NAO_ABRIU';
        }

        const validacao = await validarDataHoraModal(page, horarioNormalizado);

        if (!validacao.ok) {
            return validacao.status;
        }

        return 'HORARIO_LIVRE';

    } catch (erro) {
        console.log('[ERRO abrirHorario]', erro.message);
        await Debugger.step(page, '007-erro-geral-abrir-horario');

        return 'ERRO_ABRIR_HORARIO';
    }
};

module.exports = {
    abrirHorario
};