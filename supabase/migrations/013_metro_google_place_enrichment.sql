-- Metro import reporting and policy-safe Google Places enrichment provenance.
alter table public.place_import_runs add column if not exists unchanged_count integer not null default 0;

alter table public.places add column if not exists google_place_id text;
alter table public.places add column if not exists last_google_match_at timestamptz;
alter table public.places add column if not exists google_match_confidence numeric
  check (google_match_confidence is null or google_match_confidence between 0 and 1);

create unique index if not exists idx_places_google_place_id
  on public.places(google_place_id) where google_place_id is not null;
create index if not exists idx_places_google_match_age on public.places(last_google_match_at);

create table if not exists public.place_google_enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('preview','import')),
  requested_limit integer not null check (requested_limit between 1 and 100),
  status text not null default 'running' check (status in ('running','completed','failed')),
  considered_count integer not null default 0,
  matched_count integer not null default 0,
  unchanged_count integer not null default 0,
  no_match_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.place_google_enrichment_runs enable row level security;
-- No client policies: service-role/admin only.
