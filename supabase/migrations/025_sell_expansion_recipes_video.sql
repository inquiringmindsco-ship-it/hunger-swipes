-- Hunger Swipes — Sell expansion: home cooks, recipe creators, recipes, 10-second video.

-- ============================================================
-- SELLERS: support home_cook + recipe_creator and multi-type list
-- ============================================================
alter table public.sellers drop constraint if exists sellers_seller_type_check;
alter table public.sellers add constraint sellers_seller_type_check
  check (seller_type in ('restaurant','home_kitchen','home_cook','food_truck','caterer','pop_up','meal_prep','recipe_creator','other'));

-- Normalize existing home_kitchen rows to the new canonical home_cook value.
update public.sellers set seller_type = 'home_cook' where seller_type = 'home_kitchen';

alter table public.sellers add column if not exists seller_types text[] default null;

-- Backfill seller_types from the legacy single seller_type.
update public.sellers
set seller_types = array[seller_type]
where seller_types is null or array_length(seller_types, 1) is null;

-- ============================================================
-- RECIPES (paid recipe products attached to dishes)
-- ============================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid references public.dishes(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  ingredients text[] not null default '{}',
  instructions text[] not null default '{}',
  price numeric(10,2) not null default 0 check (price >= 0),
  photo_url text,
  video_media_id uuid,
  status text not null default 'draft' check (status in ('draft','pending_review','active','removed')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recipes_dish_id on public.recipes(dish_id);
create index if not exists idx_recipes_seller_id on public.recipes(seller_id);
create index if not exists idx_recipes_status on public.recipes(status);

-- Recipe writes are server-mediated.
alter table public.recipes enable row level security;
drop policy if exists "recipes public read unlocked preview" on public.recipes;
-- Public selects are intentionally blocked; API controls what a viewer can see.
create policy "recipes owner seller read" on public.recipes for select
  using (creator_user_id = auth.uid() or seller_id in (select id from public.sellers where owner_user_id = auth.uid()));

-- ============================================================
-- RECIPE ENTITLEMENTS (purchase foundation; not faked)
-- ============================================================
create table if not exists public.recipe_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  price_paid_cents integer not null check (price_paid_cents >= 0),
  platform_fee_cents integer default 0,
  creator_payout_cents integer default 0,
  currency text not null default 'usd',
  status text not null default 'active' check (status in ('active','refunded','revoked')),
  payment_processor text,
  payment_intent_id text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, recipe_id)
);

create index if not exists idx_recipe_entitlements_user_id on public.recipe_entitlements(user_id);
create index if not exists idx_recipe_entitlements_recipe_id on public.recipe_entitlements(recipe_id);

alter table public.recipe_entitlements enable row level security;
drop policy if exists "recipe entitlements owner read" on public.recipe_entitlements;
create policy "recipe entitlements owner read" on public.recipe_entitlements for select
  using (user_id = auth.uid());

-- ============================================================
-- FOOD MEDIA (video + poster, for dishes and community posts)
-- ============================================================
create table if not exists public.food_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  dish_id uuid references public.dishes(id) on delete cascade,
  community_post_id uuid references public.community_food_posts(id) on delete cascade,
  kind text not null check (kind in ('video','poster')),
  original_path text,
  optimized_path text not null,
  thumbnail_path text,
  duration_seconds numeric check (duration_seconds is null or duration_seconds > 0),
  original_size_bytes integer check (original_size_bytes is null or original_size_bytes > 0),
  optimized_size_bytes integer check (optimized_size_bytes is null or optimized_size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  mime_type text,
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','ready','failed')),
  moderation_status text not null default 'pending_review' check (moderation_status in ('pending_review','approved','rejected','removed')),
  moderation_reason text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_content_target check (
    (dish_id is not null)::integer + (community_post_id is not null)::integer <= 1
  )
);

create index if not exists idx_food_media_dish_id on public.food_media(dish_id);
create index if not exists idx_food_media_community_post_id on public.food_media(community_post_id);
create index if not exists idx_food_media_status on public.food_media(processing_status, moderation_status);

-- Public only sees approved media through the API; table-level policy lets owners read.
alter table public.food_media enable row level security;
drop policy if exists "food media owner read" on public.food_media;
create policy "food media owner read" on public.food_media for select
  using (owner_id = auth.uid());

-- ============================================================
-- DISHES: link to media and recipe state
-- ============================================================
alter table public.dishes add column if not exists video_media_id uuid references public.food_media(id) on delete set null;
alter table public.dishes add column if not exists poster_url text;

-- ============================================================
-- COMMUNITY POSTS: link to video media
-- ============================================================
alter table public.community_food_posts add column if not exists video_media_id uuid references public.food_media(id) on delete set null;
alter table public.community_food_posts add column if not exists poster_url text;

-- ============================================================
-- TRIGGERS
-- ============================================================
drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at before update on public.recipes
for each row execute procedure public.set_updated_at();

drop trigger if exists recipe_entitlements_updated_at on public.recipe_entitlements;
create trigger recipe_entitlements_updated_at before update on public.recipe_entitlements
for each row execute procedure public.set_updated_at();

drop trigger if exists food_media_updated_at on public.food_media;
create trigger food_media_updated_at before update on public.food_media
for each row execute procedure public.set_updated_at();
