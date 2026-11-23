import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to SQLite database file
const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(DB_DIR, 'artha.db');

export class DatabaseService {
  private static instance: DatabaseSync | null = null;
  private static transactionDepth = 0;

  static getDb(): DatabaseSync {
    if (!this.instance) {
      this.instance = new DatabaseSync(DB_PATH);
      
      // Enforce institutional safety pragmas
      this.instance.exec('PRAGMA foreign_keys = ON;');
      this.instance.exec('PRAGMA busy_timeout = 5000;');
      if (DB_PATH !== ':memory:') {
        this.instance.exec('PRAGMA journal_mode = WAL;');
        this.instance.exec('PRAGMA synchronous = NORMAL;');
      }

      this.initSchema();
    }
    return this.instance;
  }

  static initSchema(): void {
    const db = this.instance!;
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(sql);

      // Automated migration for auth and whatsapp columns if database already existed
      try {
        db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT '';");
      } catch {
        // Column already exists
      }
      try {
        db.exec("ALTER TABLE users ADD COLUMN password_salt TEXT DEFAULT '';");
      } catch {
        // Column already exists
      }
      try {
        db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT UNIQUE;");
      } catch {
        // Column already exists
      }
      try {
        db.exec("ALTER TABLE users ADD COLUMN whatsapp_linked INTEGER DEFAULT 0;");
      } catch {
        // Column already exists
      }
    }
  }

  /**
   * Execute an atomic transaction with automatic rollback on error.
   * Supports nested transactions via SQLite savepoints.
   */
  static transaction<T>(callback: () => T): T {
    const db = this.getDb();
    const isRoot = this.transactionDepth === 0;
    this.transactionDepth++;
    const spName = `sp_${this.transactionDepth}`;

    if (isRoot) {
      db.exec('BEGIN TRANSACTION;');
    } else {
      db.exec(`SAVEPOINT ${spName};`);
    }

    try {
      const result = callback();
      if (isRoot) {
        db.exec('COMMIT;');
      } else {
        db.exec(`RELEASE SAVEPOINT ${spName};`);
      }
      return result;
    } catch (error) {
      if (isRoot) {
        try { db.exec('ROLLBACK;'); } catch {}
      } else {
        try { db.exec(`ROLLBACK TO SAVEPOINT ${spName};`); } catch {}
      }
      throw error;
    } finally {
      this.transactionDepth--;
    }
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}

export const getDb = () => DatabaseService.getDb();
export const transaction = <T>(cb: () => T) => DatabaseService.transaction(cb);
