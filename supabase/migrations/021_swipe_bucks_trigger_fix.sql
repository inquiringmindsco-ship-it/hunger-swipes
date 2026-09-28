-- Fix Swipe Bucks trigger function to handle food_swipes and saved_food safely.
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
  v_direction text;
begin
  if NEW.content_kind != 'community' then return NEW; end if;

  if TG_TABLE_NAME = 'food_swipes' then
    v_direction := to_jsonb(NEW) ->> 'direction';
    if v_direction != 'right' then return NEW; end if;
    v_event := 'right_swipe';
    select * into v_config from public.swipe_bucks_config where id = 1;
    if not found or not v_config.active then return NEW; end if;
    v_amount := v_config.right_swipe_cents;
    v_source_event_id := NEW.actor_id::text || ':' || NEW.content_kind || ':' || NEW.content_id || ':right';
  elsif TG_TABLE_NAME = 'saved_food' then
    v_event := 'save';
    select * into v_config from public.swipe_bucks_config where id = 1;
    if not found or not v_config.active then return NEW; end if;
    v_amount := v_config.save_cents;
    v_source_event_id := NEW.actor_id::text || ':' || NEW.content_kind || ':' || NEW.content_id;
  else
    return NEW;
  end if;

  select * into v_post from public.community_food_posts where id = NEW.content_id limit 1;
  if v_post.id is null or v_post.user_id is null then return NEW; end if;

  perform public.process_swipe_bucks_reward(
    v_post.user_id, v_post.id, v_event, NEW.actor_id, v_source_event_id,
    v_amount, 'Reward for ' || v_event || ' on community post',
    jsonb_build_object('source_table', TG_TABLE_NAME)
  );

  return NEW;
end;
$$;
