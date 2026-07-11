const PERIODOS_EXPEDIENTE = [
    {
        inicio: '08:00',
        fim: '12:00'
    },
    {
        inicio: '14:00',
        fim: '18:00'
    }
];


function horarioParaMinutos(horario) {

    if (!horario || typeof horario !== 'string') {
        return null;
    }

    const match = horario.trim().match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
        return null;
    }

    const horas = Number(match[1]);
    const minutos = Number(match[2]);

    if (
        horas < 0 ||
        horas > 23 ||
        minutos < 0 ||
        minutos > 59
    ) {
        return null;
    }

    return (horas * 60) + minutos;

}


function validarHorarioExpediente(horario) {

    const horarioEmMinutos = horarioParaMinutos(horario);

    if (horarioEmMinutos === null) {
        return {
            valido: false,
            status: 'HORARIO_INVALIDO',
            mensagem: 'O horário informado é inválido.'
        };
    }

    const dentroDoExpediente = PERIODOS_EXPEDIENTE.some(
        periodo => {

            const inicio = horarioParaMinutos(periodo.inicio);
            const fim = horarioParaMinutos(periodo.fim);

            return (
                horarioEmMinutos >= inicio &&
                horarioEmMinutos < fim
            );

        }
    );

    if (!dentroDoExpediente) {
        return {
            valido: false,
            status: 'FORA_DO_EXPEDIENTE',
            mensagem:
                'Esse horário está fora do expediente. Escolha um horário dentro do horário de atendimento.'
        };
    }

    return {
        valido: true,
        status: 'HORARIO_DENTRO_DO_EXPEDIENTE'
    };

}


module.exports = {
    validarHorarioExpediente,
    horarioParaMinutos,
    PERIODOS_EXPEDIENTE
};