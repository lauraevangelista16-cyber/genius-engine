const Kernel = require('./Kernel');

const AgendaEngine = require('../engines/agenda/agendaEngine');

Kernel.registrar('agenda', AgendaEngine);

module.exports = Kernel;