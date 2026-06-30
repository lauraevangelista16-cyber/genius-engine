class Logger {
    info(mensagem) {
        console.log(`[INFO] ${mensagem}`);
    }

    success(mensagem) {
        console.log(`[OK] ${mensagem}`);
    }

    warn(mensagem) {
        console.log(`[AVISO] ${mensagem}`);
    }

    error(mensagem) {
        console.log(`[ERRO] ${mensagem}`);
    }
}

module.exports = new Logger();