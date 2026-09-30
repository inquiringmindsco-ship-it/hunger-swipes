-- Hunger Swipes — Fix record_food_swipe to use the canonical food_impact_events table.
-- Migration 029 originally referenced public.impact_events, which does not exist;
-- migration 027 already created public.food_impact_events and public.record_food_impact_event.
-- This migration makes the swipe recorder use that canonical table/function.

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
      select d.seller_id, 'seller'::text into owner_id, owner_type from dishes d where d.id = p_content_id;
    else
      update community_food_posts set
        right_swipes = greatest(0, right_swipes + case when p_direction = 'right' then 1 else 0 end - case when previous_direction = 'right' then 1 else 0 end),
        left_swipes = greatest(0, left_swipes + case when p_direction = 'left' then 1 else 0 end - case when previous_direction = 'left' then 1 else 0 end)
      where id = p_content_id;
      select c.user_id, 'user'::text into owner_id, owner_type from community_food_posts c where c.id = p_content_id;
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

  if p_direction = 'right' and previous_direction is distinct from p_direction then
    perform public.record_food_impact_event(
      p_actor_id := p_actor_id,
      p_event_type := 'right_swipe',
      p_dish_id := case when p_content_kind = 'official' then p_content_id end,
      p_community_post_id := case when p_content_kind = 'community' then p_content_id end,
      p_seller_id := owner_id,
      p_metadata := jsonb_build_object(
        'actor_id', p_actor_id,
        'content_kind', p_content_kind,
        'content_id', p_content_id,
        'direction', p_direction,
        'owner_type', owner_type,
        'owner_id', owner_id
      )
    );
  end if;

  return true;
end;
$$;

revoke all on function public.record_food_swipe(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.record_food_swipe(uuid,text,uuid,text) to service_role;
