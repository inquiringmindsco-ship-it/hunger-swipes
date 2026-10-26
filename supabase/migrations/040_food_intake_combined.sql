-- Food Content Intake tool migration
-- Durable audit log, candidate metadata, and creator attribution.

-- 1. Extend place_image_candidates with intake metadata and creator attribution.
alter table public.place_image_candidates
  add column if not exists intake_batch_id text,
  add column if not exists source_notes text,
  add column if not exists intake_kind text check (intake_kind in ('uploaded_dish', 'candidate_url')),
  add column if not exists created_by text;

comment on column public.place_image_candidates.intake_kind is 'Source context from the food content intake tool.';
comment on column public.place_image_candidates.created_by is 'User id or legacy-admin identifier that created the candidate.';

-- 2. Audit/log table for every food content intake action (dish uploads and candidate URLs).
create table if not exists public.food_intake_log (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete set null,
  place_created boolean not null default false,
  dish_name text not null,
  intake_kind text not null check (intake_kind in ('uploaded_dish', 'candidate_url')),
  description text,
  price numeric(10, 2),
  category text,
  cuisine text,
  tags text[] not null default '{}',
  image_url text,
  source_url text,
  source_type text,
  rights_status text check (rights_status in ('permission_required', 'approved', 'rejected')),
  notes text,
  is_featured_dish boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.food_intake_log is 'Audit log for admin food content intake actions.';
comment on column public.food_intake_log.intake_kind is 'uploaded_dish = uploaded image requiring seller assignment; candidate_url = sourced image URL tracked in place_image_candidates.';
comment on column public.food_intake_log.created_by is 'User id or legacy-admin identifier that performed the intake.';

-- Enable RLS but keep service-role only (no public policies).
alter table public.food_intake_log enable row level security;

-- 3. Helpful indexes for the admin views.
create index if not exists idx_food_intake_log_place_id on public.food_intake_log(place_id);
create index if not exists idx_food_intake_log_created_at on public.food_intake_log(created_at desc);
create index if not exists idx_place_image_candidates_intake_batch_id on public.place_image_candidates(intake_batch_id);
