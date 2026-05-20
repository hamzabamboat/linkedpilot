-- PersonaLink full schema — run in Supabase SQL editor
-- https://supabase.com/dashboard/project/aoirhksbkoraaywephya/sql

create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  linkedin_id text unique not null,
  linkedin_name text,
  email text,
  linkedin_picture text,
  linkedin_access_token text,
  linkedin_token_expires_at timestamptz,
  subscription_status text default 'inactive',
  trial_posts_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade unique,
  razorpay_subscription_id text unique,
  status text default 'created',
  plan_id text,
  start_date timestamptz,
  trial_ends_at timestamptz,
  next_billing_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add trial_ends_at if upgrading an existing database
alter table subscriptions add column if not exists trial_ends_at timestamptz;

create table if not exists user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade unique,
  name text,
  role text,
  industry text,
  company text,
  years_experience integer,
  linkedin_url text,
  job_title text,
  topics text[],
  writing_style text default 'professional',
  tone text default 'friendly',
  post_examples text,
  voice_fingerprint text,
  mcq_answers jsonb,
  content_pillars text[],
  control_preference text default 'approve',
  writing_sample text,
  plan text default 'starter',
  onboarding_completed_at timestamptz,
  posts_used_this_month integer default 0,
  posts_limit integer default 12,
  preferred_days text[] default array['Monday','Wednesday','Friday'],
  preferred_post_hour integer default 9,
  timezone text default 'Asia/Kolkata',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  status text default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  linkedin_post_id text,
  source text default 'ai_generated',
  voice_note_id uuid,
  story_bank_id uuid,
  generation_prompt text,
  content_pillar text,
  engagement_score integer,
  impressions integer,
  reactions integer,
  comments integer,
  approval_token text unique default gen_random_uuid()::text,
  approval_sent_at timestamptz,
  failure_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists voice_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  file_name text,
  transcript text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists story_bank (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  raw_text text not null,
  title text,
  status text default 'raw',
  created_at timestamptz default now()
);

create table if not exists linkedin_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  score integer not null,
  breakdown jsonb not null default '{}',
  recorded_at timestamptz default now()
);

create table if not exists image_briefs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  prompts jsonb not null default '[]',
  month text not null,
  created_at timestamptz default now()
);

create table if not exists trends_cache (
  id uuid default gen_random_uuid() primary key,
  industry text unique not null,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists post_suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  suggestion_text text not null,
  angle text,
  hashtags text[],
  why_it_works text,
  source text default 'news',
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists post_analytics (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  impressions integer,
  reactions integer,
  captured_at timestamptz default now()
);

-- Add subscription_count to track resubscriptions
alter table users add column if not exists subscription_count integer not null default 0;

-- Access codes for free plan passes
create table if not exists access_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  plan text not null check (plan in ('starter', 'standard', 'pro')),
  max_uses integer not null default 1,
  uses_count integer not null default 0,
  expires_at timestamptz,
  created_by text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists access_codes_code_idx on access_codes(code);
create index if not exists access_codes_active_idx on access_codes(is_active) where is_active = true;

create index if not exists users_linkedin_id_idx on users(linkedin_id);
create index if not exists posts_user_id_idx on posts(user_id);
create index if not exists posts_status_scheduled_idx on posts(status, scheduled_at) where status = 'scheduled';
create index if not exists posts_approval_token_idx on posts(approval_token);
create index if not exists voice_notes_user_id_idx on voice_notes(user_id);
create index if not exists story_bank_user_id_idx on story_bank(user_id);
create index if not exists linkedin_scores_user_id_idx on linkedin_scores(user_id);
create index if not exists image_briefs_user_id_idx on image_briefs(user_id);
create index if not exists trends_cache_industry_idx on trends_cache(industry);
create index if not exists post_suggestions_user_id_idx on post_suggestions(user_id);
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);

-- Image URLs for story bank and posts
alter table story_bank add column if not exists image_urls text[] default '{}';
alter table posts add column if not exists image_urls text[] default '{}';

-- LinkedIn profile analyses
create table if not exists profile_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  score integer not null,
  breakdown jsonb not null default '{}',
  improvements jsonb not null default '[]',
  analysed_at timestamptz default now()
);

create index if not exists profile_analyses_user_id_idx on profile_analyses(user_id);
create index if not exists subscriptions_razorpay_id_idx on subscriptions(razorpay_subscription_id);

-- Pipeline reminder throttle: track when the last low-queue reminder was sent per user
alter table user_profiles add column if not exists last_pipeline_reminder_sent_at timestamptz;
