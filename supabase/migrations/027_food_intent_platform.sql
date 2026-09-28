-- Hunger Swipes — Food Intent Platform: Eat/Make/Explore, Follow, Food Profiles, Recipe Commerce, Stripe Connect foundation

-- ============================================================
-- DISHES: explicit discovery-mode eligibility + source clarity
-- ============================================================
alter table public.dishes add column if not exists discovery_modes text[] default null;
alter table public.dishes add column if not exists order_intent_url text;

-- ============================================================
-- RECIPES: commercial type + Proud to Pay minimum
-- ============================================================
alter table public.recipes add column if not exists recipe_type text not null default 'free'
  check (recipe_type in ('free','fixed_price','proud_to_pay'));
alter table public.recipes add column if not exists min_proud_to_pay_amount numeric(10,2) default 5.00 check (min_proud_to_pay_amount >= 5.00);

-- Backfill existing recipes based on price
update public.recipes
set recipe_type = case
  when price = 0 then 'free'
  else 'fixed_price'
end
where recipe_type is null;

-- ============================================================
-- RECIPE ENTITLEMENTS: refund state + purchase link
-- ============================================================
alter table public.recipe_entitlements drop constraint if exists recipe_entitlements_status_check;
alter table public.recipe_entitlements add constraint recipe_entitlements_status_check
  check (status in ('active','refunded','revoked','pending_payment'));
alter table public.recipe_entitlements add column if not exists recipe_purchase_id uuid references public.recipe_purchases(id) on delete set null;

-- ============================================================
-- RECIPE PURCHASES: Proud to Pay + refund state
-- ============================================================
alter table public.recipe_purchases add column if not exists recipe_type text;
alter table public.recipe_purchases add column if not exists proud_to_pay_amount numeric(10,2);
alter table public.recipe_purchases add column if not exists refund_status text check (refund_status in ('none','pending','succeeded','failed'));
alter table public.recipe_purchases add column if not exists refund_reason text;
alter table public.recipe_purchases add column if not exists refunded_at timestamptz;

-- ============================================================
-- STRIPE CONNECT: seller/creator connected accounts
-- ============================================================
alter table public.sellers add column if not exists stripe_account_id text;
alter table public.sellers add column if not exists stripe_connect_status text not null default 'not_connected'
  check (stripe_connect_status in ('not_connected','onboarding_incomplete','ready','restricted','payouts_disabled'));
alter table public.sellers add column if not exists stripe_connect_details jsonb default '{}';

-- ============================================================
-- HANDLES: unique shareable usernames for users and sellers
-- ============================================================
create table if not exists public.handles (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  owner_type text not null check (owner_type in ('user','seller')),
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_type, owner_id)
);

create index if not exists idx_handles_handle on public.handles(handle);
create index if not exists idx_handles_owner on public.handles(owner_type, owner_id);

alter table public.handles enable row level security;
drop policy if exists "handles public read" on public.handles;
create policy "handles public read" on public.handles for select using (true);
drop policy if exists "handles owner manage" on public.handles;
create policy "handles owner manage" on public.handles for all
  using ((owner_type = 'user' and owner_id = auth.uid()) or (owner_type = 'seller' and owner_id in (select id from public.sellers where owner_user_id = auth.uid())))
  with check ((owner_type = 'user' and owner_id = auth.uid()) or (owner_type = 'seller' and owner_id in (select id from public.sellers where owner_user_id = auth.uid())));

drop trigger if exists handles_updated_at on public.handles;
create trigger handles_updated_at before update on public.handles
for each row execute procedure public.set_updated_at();

-- ============================================================
-- FOOD PROFILES: extended public profile metadata
-- ============================================================
create table if not exists public.food_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user','seller')),
  owner_id uuid not null,
  bio text,
  website_url text,
  instagram_handle text,
  tiktok_handle text,
  youtube_url text,
  featured_dish_id uuid references public.dishes(id) on delete set null,
  profile_photo_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_type, owner_id)
);

