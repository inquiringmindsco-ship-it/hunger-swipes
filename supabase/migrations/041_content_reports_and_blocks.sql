-- User-generated content safety controls required for release.
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  content_kind text not null check (content_kind in ('community')),
  content_id uuid not null,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('not_food','offensive','spam','impersonation','other')),
  details text,
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  resolution text,
  unique (reporter_user_id, content_kind, content_id)
);

create index if not exists idx_content_reports_queue on public.content_reports(status, created_at desc);

create table if not exists public.blocked_users (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

alter table public.content_reports enable row level security;
alter table public.blocked_users enable row level security;

-- These tables are accessed through authenticated server routes only.
revoke all on public.content_reports from anon, authenticated;
revoke all on public.blocked_users from anon, authenticated;
