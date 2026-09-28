-- Hunger Swipes — Swipe Bucks redemption guardrails
-- Earning stays unchanged. Redemption remains OFF by default.

-- ============================================================
-- CONFIG EXTENSION
-- ============================================================
alter table public.swipe_bucks_config
  add column if not exists redemption_enabled boolean not null default false,
  add column if not exists daily_redemption_cap_cents int not null default 0,
  add column if not exists monthly_redemption_cap_cents int not null default 2000,
  add column if not exists max_redemption_per_transaction_cents int not null default 2000,
  add column if not exists global_monthly_redemption_budget_cents int not null default 100000;

-- Default values: redemption OFF, per-user monthly $20, per-transaction $20, global monthly $1,000.
update public.swipe_bucks_config
set redemption_enabled = false,
    monthly_redemption_cap_cents = 2000,
    max_redemption_per_transaction_cents = 2000,
    global_monthly_redemption_budget_cents = 100000
where id = 1;

-- ============================================================
-- WALLET EXTENSION
-- ============================================================
alter table public.swipe_bucks_wallets
  add column if not exists available_to_redeem_cents int not null default 0,
  add column if not exists held_cents int not null default 0,
  add column if not exists restricted_cents int not null default 0,
  add column if not exists redemption_status text not null default 'eligible'
    check (redemption_status in ('eligible','review','restricted')),
  add column if not exists risk_flags jsonb not null default '[]';

-- ============================================================
-- RESTAURANT REDEMPTION LIMITS
-- ============================================================
create table if not exists public.swipe_bucks_restaurant_limits (
  restaurant_id uuid primary key references public.places(id) on delete cascade,
  redemption_enabled boolean not null default false,
  monthly_redemption_allowance_cents int not null default 0,
  reimbursement_cents int not null default 0,
  promotional_contribution_cents int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- REDEMPTION REQUESTS
-- ============================================================
create table if not exists public.swipe_bucks_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null,
  restaurant_id uuid references public.places(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  metadata jsonb default '{}',
  idempotency_key text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  unique(user_id, idempotency_key)
);

-- ============================================================
-- ADMIN OVERRIDES
-- ============================================================
create table if not exists public.swipe_bucks_redemption_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references public.places(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete set null,
  action text not null check (action in ('release_hold','disable_user','disable_restaurant','change_cap','change_budget','enable_redemption','disable_redemption')),
  previous_value text,
  new_value text,
  previous_status text,
  new_status text,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_redemptions_user on public.swipe_bucks_redemptions(user_id, created_at desc);
create index if not exists idx_redemptions_month on public.swipe_bucks_redemptions(created_at) where status = 'approved';
create index if not exists idx_overrides_user on public.swipe_bucks_redemption_overrides(user_id, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.swipe_bucks_restaurant_limits enable row level security;
alter table public.swipe_bucks_redemptions enable row level security;
alter table public.swipe_bucks_redemption_overrides enable row level security;

drop policy if exists "user own redemptions" on public.swipe_bucks_redemptions;
create policy "user own redemptions"
  on public.swipe_bucks_redemptions for select to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Calculate how much a user has already redeemed today / this month.
create or replace function public.swipe_bucks_user_redeemed(
  p_user_id uuid,
  p_scope text
) returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount_cents), 0)
  from public.swipe_bucks_redemptions
  where user_id = p_user_id
    and status = 'approved'
    and (
      (p_scope = 'daily' and created_at::date = current_date)
      or (p_scope = 'monthly' and created_at >= date_trunc('month', now()))
    );
$$;

-- Calculate global redeemed this month.
create or replace function public.swipe_bucks_global_redeemed_this_month()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount_cents), 0)
  from public.swipe_bucks_redemptions
  where status = 'approved'
    and created_at >= date_trunc('month', now());
$$;

-- Calculate restaurant redeemed this month.
create or replace function public.swipe_bucks_restaurant_redeemed_this_month(p_restaurant_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount_cents), 0)
  from public.swipe_bucks_redemptions
  where restaurant_id = p_restaurant_id
    and status = 'approved'
    and created_at >= date_trunc('month', now());
$$;

-- Recalculate wallet available/held/restricted from ledger and redemptions.
create or replace function public.swipe_bucks_recalculate_wallet(p_user_id uuid)
returns public.swipe_bucks_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_approved_redemptions int;
  v_wallet public.swipe_bucks_wallets;
  v_status text;
  v_held int;
  v_restricted int;