create index if not exists idx_food_profiles_owner on public.food_profiles(owner_type, owner_id);

alter table public.food_profiles enable row level security;
drop policy if exists "food profiles public read" on public.food_profiles;
create policy "food profiles public read" on public.food_profiles for select
  using (is_public or owner_id = auth.uid() or (owner_type = 'seller' and owner_id in (select id from public.sellers where owner_user_id = auth.uid())));
drop policy if exists "food profiles owner manage" on public.food_profiles;
create policy "food profiles owner manage" on public.food_profiles for all
  using ((owner_type = 'user' and owner_id = auth.uid()) or (owner_type = 'seller' and owner_id in (select id from public.sellers where owner_user_id = auth.uid())))
  with check ((owner_type = 'user' and owner_id = auth.uid()) or (owner_type = 'seller' and owner_id in (select id from public.sellers where owner_user_id = auth.uid())));

drop trigger if exists food_profiles_updated_at on public.food_profiles;
create trigger food_profiles_updated_at before update on public.food_profiles
for each row execute procedure public.set_updated_at();

-- ============================================================
-- USER FOLLOWS: private follow relationships
-- ============================================================
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_type text not null check (following_type in ('user','seller')),
  following_id uuid not null,
  created_at timestamptz not null default now(),
  unique(follower_id, following_type, following_id)
);

create index if not exists idx_user_follows_follower on public.user_follows(follower_id);
create index if not exists idx_user_follows_following on public.user_follows(following_type, following_id);

alter table public.user_follows enable row level security;
drop policy if exists "user follows owner read" on public.user_follows;
create policy "user follows owner read" on public.user_follows for select
  using (follower_id = auth.uid());
drop policy if exists "user follows owner manage" on public.user_follows;
create policy "user follows owner manage" on public.user_follows for all
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

