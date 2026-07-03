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

function extrairDadosDoTextoAtendimento(texto) {
    const linhas = String(texto || '')
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

module.exports = {
    normalizarBusca,
    normalizarTelefone,
    atendimentoCombina,
    extrairDadosDoTextoAtendimento
};