begin
  select * into v_wallet from public.swipe_bucks_wallets where user_id = p_user_id;
  if v_wallet.user_id is null then return null; end if;

  v_status := v_wallet.redemption_status;
  v_held := v_wallet.held_cents;
  v_restricted := v_wallet.restricted_cents;

  select coalesce(sum(amount_cents), 0) into v_total
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit' and status = 'credited';

  select coalesce(sum(amount_cents), 0) into v_approved_redemptions
  from public.swipe_bucks_redemptions
  where user_id = p_user_id and status = 'approved';

  update public.swipe_bucks_wallets
  set balance_cents = greatest(0, v_total - v_approved_redemptions),
      lifetime_redeemed_cents = v_approved_redemptions,
      available_to_redeem_cents = case
        when v_status in ('review','restricted') then 0
        else greatest(0, v_total - v_approved_redemptions - v_held - v_restricted)
      end,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$$;

-- Check if a redemption request is allowed.
create or replace function public.swipe_bucks_check_redemption(
  p_user_id uuid,
  p_amount_cents int,
  p_restaurant_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_config public.swipe_bucks_config;
  v_wallet public.swipe_bucks_wallets;
  v_user_daily int;
  v_user_monthly int;
  v_global_monthly int;
  v_restaurant_monthly int;
  v_restaurant_limit public.swipe_bucks_restaurant_limits%rowtype;
  v_reasons text[] := '{}';
  v_eligible boolean := true;
begin
  select * into v_config from public.swipe_bucks_config where id = 1;
  if not found or not v_config.redemption_enabled then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Swipe Bucks redemption is not enabled');
    return jsonb_build_object('eligible', v_eligible, 'reasons', v_reasons);
  end if;

  select * into v_wallet from public.swipe_bucks_wallets where user_id = p_user_id;
  if v_wallet.user_id is null then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'No wallet found');
    return jsonb_build_object('eligible', v_eligible, 'reasons', v_reasons);
  end if;

  if v_wallet.redemption_status in ('review','restricted') then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Account redemption status: ' || v_wallet.redemption_status);
  end if;

  if v_wallet.balance_cents < p_amount_cents then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Insufficient balance');
  end if;

  if v_config.max_redemption_per_transaction_cents > 0
     and p_amount_cents > v_config.max_redemption_per_transaction_cents then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Exceeds per-transaction limit of $' || (v_config.max_redemption_per_transaction_cents/100)::text);
  end if;

  v_user_daily := public.swipe_bucks_user_redeemed(p_user_id, 'daily');
  if v_config.daily_redemption_cap_cents > 0
     and v_user_daily + p_amount_cents > v_config.daily_redemption_cap_cents then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Exceeds daily redemption cap');
  end if;

  v_user_monthly := public.swipe_bucks_user_redeemed(p_user_id, 'monthly');
  if v_config.monthly_redemption_cap_cents > 0
     and v_user_monthly + p_amount_cents > v_config.monthly_redemption_cap_cents then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Exceeds monthly redemption cap');
  end if;

  v_global_monthly := public.swipe_bucks_global_redeemed_this_month();
  if v_config.global_monthly_redemption_budget_cents > 0
     and v_global_monthly + p_amount_cents > v_config.global_monthly_redemption_budget_cents then
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Global monthly redemption budget reached');
  end if;

  if p_restaurant_id is not null then
    select * into v_restaurant_limit from public.swipe_bucks_restaurant_limits where restaurant_id = p_restaurant_id;
    if found then
      if not v_restaurant_limit.redemption_enabled then
        v_eligible := false;
        v_reasons := array_append(v_reasons, 'Restaurant is not currently accepting Swipe Bucks redemption');
      end if;
      v_restaurant_monthly := public.swipe_bucks_restaurant_redeemed_this_month(p_restaurant_id);
      if v_restaurant_limit.monthly_redemption_allowance_cents > 0
         and v_restaurant_monthly + p_amount_cents > v_restaurant_limit.monthly_redemption_allowance_cents then
        v_eligible := false;
        v_reasons := array_append(v_reasons, 'Restaurant monthly allowance reached');
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'eligible', v_eligible,
    'reasons', v_reasons,
    'balance_cents', v_wallet.balance_cents,
    'available_cents', v_wallet.available_to_redeem_cents,
    'held_cents', v_wallet.held_cents,
    'restricted_cents', v_wallet.restricted_cents,
    'user_monthly_redeemed_cents', v_user_monthly,
    'global_monthly_redeemed_cents', v_global_monthly
  );
end;
$$;

