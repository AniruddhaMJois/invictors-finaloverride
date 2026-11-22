import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase, isSupabaseConfigured } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_PATH = path.join(__dirname, 'final_override.db');
const { Pool } = pg;

export class DatabaseManager {
  constructor() {
    this.pgUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL;
    this.isPg = Boolean(this.pgUrl);
    this.isReady = false;

    if (this.isPg) {
      console.log('⚡ DatabaseManager: Running in Supabase PostgreSQL Mode');
      this.pool = new Pool({
        connectionString: this.pgUrl,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
      this.sqliteDb = null;
    } else {
      console.log('📦 DatabaseManager: Running in Local SQLite Mode');
      this.sqliteDb = new sqlite3.Database(DB_PATH);
      this.pool = null;
    }
  }

  // Translates SQLite syntax to Postgres compatible query
  translateSqlToPg(sql) {
    let paramIdx = 1;
    let translated = sql;

    // Convert ? to $1, $2, ...
    translated = translated.replace(/\?/g, () => `$${paramIdx++}`);

    // Convert strftime to extract epoch
    translated = translated.replace(
      /strftime\('%s',\s*'now'\)\s*\*\s*1000/gi,
      '(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT'
    );

    // Convert INSERT OR IGNORE INTO
    translated = translated.replace(
      /INSERT\s+OR\s+IGNORE\s+INTO\s+settings\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO settings ($1) VALUES ($2) ON CONFLICT (key) DO NOTHING'
    );

    // Convert INSERT OR REPLACE INTO hints
    translated = translated.replace(
      /INSERT\s+OR\s+REPLACE\s+INTO\s+hints\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO hints ($1) VALUES ($2) ON CONFLICT (stage, n) DO UPDATE SET text = EXCLUDED.text'
    );

    // Convert INSERT OR REPLACE INTO stage_data
    translated = translated.replace(
      /INSERT\s+OR\s+REPLACE\s+INTO\s+stage_data\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO stage_data ($1) VALUES ($2) ON CONFLICT (team_id, stage, key) DO UPDATE SET value = EXCLUDED.value'
    );

    // Convert INSERT OR REPLACE INTO settings
    translated = translated.replace(
      /INSERT\s+OR\s+REPLACE\s+INTO\s+settings\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO settings ($1) VALUES ($2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
    );

    // Convert INSERT OR REPLACE INTO notes
    translated = translated.replace(
      /INSERT\s+OR\s+REPLACE\s+INTO\s+notes\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO notes ($1) VALUES ($2) ON CONFLICT (team_id) DO UPDATE SET text = EXCLUDED.text'
    );

    // Convert integer boolean representations to PostgreSQL BOOLEAN
    translated = translated.replace(/,\s*is_paused,\s*paused_at,\s*paused_accum_ms\)\s*VALUES\s*\(([^)]+),\s*0,\s*0,\s*0\)/gi, ', is_paused, paused_at, paused_accum_ms) VALUES ($1, FALSE, 0, 0)');
    translated = translated.replace(/,\s*waived\)\s*VALUES\s*\(([^)]+),\s*0\)/gi, ', waived) VALUES ($1, FALSE)');
    translated = translated.replace(/waived\s*=\s*0/gi, 'waived = FALSE');
    translated = translated.replace(/waived\s*=\s*1/gi, 'waived = TRUE');
    translated = translated.replace(/is_paused\s*=\s*0/gi, 'is_paused = FALSE');
    translated = translated.replace(/is_paused\s*=\s*1/gi, 'is_paused = TRUE');
    translated = translated.replace(/is_completed\s*=\s*0/gi, 'is_completed = FALSE');
    translated = translated.replace(/is_completed\s*=\s*1/gi, 'is_completed = TRUE');
    translated = translated.replace(/is_leader\s*=\s*0/gi, 'is_leader = FALSE');
    translated = translated.replace(/is_leader\s*=\s*1/gi, 'is_leader = TRUE');

    // Ensure INSERT returns ID if not present (only for tables with an 'id' column)
    if (
      /^\s*INSERT\s+INTO\s+(teams|members|violations|submissions|audit|hint_unlocks)/i.test(translated) &&
      !/RETURNING/i.test(translated)
    ) {
      translated += ' RETURNING id';
    }

