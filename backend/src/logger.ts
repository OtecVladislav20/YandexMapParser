import pino from "pino";

export const logger = pino({
    level: "info",
    transport: {
        targets: [
            { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } },
            { target: "pino/file", options: { destination: process.env.LOG_FILE ?? "/app/app.log", mkdir: true } }
        ]
    }
});
