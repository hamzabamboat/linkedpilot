-- Per-account billing: each connected LinkedIn account (personal or company page)
-- has its own subscription and status.

CREATE TABLE IF NOT EXISTS linkedin_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('personal', 'company')),
  linkedin_id text NOT NULL,  -- person URN ID or org ID
  name text,
  picture_url text,
  subscription_status text NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  dodo_subscription_id text,
  plan text CHECK (plan IN ('starter', 'standard', 'pro')),
  posts_limit integer DEFAULT 0,
  posts_used_this_month integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, linkedin_id)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_user_id ON linkedin_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_accounts_dodo_sub
  ON linkedin_accounts(dodo_subscription_id)
  WHERE dodo_subscription_id IS NOT NULL;

-- Migrate existing users' personal accounts
INSERT INTO linkedin_accounts (
  user_id, account_type, linkedin_id, name, picture_url,
  subscription_status, created_at, updated_at
)
SELECT
  u.id,
  'personal',
  u.linkedin_id,
  u.linkedin_name,
  u.linkedin_picture,
  CASE
    WHEN u.subscription_status = 'active'                      THEN 'active'
    WHEN u.subscription_status IN ('trialing', 'trial')        THEN 'trialing'
    WHEN u.subscription_status = 'past_due'                    THEN 'past_due'
    WHEN u.subscription_status = 'canceled'                    THEN 'canceled'
    ELSE 'inactive'
  END,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.linkedin_id IS NOT NULL AND u.linkedin_id <> ''
ON CONFLICT (user_id, linkedin_id) DO NOTHING;

-- Backfill plan + limits from user_profiles
UPDATE linkedin_accounts la
SET
  plan               = up.plan,
  posts_limit        = COALESCE(up.posts_limit, 0),
  posts_used_this_month = COALESCE(up.posts_used_this_month, 0),
  updated_at         = now()
FROM user_profiles up
WHERE la.user_id = up.user_id AND la.account_type = 'personal';

-- Backfill dodo_subscription_id from subscriptions table
UPDATE linkedin_accounts la
SET dodo_subscription_id = s.dodo_subscription_id, updated_at = now()
FROM subscriptions s
WHERE la.user_id = s.user_id
  AND la.account_type = 'personal'
  AND s.dodo_subscription_id IS NOT NULL;

-- Add account_id to subscriptions so future rows are per-account
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES linkedin_accounts(id);

-- Backfill account_id for existing subscription rows
UPDATE subscriptions s
SET account_id = la.id
FROM linkedin_accounts la
WHERE s.user_id = la.user_id AND la.account_type = 'personal'
  AND s.account_id IS NULL;
