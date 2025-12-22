import { createClient } from "redis";


export async function createRedis() {
    const host = process.env.REDIS_HOST ?? "redis";
    const port = Number(process.env.REDIS_PORT ?? "6379");
    const password = process.env.REDIS_PASSWORD || undefined;

    const client = createClient({
        socket: { host, port },
        password
    });

    client.on("error", (err) => {
        console.error("Redis error:", err);
    });

    await client.connect();
    return client;
}
