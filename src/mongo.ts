import { MongoClient, type Db } from "mongodb";
import { logger } from "./logger.js";


export async function createMongoClient(): Promise<MongoClient> {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        logger.fatal("MONGO_URI не задан!");
        throw new Error("MONGO_URI is not set");   
    }

    const client = new MongoClient(uri);
    await client.connect();
    return client;
}

export async function createMongoDb(): Promise<Db> {
    const client = await createMongoClient();
    const dbName = process.env.MONGO_DB ?? "old_data_requests";;
    return client.db(dbName);
}
