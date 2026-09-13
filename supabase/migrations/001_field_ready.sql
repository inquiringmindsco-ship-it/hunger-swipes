-- Hunger Swipes — Field-Ready V1 Migration
-- Self-contained; does not depend on profiles table being present.

-- ============================================================
-- SELLERS (canonical food seller profile)
-- ============================================================
create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid, -- references auth.users or profiles later; kept loose for V1 onboarding without auth
  business_name text not null,
  seller_type text not null check (seller_type in ('restaurant','home_kitchen','food_truck','caterer','pop_up','meal_prep','other')),
  description text,
  logo_url text,
  location_text text,
  address text,
  latitude numeric,
  longitude numeric,
  phone text,
  hours_text text,
  pickup_available boolean default false,
  delivery_available boolean default false,
  ordering_method text check (ordering_method in ('phone','link','in_app','none')),
  ordering_url text,
  status text not null default 'draft' check (status in ('draft','pending_review','active','suspended')),
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  permit_info jsonb,
  jurisdiction text,
  service_area text,
  suspension_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sellers_owner_id on public.sellers(owner_id);
create index if not exists idx_sellers_status on public.sellers(status);
create index if not exists idx_sellers_type on public.sellers(seller_type);
create index if not exists idx_sellers_verification on public.sellers(verification_status);
create index if not exists idx_sellers_active_location on public.sellers(status, location_text);

-- ============================================================
-- DISHES (food items published by sellers)
-- ============================================================
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade not null,
  name text not null,
  description text,
  photo_url text,
  price numeric not null default 0,
  availability text not null default 'available' check (availability in ('available','unavailable','sold_out')),
  category text,
  tags text[] default '{}',
  status text not null default 'draft' check (status in ('draft','pending','active','removed')),
  -- Recipe-ready fields (future MAKE IT feature)
  recipe_available boolean default false,
  recipe_access_type text default 'none' check (recipe_access_type in ('none','preview','purchase')),
  recipe_price numeric default 0,
  recipe_preview text,
  recipe_id text,
  impressions integer not null default 0,
  right_swipes integer not null default 0,
  left_swipes integer not null default 0,
  order_clicks integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_dishes_seller_id on public.dishes(seller_id);
create index if not exists idx_dishes_status on public.dishes(status);
create index if not exists idx_dishes_availability on public.dishes(availability);
create index if not exists idx_dishes_active_seller on public.dishes(status, availability, seller_id);
create index if not exists idx_dishes_tags on public.dishes using gin(tags);

-- ============================================================
-- SAVED DISHES (eater right-swipes / bookmarks)
-- ============================================================
create table if not exists public.saved_dishes (
  id uuid primary key default gen_random_uuid(),
  eater_id uuid not null,
  dish_id uuid references public.dishes(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(eater_id, dish_id)
);

create index if not exists idx_saved_dishes_eater_id on public.saved_dishes(eater_id);
create index if not exists idx_saved_dishes_dish_id on public.saved_dishes(dish_id);

-- ============================================================
-- SWIPES (left / right on dishes)
-- ============================================================
create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  eater_id uuid not null,
  dish_id uuid references public.dishes(id) on delete cascade not null,
  direction text not null check (direction in ('left','right')),
  created_at timestamptz default now(),
  unique(eater_id, dish_id)
);

create index if not exists idx_swipes_eater_id on public.swipes(eater_id);
create index if not exists idx_swipes_dish_id on public.swipes(dish_id);

-- ============================================================
-- SELLER REPORTS
-- ============================================================
create table if not exists public.seller_reports (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete cascade,
  report_type text not null check (report_type in ('closed','moved','wrong_info','unavailable','safety','other')),
  note text,
  status text not null default 'open' check (status in ('open','reviewed','resolved','dismissed')),
  created_at timestamptz default now()
);

create index if not exists idx_seller_reports_seller_id on public.seller_reports(seller_id);
create index if not exists idx_seller_reports_status on public.seller_reports(status);

-- ============================================================
-- ADMIN ACTIONS LOG
-- ============================================================
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('seller','dish')),
  target_id uuid not null,
  action text not null check (action in ('activate','suspend','approve','reject','remove','restore')),
  reason text,
  admin_id uuid,
  created_at timestamptz default now()
);

create index if not exists idx_admin_actions_target on public.admin_actions(target_type, target_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.sellers enable row level security;
alter table public.dishes enable row level security;
alter table public.saved_dishes enable row level security;
alter table public.swipes enable row level security;
alter table public.seller_reports enable row level security;
alter table public.admin_actions enable row level security;

-- Sellers: anyone can read active; owners can manage own (admin bypass via service role in API)
drop policy if exists "sellers public read active" on public.sellers;
create policy "sellers public read active"
  on public.sellers for select
  using (status = 'active');

drop policy if exists "sellers owner manage" on public.sellers;
create policy "sellers owner manage"
  on public.sellers for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Dishes: anyone can read active+available from active seller; sellers can manage own seller's dishes
drop policy if exists "dishes public read active available" on public.dishes;
create policy "dishes public read active available"
  on public.dishes for select
  using (status = 'active' and availability = 'available' and exists (
    select 1 from public.sellers where sellers.id = dishes.seller_id and sellers.status = 'active'
  ));

drop policy if exists "dishes seller manage" on public.dishes;
create policy "dishes seller manage"
  on public.dishes for all
  using (seller_id in (select id from public.sellers where owner_id = auth.uid()))
  with check (seller_id in (select id from public.sellers where owner_id = auth.uid()));

-- Saved dishes: eaters manage own
drop policy if exists "saved_dishes own" on public.saved_dishes;
create policy "saved_dishes own"
  on public.saved_dishes for all
  using (eater_id = auth.uid())
  with check (eater_id = auth.uid());

-- Swipes: eaters manage own
drop policy if exists "swipes own" on public.swipes;
create policy "swipes own"
  on public.swipes for all
  using (eater_id = auth.uid())
  with check (eater_id = auth.uid());

-- Reports: public can read
drop policy if exists "reports public read" on public.seller_reports;
create policy "reports public read"
  on public.seller_reports for select
  using (true);

drop policy if exists "reports authenticated create" on public.seller_reports;
create policy "reports authenticated create"
  on public.seller_reports for insert
  with check (auth.role() = 'authenticated');

-- Admin actions: public can read (admin writes via service role)
drop policy if exists "admin_actions public read" on public.admin_actions;
create policy "admin_actions public read"
  on public.admin_actions for select
  using (true);

-- ============================================================
-- TRIGGERS: update timestamps
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sellers_updated_at on public.sellers;
create trigger sellers_updated_at
  before update on public.sellers
  for each row execute procedure public.set_updated_at();

drop trigger if exists dishes_updated_at on public.dishes;
create trigger dishes_updated_at
  before update on public.dishes
  for each row execute procedure public.set_updated_at();
