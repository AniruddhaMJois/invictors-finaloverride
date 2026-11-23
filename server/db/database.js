import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase, isSupabaseConfigured } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
// Ensure PostgreSQL 64-bit integers (BIGINT/BIGSERIAL) are parsed as safe JS numbers
pg.types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

function resolvePgUrl(url) {
  if (!url) return url;
  if (url.includes('.pooler.supabase.com')) return url;
  try {
    const parsed = new URL(url);
    const dbMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (dbMatch) {
      const projectRef = dbMatch[1];
      const region = process.env.SUPABASE_REGION || 'ap-southeast-2';
      parsed.hostname = `aws-0-${region}.pooler.supabase.com`;
      parsed.port = parsed.port === '5432' || !parsed.port ? '6543' : parsed.port;
      if (!parsed.username.includes('.')) {
        parsed.username = `postgres.${projectRef}`;
      }
      return parsed.toString();
    }
  } catch (e) {}

  // Robust fallback for connection strings with special unencoded characters
  if (url.includes('db.') && url.includes('.supabase.co')) {
    const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
    if (match) {
      const projectRef = match[1];
      const region = process.env.SUPABASE_REGION || 'ap-southeast-2';
      let resolved = url.replace(/db\.[a-z0-9]+\.supabase\.co(?::5432)?/, `aws-0-${region}.pooler.supabase.com:6543`);
      if (!resolved.includes(`postgres.${projectRef}`)) {
        resolved = resolved.replace(/(:\/\/)([^:@]+)(:[^@]+@)/, `$1$2.${projectRef}$3`);
      }
      return resolved;
    }
  }

  return url;
}

export class DatabaseManager {
  constructor() {
    const rawPgUrl =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DATABASE_URL ||
      process.env.POSTGRES_URL;

    if (!rawPgUrl) {
      throw new Error(
        'Supabase DATABASE_URL is not configured in .env. Local database has been removed; Supabase PostgreSQL is required.'
      );
    }

    this.pgUrl = resolvePgUrl(rawPgUrl);
    console.log('⚡ DatabaseManager: Running strictly in Supabase PostgreSQL Mode');
    this.pool = new Pool({
      connectionString: this.pgUrl,
      ssl: { rejectUnauthorized: false },
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 25000
    });

    // Guard against unhandled errors on idle clients
    this.pool.on('error', (err) => {
      console.warn('⚠️ Idle PostgreSQL client notice:', err?.message);
    });

    this.isReady = false;
  }

