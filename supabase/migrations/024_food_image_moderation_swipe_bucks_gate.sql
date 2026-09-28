-- Hunger Swipes — Gate Swipe Bucks behind approved moderation status.
-- Also ensures first-photo bonus only fires after approval.

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
  v_post_status text;
  v_post_moderation text;
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

  -- Verify the post belongs to the user being rewarded and is approved/active.
  select status, moderation_status into v_post_status, v_post_moderation
  from public.community_food_posts where id = p_post_id and user_id = p_user_id;
  if v_post_status is null or v_post_moderation != 'approved' then
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

-- Update swipe trigger to require approved moderation.
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
  if v_post.moderation_status != 'approved' then return NEW; end if;
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

-- Update first-photo trigger to require approved moderation.
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
  v_ledger_id uuid;
begin
  if NEW.status != 'active' or NEW.user_id is null then return NEW; end if;
  if NEW.moderation_status != 'approved' then return NEW; end if;
  if NEW.first_photo_rewarded then return NEW; end if;
  select * into v_config from public.swipe_bucks_config where id = 1;
  if not found or not v_config.active then return NEW; end if;

  -- Count existing approved community photos for this place + dish name.
  select count(*) into v_existing from public.community_food_posts
  where place_id = NEW.place_id
    and lower(trim(dish_name)) = lower(trim(NEW.dish_name))
    and status = 'active'
    and moderation_status = 'approved'
    and id != NEW.id;

  if v_existing = 0 then
    v_source_event_id := NEW.user_id::text || ':' || NEW.id::text || ':first_photo';
    v_ledger_id := public.process_swipe_bucks_reward(
      NEW.user_id, NEW.id, 'first_photo', null, v_source_event_id,
      v_config.first_photo_cents,
      'First approved community photo for dish at place',
      jsonb_build_object('place_id', NEW.place_id, 'dish_name', NEW.dish_name)
    );
    if v_ledger_id is not null then
      update public.community_food_posts
        set first_photo_rewarded = true,
            first_photo_reward_processed_at = now()
        where id = NEW.id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Update trigger to also fire when moderation_status changes (e.g. admin approves).
drop trigger if exists swipe_bucks_first_photo on public.community_food_posts;
create trigger swipe_bucks_first_photo
  after insert or update of status, moderation_status on public.community_food_posts
  for each row
  when (NEW.status = 'active' AND NEW.moderation_status = 'approved')
  execute function public.swipe_bucks_handle_first_photo();

grant execute on function public.process_swipe_bucks_reward(uuid, uuid, text, uuid, text, int, text, jsonb) to service_role;
grant execute on function public.swipe_bucks_handle_swipe() to service_role;
grant execute on function public.swipe_bucks_handle_first_photo() to service_role;
