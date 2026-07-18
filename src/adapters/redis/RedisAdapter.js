const { createClient } = require('redis');

class RedisAdapter {
    constructor() {
        this.client = null;
        this.connectingPromise = null;
    }

    createClient() {
        const redisUrl = process.env.REDIS_URL;

        if (!redisUrl) {
            throw new Error('REDIS_URL não foi configurada.');
        }

        const client = createClient({
            url: redisUrl
        });

        client.on('error', (error) => {
            console.error('[Redis] Erro:', error.message);
        });

        client.on('connect', () => {
            console.log('[Redis] Conectando...');
        });

        client.on('ready', () => {
            console.log('[Redis] Conexão pronta.');
        });

        client.on('reconnecting', () => {
            console.log('[Redis] Reconectando...');
        });

        client.on('end', () => {
            console.log('[Redis] Conexão encerrada.');
        });

        return client;
    }

    async connect() {
        if (this.client?.isReady) {
            return this.client;
        }

        if (this.connectingPromise) {
            return this.connectingPromise;
        }

        if (!this.client) {
            this.client = this.createClient();
        }

        this.connectingPromise = this.client
            .connect()
            .then(() => this.client)
            .finally(() => {
                this.connectingPromise = null;
            });

        return this.connectingPromise;
    }

    async ping() {
        const client = await this.connect();
        return client.ping();
    }

    async get(key) {
        const client = await this.connect();
        return client.get(key);
    }

    async set(key, value, ttlSeconds = null) {
        const client = await this.connect();

        if (ttlSeconds) {
            return client.set(key, value, {
                EX: ttlSeconds
            });
        }

        return client.set(key, value);
    }

    async del(key) {
        const client = await this.connect();
        return client.del(key);
    }

    async exists(key) {
        const client = await this.connect();
        return client.exists(key);
    }

    async expire(key, ttlSeconds) {
        const client = await this.connect();
        return client.expire(key, ttlSeconds);
    }

    async ttl(key) {
        const client = await this.connect();
        return client.ttl(key);
    }

    async disconnect() {
        if (this.client?.isOpen) {
            await this.client.quit();
        }

        this.client = null;
        this.connectingPromise = null;
    }
}

module.exports = new RedisAdapter();