-- ============================================================
-- FOOD IMPACT EVENTS: private interaction instrumentation
-- ============================================================
create table if not exists public.food_impact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('right_swipe','save','recipe_view','recipe_unlock','recipe_purchase_intent','recipe_purchase','recipe_purchase_failed','order_intent','community_contribution_approved','follow','creator_engagement','repeat_interest')),
  dish_id uuid references public.dishes(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  seller_id uuid references public.sellers(id) on delete set null,
  community_post_id uuid references public.community_food_posts(id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_food_impact_user_id on public.food_impact_events(user_id);
create index if not exists idx_food_impact_actor_id on public.food_impact_events(actor_id);
create index if not exists idx_food_impact_event_type on public.food_impact_events(event_type);
create index if not exists idx_food_impact_dish_id on public.food_impact_events(dish_id);
create index if not exists idx_food_impact_recipe_id on public.food_impact_events(recipe_id);
create index if not exists idx_food_impact_seller_id on public.food_impact_events(seller_id);
create index if not exists idx_food_impact_created_at on public.food_impact_events(created_at);

alter table public.food_impact_events enable row level security;
drop policy if exists "food impact owner read" on public.food_impact_events;
create policy "food impact owner read" on public.food_impact_events for select
  using (user_id = auth.uid() or actor_id = auth.uid());
drop policy if exists "food impact system insert" on public.food_impact_events;
create policy "food impact system insert" on public.food_impact_events for insert
  to authenticated
  with check (actor_id = auth.uid());

-- ============================================================
-- CONFIG: centralized recipe commerce configuration
-- ============================================================
create table if not exists public.recipe_commerce_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}',
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.recipe_commerce_config (key, value, description) values
  ('fixed_price_minimum', '{"amount": 4.99}', 'Minimum fixed-price recipe amount'),
  ('proud_to_pay_minimum', '{"amount": 5.00}', 'Minimum Proud to Pay recipe amount'),
  ('platform_fee_percent', '{"percent": 20}', 'Hunger Swipes platform fee percentage'),
  ('creator_share_percent', '{"percent": 80}', 'Creator share percentage'),
  ('test_mode_only', '{"enabled": true}', 'Recipe payments restricted to Stripe test mode')
on conflict (key) do nothing;

alter table public.recipe_commerce_config enable row level security;
drop policy if exists "recipe commerce config admin write" on public.recipe_commerce_config;
create policy "recipe commerce config public read" on public.recipe_commerce_config for select using (true);

-- ============================================================
-- FUNCTION: record food impact event
-- ============================================================
create or replace function public.record_food_impact_event(
  p_actor_id uuid,
  p_event_type text,
  p_dish_id uuid default null,
  p_recipe_id uuid default null,
  p_seller_id uuid default null,
  p_community_post_id uuid default null,
  p_metadata jsonb default '{}'
) returns public.food_impact_events as $$
declare
  v_user_id uuid;
  v_event public.food_impact_events;
begin
  -- user_id is the subject of the event; actor_id is who performed it
  v_user_id := p_actor_id;

  insert into public.food_impact_events (
    user_id, actor_id, event_type, dish_id, recipe_id, seller_id, community_post_id, metadata
  ) values (
    v_user_id, p_actor_id, p_event_type, p_dish_id, p_recipe_id, p_seller_id, p_community_post_id, p_metadata
  ) returning * into v_event;

  return v_event;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: settle recipe purchase (extended with Proud to Pay + refund-safe)
-- ============================================================
create or replace function public.settle_recipe_purchase(
  purchase_id uuid,
  processor text,
  intent_id text,
  succeeded boolean,
  failure text default null
) returns public.recipe_purchases as $$
declare
  purchase public.recipe_purchases;
  existing_entitlement integer;
begin
  update public.recipe_purchases
    set status = case when succeeded then 'succeeded' else 'failed' end,
        payment_processor = coalesce(processor, payment_processor),
        payment_intent_id = coalesce(intent_id, payment_intent_id),
        failure_reason = coalesce(failure, failure_reason),
        updated_at = now()
    where id = purchase_id
    returning * into purchase;

  if not found then
    raise exception 'Purchase not found';
  end if;

  if succeeded then
    select count(*) into existing_entitlement
    from public.recipe_entitlements
    where user_id = purchase.user_id and recipe_id = purchase.recipe_id and status = 'active';

    if existing_entitlement = 0 then
      insert into public.recipe_entitlements (
        user_id, recipe_id, dish_id, price_paid_cents, platform_fee_cents, creator_payout_cents,
        status, payment_processor, payment_intent_id, recipe_purchase_id
      ) values (
        purchase.user_id, purchase.recipe_id, purchase.dish_id, purchase.price_cents,
        purchase.platform_fee_cents, purchase.creator_payout_cents, 'active',
        processor, intent_id, purchase.id
      );
    end if;
  end if;

  return purchase;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: refund recipe purchase
-- ============================================================
create or replace function public.refund_recipe_purchase(
  purchase_id uuid,
  refund_reason text default null
) returns public.recipe_purchases as $$
declare
  purchase public.recipe_purchases;
begin
  update public.recipe_purchases
    set refund_status = 'succeeded',
        refund_reason = coalesce(refund_reason, refund_reason),
        refunded_at = now(),
        updated_at = now()
    where id = purchase_id
    returning * into purchase;

  if not found then
    raise exception 'Purchase not found';
  end if;

  update public.recipe_entitlements
    set status = 'refunded',
        updated_at = now()
    where recipe_purchase_id = purchase.id
      and user_id = purchase.user_id
      and recipe_id = purchase.recipe_id;

  return purchase;
end;
$$ language plpgsql security definer;

-- ============================================================
-- TRIGGERS
-- ============================================================
drop trigger if exists recipe_purchases_updated_at on public.recipe_purchases;
create trigger recipe_purchases_updated_at before update on public.recipe_purchases
for each row execute procedure public.set_updated_at();
