import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'final_override.db');

export class DatabaseManager {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
    this.isReady = false;
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async init() {
    if (this.isReady) return;

    // Enable WAL mode
    await this.run('PRAGMA journal_mode = WAL;');
    await this.run('PRAGMA foreign_keys = ON;');

    // Schema
    await this.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        coordinator TEXT NOT NULL,
        team_pin TEXT NOT NULL,
        current_stage INTEGER DEFAULT 1,
        is_completed INTEGER DEFAULT 0,
        start_time INTEGER DEFAULT NULL,
        end_time INTEGER DEFAULT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_leader INTEGER DEFAULT 0,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS devices (
        token TEXT PRIMARY KEY,
        team_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        bound_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS progress (
        team_id INTEGER NOT NULL,
        stage INTEGER NOT NULL,
        fragment TEXT NOT NULL,
        solved_at INTEGER NOT NULL,
        wrong_attempts INTEGER DEFAULT 0,
        hints_used INTEGER DEFAULT 0,
        PRIMARY KEY (team_id, stage),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS hint_unlocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        stage INTEGER NOT NULL,
        n INTEGER NOT NULL,
        unlocked_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        penalty_seconds INTEGER NOT NULL,
        UNIQUE (team_id, stage, n),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        at INTEGER NOT NULL,
        penalty_seconds INTEGER DEFAULT 120,
        waived INTEGER DEFAULT 0,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        stage INTEGER NOT NULL,
        answer TEXT NOT NULL,
        at INTEGER NOT NULL,
        ok INTEGER NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS notes (
        team_id INTEGER PRIMARY KEY,
        text TEXT DEFAULT '',
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS hints (
        stage INTEGER NOT NULL,
        n INTEGER NOT NULL,
        text TEXT NOT NULL,
        PRIMARY KEY (stage, n)
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS stage_data (
        team_id INTEGER NOT NULL,
        stage INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (team_id, stage, key),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at INTEGER NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT
      );
    `);

    // Safe initial settings
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('paused', '0')");
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('paused_at', '0')");
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('paused_accum_ms', '0')");

    this.isReady = true;
  }
}

export const db = new DatabaseManager();
