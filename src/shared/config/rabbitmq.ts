import pg, { Pool, QueryResult } from "pg";
import config from "./config";
import logger from "./logger";

const { Pool: PgPool } = pg;

class PostgresConnection {
  private pool: Pool | null = null;

  getPool(): Pool {
    if (!this.pool) {
      this.pool = new PgPool({
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on("error", (err: Error) => {
        logger.error("Unexpected error on idle PG client", err);
      });

      logger.info("PG Pool Created");
    }
    return this.pool;
  }

  async testConnection(): Promise<void> {
    try {
      const pool = this.getPool();
      const client = await pool.connect();
      const result = await client.query("SELECT NOW()");
      client.release();

      logger.info(`PG connected successfully at ${result.rows[0].now}`);
    } catch (error) {
      logger.error("Failed to connect to PG", error);
      throw error;
    }
  }

  async query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug("Executed query", { text, duration, rows: result.rowCount });
      return result;
    } catch (error: any) {
      logger.error("Query error:", { text, error: error.message });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info("PG pool closed!");
    }
  }
}

export default new PostgresConnection();