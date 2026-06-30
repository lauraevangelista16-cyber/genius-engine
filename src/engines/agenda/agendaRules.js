const SERVICOS = require('../../config/servicos');

const HORARIOS_FUNCIONAMENTO = [
    { inicio: 8 * 60, fim: 12 * 60 },
    { inicio: 13 * 60, fim: 18 * 60 }
];

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function horarioParaMinutos(horario) {
    const texto = String(horario || '').replace(':', '');

    if (texto === '30') return 8 * 60 + 30;
    if (texto === '00') return 8 * 60;

    const [hora, minuto] = String(horario).split(':').map(Number);
    return hora * 60 + minuto;
}

function minutosParaHorario(minutos) {
    const hora = Math.floor(minutos / 60);
    const minuto = minutos % 60;

    return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function obterDuracaoDoServico(servico) {
    const servicoNormalizado = normalizarTexto(servico);
    return SERVICOS[servicoNormalizado] || 60;
}

function textoHorarioParaMinutos(horario) {
    const [hora, minuto] = horario.split(':').map(Number);
    return hora * 60 + minuto;
}

function extrairIntervaloDoAtendimento(texto) {
    const regex = /(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/;
    const resultado = texto.match(regex);

    if (!resultado) return null;

    return {
        inicio: textoHorarioParaMinutos(resultado[1]),
        fim: textoHorarioParaMinutos(resultado[2]),
        texto
    };
}

function existeConflito(inicioNovo, fimNovo, atendimentos) {
    for (const atendimento of atendimentos) {
        const intervalo = extrairIntervaloDoAtendimento(atendimento);

        if (!intervalo) continue;

        const conflito =
            inicioNovo < intervalo.fim &&
            fimNovo > intervalo.inicio;

        if (conflito) return intervalo;
    }

    return null;
}

function estaDentroDoHorarioFuncionamento(inicio, fim) {
    return HORARIOS_FUNCIONAMENTO.some((periodo) => {
        return inicio >= periodo.inicio && fim <= periodo.fim;
    });
}

function buscarProximoHorarioLivre(inicioSolicitado, duracao, atendimentos) {
    let horarioAtual = inicioSolicitado;

    while (horarioAtual < 18 * 60) {
        const fimAtual = horarioAtual + duracao;

        if (!estaDentroDoHorarioFuncionamento(horarioAtual, fimAtual)) {
            if (horarioAtual < 12 * 60) {
                horarioAtual = 13 * 60;
                continue;
            }

            horarioAtual += 30;
            continue;
        }

        const conflito = existeConflito(horarioAtual, fimAtual, atendimentos);

        if (!conflito) {
            return minutosParaHorario(horarioAtual);
        }

        horarioAtual = conflito.fim;
    }

    return null;
}

function gerarHorariosLivres(duracao, atendimentos, limite = 6) {
    const horariosLivres = [];

    for (const periodo of HORARIOS_FUNCIONAMENTO) {
        let horarioAtual = periodo.inicio;

        while (horarioAtual + duracao <= periodo.fim) {
            const fimAtual = horarioAtual + duracao;
            const conflito = existeConflito(horarioAtual, fimAtual, atendimentos);

            if (!conflito) {
                horariosLivres.push(minutosParaHorario(horarioAtual));

                if (horariosLivres.length >= limite) {
                    return horariosLivres;
                }

                horarioAtual += 30;
                continue;
            }

            horarioAtual = conflito.fim;
        }
    }

    return horariosLivres;
}

module.exports = {
    HORARIOS_FUNCIONAMENTO,
    normalizarTexto,
    horarioParaMinutos,
    minutosParaHorario,
    obterDuracaoDoServico,
    extrairIntervaloDoAtendimento,
    existeConflito,
    estaDentroDoHorarioFuncionamento,
    buscarProximoHorarioLivre,
    gerarHorariosLivres
};