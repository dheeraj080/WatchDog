import mongoose, { Connection } from "mongoose";
import config from "./config.js";
import logger from "./logger.js";

/**
 * MongoDB database manager/connector
 */
class MongoConnection {
    private connection: Connection | null;

    constructor() {
        this.connection = null;
    }

    /**
     * Connect to MongoDB
     */
    async connect(): Promise<Connection> {
        try {
            if (this.connection) {
                logger.info("Mongodb already connected");
                return this.connection;
            }

            await mongoose.connect(config.mongo.uri, {
                dbName: config.mongo.dbName,
            });

            this.connection = mongoose.connection;

            logger.info(`MongoDB connected: ${config.mongo.uri}`);

            // 2. Type 'err' explicitly as Error to fix TS7006
            this.connection.on("error", (err: Error) => {
                logger.error("MongoDB connection error", err);
            });

            this.connection.on("disconnected", () => {
                logger.error("MongoDB Disconnected");
            });

            return this.connection;
        } catch (error) {
            logger.error("Failed to connect to MongoDB:", error);
            throw error;
        }
    }

    /**
     * Disconnect the active MongoDB connection
     */
    async disconnect(): Promise<void> {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                this.connection = null;
                logger.info("Mongodb disconnected!");
            }
        } catch (error) {
            logger.error("Failed to disconnect to MongoDB:", error);
            throw error;
        }
    }

    /**
     * Get the active connection
     */
    getConnection(): Connection | null {
        return this.connection;
    }
}

export default new MongoConnection();