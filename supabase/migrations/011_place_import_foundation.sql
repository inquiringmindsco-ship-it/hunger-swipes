-- Structured provider-backed Places and auditable, idempotent imports.
alter table public.places add column if not exists place_type text;
alter table public.places add column if not exists city text;
alter table public.places add column if not exists state text;
alter table public.places add column if not exists postal_code text;
alter table public.places add column if not exists phone text;
alter table public.places add column if not exists website text;
alter table public.places add column if not exists order_url text;
alter table public.places add column if not exists category text;
alter table public.places add column if not exists cuisine text;
alter table public.places add column if not exists hours text;
alter table public.places add column if not exists operational_status text not null default 'unknown'
  check (operational_status in ('operational','temporarily_closed','closed','unknown'));
alter table public.places add column if not exists external_source text;
alter table public.places add column if not exists external_source_id text;
alter table public.places add column if not exists claimed_status text not null default 'unclaimed'
  check (claimed_status in ('unclaimed','claim_pending','claimed'));
alter table public.places add column if not exists provider_metadata jsonb not null default '{}'::jsonb;
alter table public.places add column if not exists last_imported_at timestamptz;
alter table public.places drop constraint if exists places_source_check;
alter table public.places add constraint places_source_check
  check (source in ('community','seller','legacy_import','provider_import'));

update public.places
set claimed_status = case when claimed_seller_id is null then 'unclaimed' else 'claimed' end
where claimed_status is distinct from case when claimed_seller_id is null then 'unclaimed' else 'claimed' end;

create unique index if not exists idx_places_external_identity
  on public.places(external_source, external_source_id)
  where external_source is not null and external_source_id is not null;
create index if not exists idx_places_city_status on public.places(city, status);
create index if not exists idx_places_category_status on public.places(category, status);
create index if not exists idx_places_unclaimed on public.places(claimed_status, status);

create table if not exists public.place_import_runs (
  id uuid primary key default gen_random_uuid(),
  external_source text not null,
  area_label text not null,
  center_latitude double precision not null,
  center_longitude double precision not null,
  radius_meters integer not null check (radius_meters between 100 and 50000),
  mode text not null check (mode in ('preview','import')),
  status text not null default 'running' check (status in ('running','completed','failed')),
  found_count integer not null default 0,
  new_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  claimed_skipped_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.place_import_runs enable row level security;
-- No client policies: import logs are service-role/admin only.

create or replace function public.sync_seller_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into places (
    name, location_text, address, latitude, longitude, source,
    claimed_seller_id, legacy_seller_id, created_by, status, claimed_status, created_at
  ) values (
    trim(new.business_name),
    trim(coalesce(nullif(new.location_text, ''), nullif(new.address, ''), 'Location not supplied')),
    new.address, new.latitude, new.longitude,
    case when new.owner_user_id is null then 'legacy_import' else 'seller' end,
    case when new.owner_user_id is null then null else new.id end,
    new.id, new.owner_user_id, 'active',
    case when new.owner_user_id is null then 'unclaimed' else 'claimed' end,
    new.created_at
  )
  on conflict (legacy_seller_id) do update set
    name = excluded.name,
    location_text = excluded.location_text,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    source = excluded.source,
    claimed_seller_id = excluded.claimed_seller_id,
    claimed_status = excluded.claimed_status,
    created_by = coalesce(places.created_by, excluded.created_by),
    updated_at = now();
  return new;
end;
$$;
