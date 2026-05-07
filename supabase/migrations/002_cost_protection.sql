-- Cost protection tables: spend tracking, circuit breaker, cron locks, rate limiting
-- Safe to re-run: drops and recreates all tables defined here (no user data in these tables)

-- ── rate_limit_tracking ──────────────────────────────────────────────────────
DROP TABLE IF EXISTS rate_limit_tracking CASCADE;
CREATE TABLE rate_limit_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  feature text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature, window_start)
);
CREATE INDEX idx_rate_limit_user_feature_window ON rate_limit_tracking(user_id, feature, window_start);

-- Atomic increment RPC (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id text,
  p_feature text,
  p_window timestamptz
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO rate_limit_tracking(user_id, feature, count, window_start)
  VALUES (p_user_id, p_feature, 1, p_window)
  ON CONFLICT (user_id, feature, window_start)
  DO UPDATE SET count = rate_limit_tracking.count + 1;
END;
$$;

-- ── spend_tracking ───────────────────────────────────────────────────────────
DROP TABLE IF EXISTS spend_tracking CASCADE;
CREATE TABLE spend_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service text NOT NULL,      -- 'claude_sonnet' | 'claude_haiku' | 'openai_whisper'
  cost_inr numeric(10,4) NOT NULL DEFAULT 0,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_spend_tracking_created ON spend_tracking(created_at DESC);
CREATE INDEX idx_spend_tracking_user ON spend_tracking(user_id, created_at DESC);

-- ── circuit_breaker_events ───────────────────────────────────────────────────
DROP TABLE IF EXISTS circuit_breaker_events CASCADE;
CREATE TABLE circuit_breaker_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL DEFAULT 'state_change',  -- 'state_change' | 'error_recorded'
  state text,                  -- 'OPEN' | 'CLOSED'
  service text DEFAULT 'claude',
  reason text,
  opened_at timestamptz,
  stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_cb_events_created ON circuit_breaker_events(created_at DESC);
CREATE INDEX idx_cb_state_change ON circuit_breaker_events(event_type, created_at DESC);

-- ── cron_locks ───────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cron_locks CASCADE;
CREATE TABLE cron_locks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL,
  run_date date NOT NULL,
  lock_id text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(job_name, run_date)
);
CREATE INDEX idx_cron_locks_job_date ON cron_locks(job_name, run_date);

-- ── cleanup function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_cron_locks() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM cron_locks WHERE run_date < CURRENT_DATE - INTERVAL '90 days';
  DELETE FROM rate_limit_tracking WHERE window_start < now() - INTERVAL '25 hours';
  DELETE FROM spend_tracking WHERE created_at < now() - INTERVAL '31 days';
  DELETE FROM circuit_breaker_events WHERE created_at < now() - INTERVAL '31 days';
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Service role key bypasses RLS, so all API routes are unaffected.
-- No anon/authenticated policies = blocks any direct client access.
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE limit_violations ENABLE ROW LEVEL SECURITY;
