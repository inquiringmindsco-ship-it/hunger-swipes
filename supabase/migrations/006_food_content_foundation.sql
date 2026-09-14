-- Production food foundation: places, community posts, explicit content origin,
-- authenticated interactions, and atomic analytics.

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  location_text text not null check (char_length(trim(location_text)) between 2 and 240),
  address text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  external_place_id text unique,
  source text not null default 'community' check (source in ('community','seller','legacy_import')),
  claimed_seller_id uuid unique references public.sellers(id) on delete set null,
  legacy_seller_id uuid unique references public.sellers(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_places_status_name on public.places(status, name);
create index if not exists idx_places_coordinates on public.places(latitude, longitude);

create table if not exists public.community_food_posts (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  creator_name text not null default 'Community member',
  dish_name text not null check (char_length(trim(dish_name)) between 2 and 160),
  description text,
  photo_url text not null,
  price numeric(10,2) check (price is null or price >= 0),
  category text,
  tags text[] not null default '{}',
  source text not null default 'community' check (source in ('community','legacy_import')),
  status text not null default 'active' check (status in ('active','removed')),
  impressions integer not null default 0 check (impressions >= 0),
  right_swipes integer not null default 0 check (right_swipes >= 0),
  left_swipes integer not null default 0 check (left_swipes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_posts_feed on public.community_food_posts(status, created_at desc);
create index if not exists idx_community_posts_place on public.community_food_posts(place_id);
create index if not exists idx_community_posts_user on public.community_food_posts(user_id, created_at desc);
alter table public.dishes add column if not exists place_id uuid references public.places(id) on delete set null;
alter table public.dishes add column if not exists content_origin text not null default 'official'
  check (content_origin in ('official'));
create index if not exists idx_dishes_place on public.dishes(place_id);

-- One durable place per historical seller. Owned sellers are claimed; legacy
-- sellers become unclaimed places instead of masquerading as official listings.
insert into public.places (
  name, location_text, address, latitude, longitude, source,
  claimed_seller_id, legacy_seller_id, created_by, status, created_at
)
select
  trim(s.business_name),
  trim(coalesce(nullif(s.location_text, ''), nullif(s.address, ''), 'Location not supplied')),
  s.address,
  s.latitude,
  s.longitude,
  case when s.owner_user_id is null then 'legacy_import' else 'seller' end,
  case when s.owner_user_id is null then null else s.id end,
  s.id,
  s.owner_user_id,
  'active',
  s.created_at
from public.sellers s
where not exists (select 1 from public.places p where p.legacy_seller_id = s.id);

update public.dishes d
set place_id = p.id,
    content_origin = 'official'
from public.places p
where p.legacy_seller_id = d.seller_id
  and d.place_id is null;

-- Preserve legitimate-looking legacy food as clearly labeled community content.
-- Obvious test records are intentionally not migrated into the public feed.
insert into public.community_food_posts (
  place_id, creator_name, dish_name, description, photo_url, price, category,
  tags, source, status, impressions, right_swipes, left_swipes, created_at
)
select
  p.id,
  'Hunger Swipes community',
  trim(d.name),
  d.description,
  d.photo_url,
  d.price,
  d.category,
  coalesce(d.tags, '{}'),
  'legacy_import',
  'active',
  d.impressions,
  d.right_swipes,
  d.left_swipes,
  d.created_at
from public.dishes d
join public.sellers s on s.id = d.seller_id
join public.places p on p.legacy_seller_id = s.id
where s.owner_user_id is null
  and d.status = 'active'
  and d.availability = 'available'
  and d.photo_url is not null
  and trim(d.photo_url) <> ''
  and lower(trim(d.name)) not in ('test','sample','demo')
  and not exists (
    select 1 from public.community_food_posts c
    where c.source = 'legacy_import' and c.place_id = p.id and c.dish_name = d.name
  );

-- Unowned records remain recoverable but no longer appear as official sellers.
update public.dishes d
set status = 'removed'
from public.sellers s
where s.id = d.seller_id
  and s.owner_user_id is null
  and d.status = 'active';

update public.sellers
set status = 'suspended',
    suspension_reason = coalesce(suspension_reason, 'Legacy listing converted to an unclaimed Place')
where owner_user_id is null and status = 'active';

create table if not exists public.food_impressions (
  actor_id uuid not null references auth.users(id) on delete cascade,
  content_kind text not null check (content_kind in ('official','community')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, content_kind, content_id)
);

create table if not exists public.food_swipes (
  actor_id uuid not null references auth.users(id) on delete cascade,
  content_kind text not null check (content_kind in ('official','community')),
  content_id uuid not null,
  direction text not null check (direction in ('left','right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, content_kind, content_id)
);

create table if not exists public.saved_food (
  actor_id uuid not null references auth.users(id) on delete cascade,
  content_kind text not null check (content_kind in ('official','community')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, content_kind, content_id)
);

alter table public.places enable row level security;
alter table public.community_food_posts enable row level security;
alter table public.food_impressions enable row level security;
alter table public.food_swipes enable row level security;
alter table public.saved_food enable row level security;

drop policy if exists "places public read" on public.places;
create policy "places public read" on public.places for select using (status = 'active');

drop policy if exists "community posts public or owner read" on public.community_food_posts;
create policy "community posts public or owner read" on public.community_food_posts for select
  using (status = 'active' or user_id = auth.uid());

-- Interaction writes are server-mediated. Owners may read their own rows directly.
drop policy if exists "food impressions owner read" on public.food_impressions;
create policy "food impressions owner read" on public.food_impressions for select to authenticated
  using (actor_id = auth.uid());
drop policy if exists "food swipes owner read" on public.food_swipes;
create policy "food swipes owner read" on public.food_swipes for select to authenticated
  using (actor_id = auth.uid());
drop policy if exists "saved food owner read" on public.saved_food;
create policy "saved food owner read" on public.saved_food for select to authenticated
  using (actor_id = auth.uid());

create or replace function public.record_food_impression(
  p_actor_id uuid,
  p_content_kind text,
  p_content_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected_rows integer := 0;
begin
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

  insert into food_impressions(actor_id, content_kind, content_id)
  values (p_actor_id, p_content_kind, p_content_id)
  on conflict do nothing;
  get diagnostics affected_rows = row_count;

  if affected_rows > 0 then
    if p_content_kind = 'official' then
      update dishes set impressions = impressions + 1 where id = p_content_id;
    else
      update community_food_posts set impressions = impressions + 1 where id = p_content_id;
    end if;
  end if;
  return affected_rows > 0;
end;
$$;

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
    insert into saved_food(actor_id, content_kind, content_id)
    values (p_actor_id, p_content_kind, p_content_id)
    on conflict do nothing;
  else
    delete from saved_food
    where actor_id = p_actor_id and content_kind = p_content_kind and content_id = p_content_id;
  end if;

  return true;
end;
$$;

revoke all on function public.record_food_impression(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.record_food_swipe(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.record_food_impression(uuid,text,uuid) to service_role;
grant execute on function public.record_food_swipe(uuid,text,uuid,text) to service_role;

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at before update on public.places
for each row execute procedure public.set_updated_at();

drop trigger if exists community_food_posts_updated_at on public.community_food_posts;
create trigger community_food_posts_updated_at before update on public.community_food_posts
for each row execute procedure public.set_updated_at();