-- Process an actual redemption request. Should only be called by server APIs when redemption is enabled.
create or replace function public.swipe_bucks_redeem(
  p_user_id uuid,
  p_amount_cents int,
  p_restaurant_id uuid,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check jsonb;
  v_redemption_id uuid;
  v_wallet public.swipe_bucks_wallets;
begin
  v_check := public.swipe_bucks_check_redemption(p_user_id, p_amount_cents, p_restaurant_id);
  if not (v_check->>'eligible')::boolean then
    return jsonb_build_object('success', false, 'error', v_check->>'reasons', 'check', v_check);
  end if;

  insert into public.swipe_bucks_redemptions (user_id, amount_cents, restaurant_id, status, idempotency_key, processed_at, processed_by)
  values (p_user_id, p_amount_cents, p_restaurant_id, 'approved', p_idempotency_key, now(), null)
  on conflict (user_id, idempotency_key) do update set status = 'approved'
  returning id into v_redemption_id;

  -- Debit wallet.
  perform public.swipe_bucks_recalculate_wallet(p_user_id);
  select * into v_wallet from public.swipe_bucks_wallets where user_id = p_user_id;

  return jsonb_build_object('success', true, 'redemption_id', v_redemption_id, 'wallet', v_wallet);
end;
$$;

-- Fraud/risk detection: flag suspicious users based on simple patterns.
create or replace function public.swipe_bucks_evaluate_user_risk(p_user_id uuid)
returns public.swipe_bucks_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flags text[] := '{}';
  v_status text := 'eligible';
  v_wallet public.swipe_bucks_wallets;
  v_reciprocal_count int;
  v_new_account_count int;
  v_velocity_count int;
  v_duplicate_posts int;
  v_reversal_count int;
begin
  select * into v_wallet from public.swipe_bucks_wallets where user_id = p_user_id;
  if v_wallet.user_id is null then return null; end if;

  -- Reciprocal rings: small group repeatedly rewarding each other.
  select count(distinct source_user_id) into v_reciprocal_count
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit'
    and source_user_id in (
      select distinct user_id from public.swipe_bucks_ledger where source_user_id = p_user_id and type = 'credit'
    );
  if v_reciprocal_count >= 3 then
    v_flags := array_append(v_flags, 'reciprocal_rewarding');
  end if;

  -- Many new accounts engaging with one contributor.
  select count(distinct source_user_id) into v_new_account_count
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit'
    and source_user_id in (
      select id from auth.users where created_at > now() - interval '7 days'
    );
  if v_new_account_count >= 5 then
    v_flags := array_append(v_flags, 'new_account_engagement');
  end if;

  -- Rapid repeated engagement patterns.
  select count(*) into v_velocity_count
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'credit'
    and created_at > now() - interval '1 hour';
  if v_velocity_count >= 20 then
    v_flags := array_append(v_flags, 'high_reward_velocity');
  end if;

  -- Reward farming across near-duplicate posts.
  select count(*) into v_duplicate_posts
  from (
    select lower(trim(dish_name)) as name
    from public.community_food_posts
    where user_id = p_user_id and created_at > now() - interval '24 hours'
    group by lower(trim(dish_name))
    having count(*) >= 3
  ) sub;
  if v_duplicate_posts > 0 then
    v_flags := array_append(v_flags, 'duplicate_post_farming');
  end if;

  -- Repeated reversals.
  select count(*) into v_reversal_count
  from public.swipe_bucks_ledger
  where user_id = p_user_id and type = 'reversal'
    and created_at > now() - interval '30 days';
  if v_reversal_count >= 3 then
    v_flags := array_append(v_flags, 'repeated_reversals');
  end if;

  if array_length(v_flags, 1) > 0 then
    v_status := 'review';
  end if;

  update public.swipe_bucks_wallets
  set risk_flags = to_jsonb(v_flags),
      redemption_status = v_status,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$$;

-- ============================================================
-- PERMISSIONS
-- ============================================================
grant execute on function public.swipe_bucks_check_redemption(uuid, int, uuid) to authenticated;
grant execute on function public.swipe_bucks_user_redeemed(uuid, text) to service_role;
grant execute on function public.swipe_bucks_global_redeemed_this_month() to service_role;
grant execute on function public.swipe_bucks_restaurant_redeemed_this_month(uuid) to service_role;
grant execute on function public.swipe_bucks_recalculate_wallet(uuid) to service_role;
grant execute on function public.swipe_bucks_redeem(uuid, int, uuid, text) to service_role;
grant execute on function public.swipe_bucks_evaluate_user_risk(uuid) to service_role;
