import pg from 'pg';

const { Pool } = pg;

export class PostgresService {
  private static pool: pg.Pool | null = null;

  static isConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL);
  }

  static getPool(): pg.Pool {
    if (!this.pool) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL is not configured');
      }

      const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

      this.pool = new Pool({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client:', err);
      });

      console.log('🐘 PostgreSQL pool initialized with connection string target.');
    }
    return this.pool;
  }

  static async testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
      const pool = this.getPool();
      const res = await pool.query('SELECT version();');
      return { ok: true, version: res.rows[0]?.version };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
