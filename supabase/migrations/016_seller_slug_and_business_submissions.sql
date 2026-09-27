-- Hunger Swipes — Restaurant slug support + business onboarding submissions

-- ============================================================
-- SELLERS: add public slug and display/contact fields
-- ============================================================
alter table public.sellers
  add column if not exists slug text,
  add column if not exists tagline text,
  add column if not exists hero_url text,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists website_url text;

-- Case-insensitive unique index on slug
alter table public.sellers drop constraint if exists sellers_slug_key;
create unique index if not exists idx_sellers_slug_unique
  on public.sellers (lower(slug))
  where slug is not null;

-- Format constraint: lowercase alphanumeric with hyphens
alter table public.sellers drop constraint if exists sellers_slug_format;
alter table public.sellers
  add constraint sellers_slug_format
  check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- ============================================================
-- BUSINESS SUBMISSIONS (lightweight pre-auth restaurant leads)
-- ============================================================
create table if not exists public.business_submissions (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  website text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','approved','declined')),
  converted_seller_id uuid references public.sellers(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_business_submissions_status on public.business_submissions(status);
create index if not exists idx_business_submissions_created on public.business_submissions(created_at desc);
alter table public.business_submissions enable row level security;

-- ============================================================
-- RENEE'S — permanent setup shell. No unverified menu, address, pricing, or
-- imagery is fabricated. IMG connects an owner and activates it when ready.
-- ============================================================
update public.sellers
set slug = 'renees'
where id = (
  select id from public.sellers
  where lower(business_name) in ('renee''s', 'renees') and slug is null
  order by created_at asc
  limit 1
)
and not exists (select 1 from public.sellers where lower(slug) = 'renees');

insert into public.sellers (
  business_name,
  seller_type,
  slug,
  ordering_method,
  pickup_available,
  delivery_available,
  status,
  verification_status
)
select
  'Renee''s',
  'restaurant',
  'renees',
  'none',
  false,
  false,
  'pending_review',
  'pending'
where not exists (
  select 1 from public.sellers where lower(slug) = 'renees'
);
