import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { DatabaseConfig } from '../../types';

export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = { type: 'sqlite', path: './data/contentfilter.db' }) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure data directory exists
        const dbPath = path.dirname(this.config.path!);
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }

        // Open database
        this.db = new sqlite3.Database(this.config.path!, (err) => {
          if (err) {
            reject(new Error(`Failed to open database: ${err.message}`));
            return;
          }

          // Enable foreign keys and WAL mode
          this.db!.run('PRAGMA foreign_keys = ON');
          this.db!.run('PRAGMA journal_mode = WAL');
          this.db!.run('PRAGMA synchronous = NORMAL');
          this.db!.run('PRAGMA cache_size = 1000000');
          this.db!.run('PRAGMA temp_store = memory');

          // Create tables
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        preferences TEXT NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      // Content analysis table
      `CREATE TABLE IF NOT EXISTS content_analysis (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        category TEXT NOT NULL,
        risk_score REAL NOT NULL,
        is_blocked BOOLEAN NOT NULL,
        analysis_time DATETIME NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Filtering rules table
      `CREATE TABLE IF NOT EXISTS filtering_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pattern TEXT NOT NULL,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Blocklists table
      `CREATE TABLE IF NOT EXISTS blocklists (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL, -- 'domain', 'category', 'custom'
        value TEXT NOT NULL,
        category TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // System events table
      `CREATE TABLE IF NOT EXISTS system_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        severity TEXT NOT NULL DEFAULT 'medium',
        is_resolved BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Security events table
      `CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        is_resolved BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_content_analysis_url ON content_analysis(url)',
      'CREATE INDEX IF NOT EXISTS idx_content_analysis_time ON content_analysis(analysis_time)',
      'CREATE INDEX IF NOT EXISTS idx_content_analysis_user ON content_analysis(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(type)',
      'CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type)',
      'CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_blocklists_type ON blocklists(type)',
      'CREATE INDEX IF NOT EXISTS idx_blocklists_value ON blocklists(value)'
    ];

    for (const sql of indexes) {
      await this.run(sql);
    }
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close(err => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }

  // User management methods
  async createUser(userData: {
    id: string;
    email: string;
    passwordHash: string;
    role?: string;
    preferences?: string;
  }): Promise<void> {
    await this.run(
      `INSERT INTO users (id, email, password_hash, role, preferences, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role || 'user',
        userData.preferences || '{}'
      ]
    );
  }

  async getUserById(id: string): Promise<any> {
    return await this.get(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
  }

  async getUserByEmail(email: string): Promise<any> {
    return await this.get(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
  }

  async updateUser(id: string, updates: Record<string, any>): Promise<void> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await this.run(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  // Content analysis methods
  async saveContentAnalysis(analysis: {
    id: string;
    url: string;
    content: string;
    contentType: string;
    category: string;
    riskScore: number;
    isBlocked: boolean;
    metadata: string;
    userId?: string;
  }): Promise<void> {
    await this.run(
      `INSERT INTO content_analysis
       (id, url, content, content_type, category, risk_score, is_blocked, analysis_time, metadata, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
      [
        analysis.id,
        analysis.url,
        analysis.content,
        analysis.contentType,
        analysis.category,
        analysis.riskScore,
        analysis.isBlocked,
        analysis.metadata,
        analysis.userId
      ]
    );
  }

  async getContentAnalysisById(id: string): Promise<any> {
    return await this.get('SELECT * FROM content_analysis WHERE id = ?', [id]);
  }

  async getContentAnalysisByUser(userId: string, limit: number = 100): Promise<any[]> {
    return await this.all(
      'SELECT * FROM content_analysis WHERE user_id = ? ORDER BY analysis_time DESC LIMIT ?',
      [userId, limit]
    );
  }

  // System events methods
  async logSystemEvent(event: {
    id: string;
    type: string;
    userId?: string;
    details: string;
    severity?: string;
  }): Promise<void> {
    await this.run(
      `INSERT INTO system_events (id, type, timestamp, user_id, details, severity)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
      [
        event.id,
        event.type,
        event.userId,
        event.details,
        event.severity || 'medium'
      ]
    );
  }

  async getSystemEvents(limit: number = 100): Promise<any[]> {
    return await this.all(
      'SELECT * FROM system_events ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }

  // Security events methods
  async logSecurityEvent(event: {
    id: string;
    type: string;
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    details: string;
  }): Promise<void> {
    await this.run(
      `INSERT INTO security_events (id, type, timestamp, user_id, ip_address, user_agent, details)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)`,
      [
        event.id,
        event.type,
        event.userId,
        event.ipAddress,
        event.userAgent,
        event.details
      ]
    );
  }

  async getSecurityEvents(limit: number = 100): Promise<any[]> {
    return await this.all(
      'SELECT * FROM security_events ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }

  // Statistics methods
  async getStatistics(): Promise<any> {
    const stats = await this.all(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users,
        (SELECT COUNT(*) FROM content_analysis WHERE analysis_time >= date('now', '-24 hours')) as analyses_24h,
        (SELECT COUNT(*) FROM content_analysis WHERE is_blocked = 1 AND analysis_time >= date('now', '-24 hours')) as blocked_24h,
        (SELECT COUNT(*) FROM system_events WHERE timestamp >= date('now', '-24 hours')) as events_24h,
        (SELECT COUNT(*) FROM security_events WHERE timestamp >= date('now', '-24 hours')) as security_events_24h
    `);

    return stats[0] || {};
  }
}