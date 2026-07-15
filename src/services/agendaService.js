const {
    abrirHorario
} = require('./agendaHorarioService');

const {
    selecionarServico
} = require('./agendaServicoService');

const {
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento,
    alterarHorarioAgendamento,
    ajustarHorarioNoModal
} = require('./agendaAtendimentoService');

module.exports = {
    abrirHorario,
    selecionarServico,
    salvarAgendamento,
    listarAtendimentosDoDia,
    abrirAtendimentoPorCliente,
    consultarAtendimentoPorCliente,
    deletarAgendamento,
    alterarHorarioAgendamento,
    ajustarHorarioNoModal
};