    return translated;
  }

  async run(sql, params = []) {
    if (this.isPg) {
      const pgSql = this.translateSqlToPg(sql);
      const res = await this.pool.query(pgSql, params);
      const lastID = res.rows && res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : null;
      return { lastID, changes: res.rowCount };
    }

    return new Promise((resolve, reject) => {
      this.sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    if (this.isPg) {
      const pgSql = this.translateSqlToPg(sql);
      const res = await this.pool.query(pgSql, params);
      return res.rows[0] || null;
    }

    return new Promise((resolve, reject) => {
      this.sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    if (this.isPg) {
      const pgSql = this.translateSqlToPg(sql);
      const res = await this.pool.query(pgSql, params);
      return res.rows || [];
    }

    return new Promise((resolve, reject) => {
      this.sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async init() {
    if (this.isReady) return;

    if (this.isPg) {
      // PostgreSQL Schema Initialization
      await this.run(`
        CREATE TABLE IF NOT EXISTS public.teams (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(32) UNIQUE NOT NULL,
          coordinator VARCHAR(32) NOT NULL,
          team_pin VARCHAR(16) NOT NULL,
          current_stage INT NOT NULL DEFAULT 1,
          is_completed BOOLEAN NOT NULL DEFAULT FALSE,
          start_time BIGINT DEFAULT NULL,
          end_time BIGINT DEFAULT NULL,
          is_paused BOOLEAN NOT NULL DEFAULT FALSE,
          paused_at BIGINT NOT NULL DEFAULT 0,
          paused_accum_ms BIGINT NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.members (
          id BIGSERIAL PRIMARY KEY,
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          name VARCHAR(64) NOT NULL,
          is_leader BOOLEAN NOT NULL DEFAULT FALSE
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.devices (
          token TEXT PRIMARY KEY,
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          member_id BIGINT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
          bound_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.progress (
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          stage INT NOT NULL,
          fragment TEXT NOT NULL,
          solved_at BIGINT NOT NULL,
          wrong_attempts INT NOT NULL DEFAULT 0,
          hints_used INT NOT NULL DEFAULT 0,
          PRIMARY KEY (team_id, stage)
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.hint_unlocks (
          id BIGSERIAL PRIMARY KEY,
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          stage INT NOT NULL,
          n INT NOT NULL,
          unlocked_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL,
          penalty_seconds INT NOT NULL,
          UNIQUE (team_id, stage, n)
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.violations (
          id BIGSERIAL PRIMARY KEY,
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          at BIGINT NOT NULL,
          penalty_seconds INT NOT NULL DEFAULT 120,
          waived BOOLEAN NOT NULL DEFAULT FALSE
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.submissions (
          id BIGSERIAL PRIMARY KEY,
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          stage INT NOT NULL,
          answer TEXT NOT NULL,
          at BIGINT NOT NULL,
          ok BOOLEAN NOT NULL
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.notes (
          team_id BIGINT PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
          text TEXT NOT NULL DEFAULT '',
          updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.settings (
          key VARCHAR(64) PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.hints (
          stage INT NOT NULL,
          n INT NOT NULL,
          text TEXT NOT NULL,
          PRIMARY KEY (stage, n)
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.stage_data (
          team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
          stage INT NOT NULL,
          key VARCHAR(64) NOT NULL,
          value TEXT NOT NULL,
          PRIMARY KEY (team_id, stage, key)
        );
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS public.audit (
          id BIGSERIAL PRIMARY KEY,
          at BIGINT NOT NULL,
          actor VARCHAR(64) NOT NULL,
          action VARCHAR(64) NOT NULL,
          detail TEXT
        );
      `);

      // Safe default settings in PostgreSQL
      await this.run("INSERT INTO public.settings (key, value) VALUES ('paused', '0') ON CONFLICT (key) DO NOTHING");
      await this.run("INSERT INTO public.settings (key, value) VALUES ('paused_at', '0') ON CONFLICT (key) DO NOTHING");
      await this.run("INSERT INTO public.settings (key, value) VALUES ('paused_accum_ms', '0') ON CONFLICT (key) DO NOTHING");
      await this.run("INSERT INTO public.settings (key, value) VALUES ('game_started', '0') ON CONFLICT (key) DO NOTHING");

      this.isReady = true;
      return;
    }

    // SQLite Initialization
    await this.run('PRAGMA journal_mode = WAL;');
    await this.run('PRAGMA foreign_keys = ON;');

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

    // Safe initial settings in SQLite
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('paused', '0')");
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('paused_at', '0')");
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('paused_accum_ms', '0')");
    await this.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('game_started', '0')");

    // Per-team pause column migrations
    try {
      await this.run('ALTER TABLE teams ADD COLUMN is_paused INTEGER DEFAULT 0;');
    } catch (e) {}
    try {
      await this.run('ALTER TABLE teams ADD COLUMN paused_at INTEGER DEFAULT 0;');
    } catch (e) {}
    try {
      await this.run('ALTER TABLE teams ADD COLUMN paused_accum_ms INTEGER DEFAULT 0;');
    } catch (e) {}

    this.isReady = true;
  }
}

export const db = new DatabaseManager();
export { supabase, isSupabaseConfigured };
