const Debugger = require('../core/Debugger');

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

module.exports = {
    abrirHorario
};