const Debugger = require('../core/Debugger');

async function valorInput(page, seletores) {
    for (const seletor of seletores) {
        const campo = page.locator(seletor);
        const total = await campo.count().catch(() => 0);

        if (!total) continue;

        for (let i = 0; i < total; i++) {
            const item = campo.nth(i);
            const visivel = await item.isVisible().catch(() => false);

            if (!visivel) continue;

            const valor = await item.inputValue().catch(() => '');

            if (valor !== undefined) {
                return String(valor || '').trim();
            }
        }
    }

    return '';
}

async function snapshotFormulario(page, etapa) {
    const cliente = await valorInput(page, [
        '#downshift-0-input',
        'input[placeholder*="Cliente" i]',
        'input[name*="cliente" i]'
    ]);

    const servico = await valorInput(page, [
        '#downshift-1-input',
        'input[placeholder*="Serviço" i]',
        'input[name*="servico" i]',
        'input[name*="serviço" i]'
    ]);

    const data = await valorInput(page, [
        'input[name="date"]',
        'input[name="data"]',
        'input[placeholder*="Data" i]',
        'input[aria-label*="Data" i]'
    ]);

    const horario = await valorInput(page, [
        'input[name="startTime"]',
        'input[name="horaInicio"]',
        'input[placeholder*="Hora" i]',
        'input[aria-label*="Hora" i]'
    ]);

    const resumo = `SNAPSHOT-${etapa}-cliente:${cliente || 'vazio'}-data:${data || 'vazio'}-hora:${horario || 'vazio'}-servico:${servico || 'vazio'}`;

    console.log('[FORM_SNAPSHOT]', resumo);

    await Debugger.step(page, resumo).catch(() => {});

    return {
        cliente,
        data,
        horario,
        servico
    };
}

module.exports = {
    snapshotFormulario
};