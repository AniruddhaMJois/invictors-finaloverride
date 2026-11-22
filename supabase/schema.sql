-- ============================================================================
-- FINAL OVERRIDE — Supabase PostgreSQL Schema Migration
-- ============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TEAMS TABLE
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

CREATE INDEX IF NOT EXISTS idx_teams_coordinator ON public.teams(coordinator);
CREATE INDEX IF NOT EXISTS idx_teams_current_stage ON public.teams(current_stage);

-- 2. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_members_team_id ON public.members(team_id);

-- 3. DEVICES TABLE
CREATE TABLE IF NOT EXISTS public.devices (
    token TEXT PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    bound_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_devices_team_id ON public.devices(team_id);

-- 4. PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.progress (
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    stage INT NOT NULL,
    fragment TEXT NOT NULL,
    solved_at BIGINT NOT NULL,
    wrong_attempts INT NOT NULL DEFAULT 0,
    hints_used INT NOT NULL DEFAULT 0,
    PRIMARY KEY (team_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_progress_team ON public.progress(team_id);

-- 5. HINT UNLOCKS TABLE
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

CREATE INDEX IF NOT EXISTS idx_hint_unlocks_team ON public.hint_unlocks(team_id, stage);

-- 6. VIOLATIONS TABLE (Tab switches)
CREATE TABLE IF NOT EXISTS public.violations (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    at BIGINT NOT NULL,
    penalty_seconds INT NOT NULL DEFAULT 120,
    waived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_violations_team ON public.violations(team_id);

-- 7. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    stage INT NOT NULL,
    answer TEXT NOT NULL,
    at BIGINT NOT NULL,
    ok BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_team ON public.submissions(team_id, stage);

-- 8. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    team_id BIGINT PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
    text TEXT NOT NULL DEFAULT '',
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 9. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL
);

-- 10. HINTS REPOSITORY TABLE
CREATE TABLE IF NOT EXISTS public.hints (
    stage INT NOT NULL,
    n INT NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (stage, n)
);

-- 11. STAGE DATA REPOSITORY TABLE
CREATE TABLE IF NOT EXISTS public.stage_data (
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    stage INT NOT NULL,
    key VARCHAR(64) NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (team_id, stage, key)
);

-- 12. AUDIT TRAIL TABLE
CREATE TABLE IF NOT EXISTS public.audit (
    id BIGSERIAL PRIMARY KEY,
    at BIGINT NOT NULL,
    actor VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_at ON public.audit(at DESC);

-- Default Settings Initialization
INSERT INTO public.settings (key, value) VALUES
    ('paused', '0'),
    ('paused_at', '0'),
    ('paused_accum_ms', '0'),
    ('game_started', '0')
ON CONFLICT (key) DO NOTHING;

-- Initial Hints Seed
INSERT INTO public.hints (stage, n, text) VALUES
    (1, 1, 'Reveals 15-character international Morse code chart: A(•—), B(—•••), C(—•—•), D(—••), E(•), F(••—•), G(——•), H(••••), I(••), J(•———), K(—•—), N(—•), O(———), V(•••—), Z(——••).'),
    (1, 2, 'Combining the 4 sectors yields the 4-letter cosmic word NOVA.'),
    (2, 1, 'Structural markers: Base64 has ''=='' padding; Hex has byte pairs; ROT13 has English frequency distribution.'),
    (2, 2, 'Sequential order: Base64 Decode -> Hex Decode -> ROT13 Shift. Record both the key fragment (7K2) and the secret access phrase (AURORA).'),
    (3, 1, 'WARDEN requires the access phrase AURORA from Stage 2.'),
    (3, 2, 'Write a professional statement of 10 or more words that says who you are and asks for the fragment.'),
    (4, 1, 'Each station hides ONE character. Find all three and join them in order (Station 1 + 2 + 3).'),
    (4, 2, 'Station 1=9, Station 2=1, Station 3=X. Fragment is 91X.'),
    (5, 1, 'Convert each 2-character hex pair to ASCII characters (e.g. 48=H, 45=E, 58=X).'),
    (5, 2, 'Decoupled registers reveal the 6-character fragment HEX82D.'),
    (6, 1, 'Assemble the 5 collected fragments in order: Stage 4 (91X), Stage 2 (7K2), Stage 5 (HEX82D), Stage 3 reversed (TIBRO), Stage 1 (NOVA).'),
    (6, 2, 'Checksum formula: Sum ASCII values of the 5 segments modulo 97 = 29. Full key: FO{91X-7K2-HEX82D-TIBRO-NOVA}#29')
ON CONFLICT (stage, n) DO NOTHING;

-- Enable Realtime on critical broadcast tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit;
