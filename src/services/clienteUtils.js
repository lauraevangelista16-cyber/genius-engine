function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function normalizarTelefone(telefone) {
    return String(telefone || '').replace(/\D/g, '');
}

function nomeExato(textoOpcao, cliente) {
    const clienteNormalizado = normalizarTexto(cliente);

    return String(textoOpcao || '')
        .split('\n')
        .map(linha => normalizarTexto(linha))
        .filter(Boolean)
        .some(linha => linha === clienteNormalizado);
}

function nomeContem(textoOpcao, cliente) {
    const textoNormalizado = normalizarTexto(textoOpcao);
    const clienteNormalizado = normalizarTexto(cliente);

    return clienteNormalizado && textoNormalizado.includes(clienteNormalizado);
}

function telefoneExiste(textoOpcao) {
    return normalizarTelefone(textoOpcao).length >= 8;
}

function telefoneCombina(textoOpcao, telefone) {
    const telefoneCliente = normalizarTelefone(telefone);
    const telefoneOpcao = normalizarTelefone(textoOpcao);

    if (!telefoneCliente || !telefoneOpcao) return false;

    return (
        telefoneOpcao.includes(telefoneCliente) ||
        telefoneCliente.includes(telefoneOpcao)
    );
}

module.exports = {
    normalizarTexto,
    normalizarTelefone,
    nomeExato,
    nomeContem,
    telefoneExiste,
    telefoneCombina
};