-- Hunger Swipes — Food Intent Platform: private impact instrumentation.
-- Extend swipe recording to durably record food interaction signals for later
-- metric design. Does NOT compute or display a public Food Impact score.

-- Impact event kinds are intentionally minimal during Phase A.
create or replace function public.record_food_swipe(
  p_actor_id uuid,
  p_content_kind text,
  p_content_id uuid,
  p_direction text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare previous_direction text;
        owner_id uuid;
        owner_type text;
        event_payload jsonb;
begin
  if p_direction not in ('left','right') then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || p_content_kind || ':' || p_content_id::text, 0));

  if p_content_kind = 'official' then
    if not exists (
      select 1 from dishes d join sellers s on s.id = d.seller_id
      where d.id = p_content_id and d.status = 'active' and d.availability = 'available' and s.status = 'active'
    ) then return false; end if;
  elsif p_content_kind = 'community' then
    if not exists (
      select 1 from community_food_posts c join places p on p.id = c.place_id
      where c.id = p_content_id and c.status = 'active' and p.status = 'active'
    ) then return false; end if;
  else
    return false;
  end if;

  select direction into previous_direction from food_swipes
  where actor_id = p_actor_id and content_kind = p_content_kind and content_id = p_content_id;

  insert into food_swipes(actor_id, content_kind, content_id, direction)
  values (p_actor_id, p_content_kind, p_content_id, p_direction)
  on conflict (actor_id, content_kind, content_id)
  do update set direction = excluded.direction, updated_at = now();

  if previous_direction is distinct from p_direction then
    if p_content_kind = 'official' then
      update dishes set
        right_swipes = greatest(0, right_swipes + case when p_direction = 'right' then 1 else 0 end - case when previous_direction = 'right' then 1 else 0 end),
        left_swipes = greatest(0, left_swipes + case when p_direction = 'left' then 1 else 0 end - case when previous_direction = 'left' then 1 else 0 end)
      where id = p_content_id;
    else
      update community_food_posts set
        right_swipes = greatest(0, right_swipes + case when p_direction = 'right' then 1 else 0 end - case when previous_direction = 'right' then 1 else 0 end),
        left_swipes = greatest(0, left_swipes + case when p_direction = 'left' then 1 else 0 end - case when previous_direction = 'left' then 1 else 0 end)
      where id = p_content_id;
    end if;
  end if;

  if p_direction = 'right' then
    insert into saved_food(actor_id, content_kind, content_id, created_at)
    values (p_actor_id, p_content_kind, p_content_id, now())
    on conflict (actor_id, content_kind, content_id)
    do update set created_at = now();
  else
    delete from saved_food
    where actor_id = p_actor_id and content_kind = p_content_kind and content_id = p_content_id;
  end if;

  -- Private impact instrumentation: record the swipe event with owner attribution.
  if p_direction = 'right' and previous_direction is distinct from p_direction then
    if p_content_kind = 'official' then
      select d.seller_id, 'seller'::text into owner_id, owner_type
      from dishes d
      where d.id = p_content_id;
    else
      select c.user_id, 'user'::text into owner_id, owner_type
      from community_food_posts c
      where c.id = p_content_id;
    end if;

    event_payload := jsonb_build_object(
      'actor_id', p_actor_id,
      'content_kind', p_content_kind,
      'content_id', p_content_id,
      'direction', p_direction
    );

    insert into public.impact_events(
      actor_id, owner_id, owner_type, event_type, event_payload, source_context, value_score
    )
    values (
      p_actor_id,
      owner_id,
      owner_type,
      'right_swipe',
      event_payload,
      'food_swipe',
      1
    );
  end if;

  return true;
end;
$$;

-- Ensure service role still owns execute; re-grant if migrations ran in different order.
revoke all on function public.record_food_swipe(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.record_food_swipe(uuid,text,uuid,text) to service_role;
