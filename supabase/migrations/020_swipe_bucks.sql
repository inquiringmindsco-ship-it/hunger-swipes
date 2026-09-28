-- Hunger Swipes — Swipe Bucks reward system foundation
-- Platform promotional credits for community food contributors.

-- ============================================================
-- CONFIG
-- ============================================================
create table if not exists public.swipe_bucks_config (
  id int primary key default 1 check (id = 1),
  active boolean not null default true,
  right_swipe_cents int not null default 1,
  save_cents int not null default 2,
  click_cents int not null default 5,
  verified_order_cents int not null default 50,
  first_photo_cents int not null default 100,
  daily_cap_cents int not null default 5000,
  monthly_cap_cents int not null default 50000,
  max_per_post_cents int not null default 1000,
  global_budget_cents int not null default 1000000,
  updated_at timestamptz not null default now()
);

insert into public.swipe_bucks_config (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- WALLETS
-- ============================================================
create table if not exists public.swipe_bucks_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_cents int not null default 0 check (balance_cents >= 0),
  lifetime_earned_cents int not null default 0,
  lifetime_redeemed_cents int not null default 0,
  pending_cents int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- LEDGER
-- ============================================================
create table if not exists public.swipe_bucks_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null,
  type text not null check (type in ('credit','debit','reversal')),
  status text not null check (status in ('pending','approved','credited','reversed','rejected')),
  event_type text not null check (event_type in ('right_swipe','save','click','verified_order','first_photo','manual_credit','manual_reversal','redemption')),
  post_id uuid references public.community_food_posts(id) on delete set null,
  dish_id uuid references public.dishes(id) on delete set null,
  restaurant_id uuid references public.places(id) on delete set null,
  source_user_id uuid references auth.users(id) on delete set null,
  source_event_id text,
  order_id text,
  reason text,
  metadata jsonb default '{}',
  admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ============================================================
-- REWARD EVENTS (idempotency)
-- ============================================================
create table if not exists public.swipe_bucks_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.community_food_posts(id) on delete cascade,
  event_type text not null check (event_type in ('right_swipe','save','click','verified_order','first_photo')),
  source_user_id uuid references auth.users(id) on delete cascade,
  source_event_id text not null,
  amount_cents int not null,
  status text not null default 'credited' check (status in ('pending','approved','credited','reversed','rejected')),
  ledger_entry_id uuid references public.swipe_bucks_ledger(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, post_id, event_type, source_user_id, source_event_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_ledger_user_created on public.swipe_bucks_ledger(user_id, created_at desc);
create index if not exists idx_ledger_user_type on public.swipe_bucks_ledger(user_id, event_type);
create index if not exists idx_ledger_post on public.swipe_bucks_ledger(post_id);
create index if not exists idx_reward_events_user on public.swipe_bucks_reward_events(user_id, created_at desc);
create index if not exists idx_reward_events_post on public.swipe_bucks_reward_events(post_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.swipe_bucks_wallets enable row level security;
alter table public.swipe_bucks_ledger enable row level security;
alter table public.swipe_bucks_reward_events enable row level security;
alter table public.swipe_bucks_config enable row level security;

drop policy if exists "wallet owner read" on public.swipe_bucks_wallets;
create policy "wallet owner read"
  on public.swipe_bucks_wallets for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "ledger owner read" on public.swipe_bucks_ledger;
create policy "ledger owner read"
  on public.swipe_bucks_ledger for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "reward events owner read" on public.swipe_bucks_reward_events;
create policy "reward events owner read"
  on public.swipe_bucks_reward_events for select to authenticated
  using (user_id = auth.uid());

-- Only service role / functions can write wallets, ledger, events, config.

-- ============================================================
-- FUNCTIONS
-- ============================================================
create or replace function public.swipe_bucks_config()
returns public.swipe_bucks_config
language sql
stable
security definer
set search_path = public
as $$
  select * from public.swipe_bucks_config limit 1;
$$;

create or replace function public.process_swipe_bucks_reward(
  p_user_id uuid,
  p_post_id uuid,
  p_event_type text,
  p_source_user_id uuid,
  p_source_event_id text,
  p_amount_cents int,
  p_reason text,
  p_metadata jsonb default '{}'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.swipe_bucks_config;
  v_ledger_id uuid;
  v_existing_id uuid;
  v_daily_cents int;
  v_monthly_cents int;
  v_post_cents int;
  v_global_cents int;
  v_now timestamptz := now();
  v_today date := current_date;
  v_month_start date := date_trunc('month', v_now)::date;
begin
  if p_amount_cents <= 0 then return null; end if;

  select * into v_config from public.swipe_bucks_config where id = 1;
  if not found or not v_config.active then return null; end if;

  -- No self-reward.
  if p_user_id = p_source_user_id then return null; end if;

  -- Idempotency / duplicate protection.
  select id into v_existing_id from public.swipe_bucks_reward_events
  where user_id = p_user_id and post_id = p_post_id and event_type = p_event_type
    and source_user_id = p_source_user_id and source_event_id = p_source_event_id
  limit 1;
  if v_existing_id is not null then return null; end if;

  -- Verify the post belongs to the user being rewarded.
  if not exists (select 1 from public.community_food_posts where id = p_post_id and user_id = p_user_id) then
    return null;
  end if;

  -- Cap calculations.
  select coalesce(sum(amount_cents), 0) into v_daily_cents
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit' and status = 'credited'
    and created_at::date = v_today;

  select coalesce(sum(amount_cents), 0) into v_monthly_cents
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit' and status = 'credited'
    and created_at >= v_month_start;

  select coalesce(sum(amount_cents), 0) into v_post_cents
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit' and status = 'credited' and post_id = p_post_id;

  select coalesce(sum(amount_cents), 0) into v_global_cents
  from public.swipe_bucks_ledger
  where type = 'credit' and status = 'credited' and created_at >= v_month_start;

  if v_daily_cents + p_amount_cents > v_config.daily_cap_cents then return null; end if;
  if v_monthly_cents + p_amount_cents > v_config.monthly_cap_cents then return null; end if;
  if v_post_cents + p_amount_cents > v_config.max_per_post_cents then return null; end if;
  if v_global_cents + p_amount_cents > v_config.global_budget_cents then return null; end if;

  -- Insert ledger entry.
  insert into public.swipe_bucks_ledger (
    user_id, amount_cents, type, status, event_type, post_id, source_user_id,
    source_event_id, reason, metadata, processed_at
  ) values (
    p_user_id, p_amount_cents, 'credit', 'credited', p_event_type, p_post_id, p_source_user_id,
    p_source_event_id, p_reason, p_metadata, v_now
  ) returning id into v_ledger_id;

  -- Upsert wallet.
  insert into public.swipe_bucks_wallets (user_id, balance_cents, lifetime_earned_cents, pending_cents)
  values (p_user_id, p_amount_cents, p_amount_cents, 0)
  on conflict (user_id) do update set
    balance_cents = public.swipe_bucks_wallets.balance_cents + p_amount_cents,
    lifetime_earned_cents = public.swipe_bucks_wallets.lifetime_earned_cents + p_amount_cents,
    updated_at = v_now;

  -- Record event for idempotency.
  insert into public.swipe_bucks_reward_events (
    user_id, post_id, event_type, source_user_id, source_event_id, amount_cents, ledger_entry_id
  ) values (
    p_user_id, p_post_id, p_event_type, p_source_user_id, p_source_event_id, p_amount_cents, v_ledger_id
  );

  return v_ledger_id;
end;
$$;

-- Trigger function for right swipes and saves on community posts.
create or replace function public.swipe_bucks_handle_swipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.community_food_posts%rowtype;
  v_config public.swipe_bucks_config;
  v_amount int;
  v_event text;
  v_source_event_id text;
begin
  if NEW.content_kind != 'community' then return NEW; end if;
  select * into v_post from public.community_food_posts where id = NEW.content_id limit 1;
  if v_post.id is null or v_post.user_id is null then return NEW; end if;
  select * into v_config from public.swipe_bucks_config where id = 1;
  if not found or not v_config.active then return NEW; end if;

  if TG_TABLE_NAME = 'food_swipes' and NEW.direction = 'right' then
    v_event := 'right_swipe';
    v_amount := v_config.right_swipe_cents;
    v_source_event_id := NEW.actor_id::text || ':' || NEW.content_kind || ':' || NEW.content_id || ':right';
  elsif TG_TABLE_NAME = 'saved_food' then
    v_event := 'save';
    v_amount := v_config.save_cents;
    v_source_event_id := NEW.actor_id::text || ':' || NEW.content_kind || ':' || NEW.content_id;
  else
    return NEW;
  end if;

  perform public.process_swipe_bucks_reward(
    v_post.user_id, v_post.id, v_event, NEW.actor_id, v_source_event_id,
    v_amount, 'Reward for ' || v_event || ' on community post',
    jsonb_build_object('source_table', TG_TABLE_NAME)
  );

  return NEW;
end;
$$;

-- First-photo bonus trigger.
create or replace function public.swipe_bucks_handle_first_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing int;
  v_config public.swipe_bucks_config;
  v_source_event_id text;
begin
  if NEW.status != 'active' or NEW.user_id is null then return NEW; end if;
  select * into v_config from public.swipe_bucks_config where id = 1;
  if not found or not v_config.active then return NEW; end if;

  -- Count existing approved community photos for this place + dish name.
  select count(*) into v_existing from public.community_food_posts
  where place_id = NEW.place_id
    and lower(trim(dish_name)) = lower(trim(NEW.dish_name))
    and status = 'active'
    and id != NEW.id;

  if v_existing = 0 then
    v_source_event_id := NEW.user_id::text || ':' || NEW.id::text || ':first_photo';
    perform public.process_swipe_bucks_reward(
      NEW.user_id, NEW.id, 'first_photo', null, v_source_event_id,
      v_config.first_photo_cents,
      'First approved community photo for dish at place',
      jsonb_build_object('place_id', NEW.place_id, 'dish_name', NEW.dish_name)
    );
  end if;

  return NEW;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================
drop trigger if exists swipe_bucks_right_swipe on public.food_swipes;
create trigger swipe_bucks_right_swipe
  after insert or update of direction on public.food_swipes
  for each row
  when (NEW.direction = 'right')
  execute function public.swipe_bucks_handle_swipe();

drop trigger if exists swipe_bucks_save on public.saved_food;
create trigger swipe_bucks_save
  after insert on public.saved_food
  for each row
  execute function public.swipe_bucks_handle_swipe();

drop trigger if exists swipe_bucks_first_photo on public.community_food_posts;
create trigger swipe_bucks_first_photo
  after insert or update of status, moderation_status on public.community_food_posts
  for each row
  when (NEW.status = 'active' AND NEW.moderation_status = 'approved')
  execute function public.swipe_bucks_handle_first_photo();

-- ============================================================
-- PERMISSIONS
-- ============================================================
grant execute on function public.swipe_bucks_config() to authenticated;
grant execute on function public.process_swipe_bucks_reward(uuid, uuid, text, uuid, text, int, text, jsonb) to service_role;
grant execute on function public.swipe_bucks_handle_swipe() to service_role;
grant execute on function public.swipe_bucks_handle_first_photo() to service_role;