  async executeWithRetry(fn, maxRetries = 1) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isConnErr =
          err.code === 'ECONNRESET' ||
          err.code === 'EPIPE' ||
          err.message?.includes('Connection terminated') ||
          err.message?.includes('connection closed') ||
          err.message?.includes('timeout exceeded') ||
          err.message?.includes('socket has been ended');
        if (attempt < maxRetries && isConnErr) {
          console.warn('⚠️ Retrying database query due to connection reset...');
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        throw err;
      }
    }
  }

  // Translates application SQL syntax to Postgres-compatible query
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

    // Convert INSERT OR IGNORE INTO settings
    translated = translated.replace(
      /INSERT\s+OR\s+IGNORE\s+INTO\s+settings\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO settings ($1) VALUES ($2) ON CONFLICT (key) DO NOTHING'
    );

    // Convert INSERT OR REPLACE INTO progress
    translated = translated.replace(
      /INSERT\s+OR\s+REPLACE\s+INTO\s+progress\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      'INSERT INTO progress ($1) VALUES ($2) ON CONFLICT (team_id, stage) DO UPDATE SET fragment = EXCLUDED.fragment, solved_at = EXCLUDED.solved_at, wrong_attempts = EXCLUDED.wrong_attempts'
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
      'INSERT INTO notes ($1) VALUES ($2) ON CONFLICT (team_id) DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at'
    );

    // Convert empty string literal "" in SQLite to '' in PostgreSQL
    translated = translated.replace(/text\s*=\s*""/gi, "text = ''");

    // Convert integer boolean representations to PostgreSQL BOOLEAN
    translated = translated.replace(/,\s*is_paused,\s*paused_at,\s*paused_accum_ms\)\s*VALUES\s*\((.*)\)/gi, (match, vals) => {
      const parts = vals.split(',').map((s) => s.trim());
      if (parts.length >= 3 && parts[parts.length - 3] === '0') {
        parts[parts.length - 3] = 'FALSE';
      }
      return ', is_paused, paused_at, paused_accum_ms) VALUES (' + parts.join(', ') + ')';
    });
    translated = translated.replace(/,\s*waived\)\s*VALUES\s*\(([^)]+),\s*0\)/gi, ', waived) VALUES ($1, FALSE)');
    translated = translated.replace(/waived\s*=\s*0/gi, 'waived = FALSE');
    translated = translated.replace(/waived\s*=\s*1/gi, 'waived = TRUE');
    translated = translated.replace(/is_paused\s*=\s*0/gi, 'is_paused = FALSE');
    translated = translated.replace(/is_paused\s*=\s*1/gi, 'is_paused = TRUE');
    translated = translated.replace(/is_completed\s*=\s*0/gi, 'is_completed = FALSE');
    translated = translated.replace(/is_completed\s*=\s*1/gi, 'is_completed = TRUE');
    translated = translated.replace(/is_leader\s*=\s*0/gi, 'is_leader = FALSE');
    translated = translated.replace(/is_leader\s*=\s*1/gi, 'is_leader = TRUE');

    // Cast parameter bindings for boolean columns to prevent integer vs boolean mismatch
    translated = translated.replace(
      /(is_paused|is_completed|is_leader|waived)\s*=\s*\$([0-9]+)/gi,
      '$1 = ($2::text = \'1\' OR $2::text = \'true\')'
    );

    // Ensure INSERT returns ID if not present (only for tables with an 'id' column)
    if (
      /^\s*INSERT\s+INTO\s+(?:public\.)?(teams|members|violations|submissions|audit|hint_unlocks|alerts)/i.test(translated) &&
      !/RETURNING/i.test(translated)
    ) {
      translated += ' RETURNING id';
    }

    return translated;
  }

  async run(sql, params = []) {
    const pgSql = this.translateSqlToPg(sql);
    return await this.executeWithRetry(async () => {
      const res = await this.pool.query(pgSql, params);
      const lastID =
        res.rows && res.rows.length > 0 && res.rows[0].id
          ? parseInt(res.rows[0].id, 10)
          : null;
      return { lastID, changes: res.rowCount };
    });
  }

  async get(sql, params = []) {
    const pgSql = this.translateSqlToPg(sql);
    return await this.executeWithRetry(async () => {
      const res = await this.pool.query(pgSql, params);
      return res.rows[0] || null;
    });
  }

  async all(sql, params = []) {
    const pgSql = this.translateSqlToPg(sql);
    return await this.executeWithRetry(async () => {
      const res = await this.pool.query(pgSql, params);
      return res.rows || [];
    });
  }

  async query(sql, params = []) {
    const pgSql = this.translateSqlToPg(sql);
    return await this.executeWithRetry(async () => {
      return await this.pool.query(pgSql, params);
    });
  }

  async init() {
    if (this.isReady) return;

    try {
      // Fast path for serverless: If public.settings already exists, skip running 15 heavy sequential DDL queries
      const quickCheck = await this.pool.query("SELECT 1 FROM public.settings LIMIT 1");
      if (quickCheck && quickCheck.rows) {
        this.isReady = true;
        return;
      }
    } catch (e) {
      // Table doesn't exist yet, proceed to full initialization
    }

    // PostgreSQL Schema Initialization in Supabase
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
        set_id VARCHAR(8) NOT NULL DEFAULT 'A',
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      );
      ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS set_id VARCHAR(8) NOT NULL DEFAULT 'A';
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

    await this.run(`
      CREATE TABLE IF NOT EXISTS public.alerts (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(32) NOT NULL DEFAULT 'coordinator_call',
        coordinator VARCHAR(64) NOT NULL,
        team_id BIGINT,
        team_name VARCHAR(64),
        message TEXT NOT NULL,
        at BIGINT NOT NULL,
        dismissed BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS public.question_sets (
        set_id VARCHAR(8) PRIMARY KEY,
        set_name VARCHAR(64) NOT NULL,
        stage1_answer VARCHAR(64) NOT NULL,
        stage2_answer VARCHAR(64) NOT NULL,
        stage2_phrase VARCHAR(64) NOT NULL,
        stage3_answer VARCHAR(64) NOT NULL,
        stage3_phrase VARCHAR(64) NOT NULL,
        stage4_answer VARCHAR(64) NOT NULL,
        stage4_stations JSONB NOT NULL,
        stage5_answer VARCHAR(64) NOT NULL,
        stage5_hex VARCHAR(64) NOT NULL,
        stage6_answer VARCHAR(128) NOT NULL,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      );
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS public.team_allotments (
        team_number INT PRIMARY KEY,
        set_id VARCHAR(8) NOT NULL REFERENCES public.question_sets(set_id),
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      );
    `);

    // Safe default settings in PostgreSQL
    await this.run("INSERT INTO public.settings (key, value) VALUES ('paused', '0') ON CONFLICT (key) DO NOTHING");
    await this.run("INSERT INTO public.settings (key, value) VALUES ('paused_at', '0') ON CONFLICT (key) DO NOTHING");
    await this.run("INSERT INTO public.settings (key, value) VALUES ('paused_accum_ms', '0') ON CONFLICT (key) DO NOTHING");
    await this.run("INSERT INTO public.settings (key, value) VALUES ('game_started', '0') ON CONFLICT (key) DO NOTHING");

    this.isReady = true;
  }
}

export const db = new DatabaseManager();
export { supabase, isSupabaseConfigured };
