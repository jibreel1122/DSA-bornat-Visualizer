create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  settings jsonb not null default '{}'::jsonb,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  gamification_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on sessions(user_id);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_progress (
  user_id uuid not null references users(id) on delete cascade,
  algorithm_slug text not null,
  category_id text not null,
  attempts integer not null default 0,
  correct integer not null default 0,
  mistakes integer not null default 0,
  mastery numeric(5,2) not null default 0,
  last_seen_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, algorithm_slug)
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  algorithm_slug text not null,
  question_index integer not null,
  correct boolean not null,
  answer_index integer,
  created_at timestamptz not null default now()
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  algorithm_slug text,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  user_id uuid not null references users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create table if not exists saved_visualizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  slug text not null,
  label text,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, slug, label)
);

create table if not exists saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
