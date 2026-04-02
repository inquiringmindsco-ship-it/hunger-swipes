-- HungerSwipes Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  -- Note: removed FK to auth.users for demo flexibility. Use RLS + trigger for auth linking instead.
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'eater' check (role in ('eater', 'creator', 'restaurant')),
  username text unique,
  bio text,
  commission_rate float default 0.10 check (commission_rate between 0.05 and 0.20),
  total_earnings float default 0,
  pending_earnings float default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PHOTOS
-- ============================================================
create table if not exists public.photos (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  thumbnail_url text,
  restaurant_name text not null,
  restaurant_location text,
  restaurant_lat float,
  restaurant_lng float,
  dish_name text not null,
  cuisine_type text,
  price_range text check (price_range in ('$', '$$', '$$$', '$$$$')),
  commission_rate float default 0.10 check (commission_rate between 0.05 and 0.20),
  hunger_score float default 0,
  swipes_total int default 0,
  swipes_right int default 0,
  super_hungers int default 0,
  saves int default 0,
  orders int default 0,
  earnings_total float default 0,
  status text default 'active' check (status in ('active', 'pending', 'removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HungerScore formula: weighted combination of engagement metrics
-- hunger_score = (right_rate * 40) + (super_rate * 25) + (save_rate * 15) + (order_rate * 20)
create or replace function public.calculate_hunger_score(photo_id uuid)
returns void as $$
declare
  v_swipes_total int;
  v_swipes_right int;
  v_super_hungers int;
  v_saves int;
  v_orders int;
  v_right_rate float;
  v_super_rate float;
  v_save_rate float;
  v_order_rate float;
  v_score float;
begin
  select swipes_total, swipes_right, super_hungers, saves, orders
  into v_swipes_total, v_swipes_right, v_super_hungers, v_saves, v_orders
  from public.photos where id = photo_id;

  if v_swipes_total = 0 then
    v_score := 0;
  else
    v_right_rate := v_swipes_right::float / v_swipes_total;
    v_super_rate := v_super_hungers::float / v_swipes_total;
    v_save_rate := v_saves::float / v_swipes_total;
    v_order_rate := case when v_swipes_total > 0 then v_orders::float / v_swipes_total else 0 end;

    v_score := (v_right_rate * 40) + (v_super_rate * 25) + (v_save_rate * 15) + (v_order_rate * 20);
    v_score := round(v_score * 100) / 100; -- 0-100 scale approximation
  end if;

  update public.photos set hunger_score = v_score, updated_at = now() where id = photo_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- SWIPES
-- ============================================================
create table if not exists public.swipes (
  id uuid default gen_random_uuid() primary key,
  eater_id uuid references public.profiles(id) on delete cascade not null,
  photo_id uuid references public.photos(id) on delete cascade not null,
  direction text not null check (direction in ('right', 'left', 'up')),
  created_at timestamptz default now(),
  unique(eater_id, photo_id) -- one swipe per eater per photo
);

-- Index for fast lookups
create index if not exists idx_swipes_eater_id on public.swipes(eater_id);
create index if not exists idx_swipes_photo_id on public.swipes(photo_id);
create index if not exists idx_swipes_direction on public.swipes(direction);

-- ============================================================
-- MATCHES (eater swiped right on photo)
-- ============================================================
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  eater_id uuid references public.profiles(id) on delete cascade not null,
  photo_id uuid references public.photos(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(eater_id, photo_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id) not null,
  eater_id uuid references public.profiles(id) not null,
  creator_id uuid references public.profiles(id) not null,
  restaurant_name text not null,
  dish_name text not null,
  dish_price float not null,
  commission_rate float not null,
  commission_amount float not null,
  platform_fee float not null,
  creator_earnings float not null,
  status text default 'pending' check (status in ('pending', 'completed', 'refunded')),
  order_url text,
  created_at timestamptz default now()
);

create index if not exists idx_orders_creator_id on public.orders(creator_id);
create index if not exists idx_orders_photo_id on public.orders(photo_id);

-- ============================================================
-- EARNINGS LEDGER
-- ============================================================
create table if not exists public.earnings (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  photo_id uuid references public.photos(id) not null,
  order_id uuid references public.orders(id) not null,
  amount float not null,
  status text default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz default now(),
  paid_at timestamptz
);

create index if not exists idx_earnings_creator_id on public.earnings(creator_id);

-- ============================================================
-- TRIGGER: Update photo stats + earnings on new swipe
-- ============================================================
create or replace function public.handle_new_swipe()
returns trigger as $$
declare
  v_creator_id uuid;
  v_commission_rate float;
begin
  -- Update photo swipes_total
  update public.photos
  set swipes_total = swipes_total + 1,
      swipes_right = case when new.direction = 'right' then swipes_right + 1 else swipes_right end,
      super_hungers = case when new.direction = 'up' then super_hungers + 1 else super_hungers end,
      updated_at = now()
  where id = new.photo_id;

  -- If right swipe, create a match
  if new.direction = 'right' then
    insert into public.matches (eater_id, photo_id)
    values (new.eater_id, new.photo_id)
    on conflict (eater_id, photo_id) do nothing;
  end if;

  -- Recalculate hunger score
  perform public.calculate_hunger_score(new.photo_id);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_swipe_created on public.swipes;
create trigger on_swipe_created
  after insert on public.swipes
  for each row execute procedure public.handle_new_swipe();

-- ============================================================
-- TRIGGER: Process order and credit earnings
-- ============================================================
create or replace function public.handle_completed_order()
returns trigger as $$
declare
  v_platform_fee float;
  v_creator_earnings float;
begin
  -- Platform takes 10% of commission
  v_platform_fee := new.commission_amount * 0.10;
  v_creator_earnings := new.commission_amount - v_platform_fee;

  update public.orders
  set platform_fee = v_platform_fee,
      creator_earnings = v_creator_earnings,
      status = 'completed'
  where id = new.id;

  -- Update photo stats
  update public.photos
  set orders = orders + 1,
      earnings_total = earnings_total + v_creator_earnings,
      updated_at = now()
  where id = new.photo_id;

  -- Update creator earnings
  update public.profiles
  set total_earnings = total_earnings + v_creator_earnings,
      pending_earnings = pending_earnings + v_creator_earnings,
      updated_at = now()
  where id = new.creator_id;

  -- Insert earnings ledger entry
  insert into public.earnings (creator_id, photo_id, order_id, amount)
  values (new.creator_id, new.photo_id, new.id, v_creator_earnings);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_completed on public.orders;
create trigger on_order_completed
  after insert on public.orders
  for each row execute procedure public.handle_completed_order();

-- ============================================================
-- METADATA COLUMNS FOR PHOTOS (ADDED BY TAGGING SYSTEM)
-- ============================================================
-- These ADD columns to existing photos table - safe to re-run

alter table public.photos add column if not exists title text;
alter table public.photos add column if not exists description text;
alter table public.photos add column if not exists tags text[];
alter table public.photos add column if not exists dietary_tags text[];
alter table public.photos add column if not exists ingredient_tags text[];
alter table public.photos add column if not exists cuisine_tags text[];
alter table public.photos add column if not exists calories integer;
alter table public.photos add column if not exists protein_grams integer;
alter table public.photos add column if not exists carbs_grams integer;
alter table public.photos add column if not exists fat_grams integer;
alter table public.photos add column if not exists spice_level integer check (spice_level between 1 and 5);
alter table public.photos add column if not exists portion_size text check (portion_size in ('light', 'regular', 'large', 'shareable'));
alter table public.photos add column if not exists location_text text;
alter table public.photos add column if not exists price float;
alter table public.photos add column if not exists vegetarian_option boolean default false;
alter table public.photos add column if not exists vegan_option boolean default false;
alter table public.photos add column if not exists gluten_free_option boolean default false;
alter table public.photos add column if not exists health_category text check (health_category in ('healthy', 'indulgent', 'balanced', 'protein-packed', 'light'));
alter table public.photos add column if not exists completeness_score integer default 0 check (completeness_score between 0 and 100);
alter table public.photos add column if not exists metadata_quality_status text default 'basic' check (metadata_quality_status in ('basic', 'enhanced', 'top-tier'));
alter table public.photos add column if not exists metadata_updated_at timestamptz;

-- Index for fast tag filtering
create index if not exists idx_photos_tags on public.photos using gin(tags);
create index if not exists idx_photos_dietary_tags on public.photos using gin(dietary_tags);
create index if not exists idx_photos_cuisine_tags on public.photos using gin(cuisine_tags);
create index if not exists idx_photos_completeness on public.photos(completeness_score);
create index if not exists idx_photos_metadata_status on public.photos(metadata_quality_status);

-- ============================================================
-- PHOTO METADATA TABLE (Extended metadata, one-to-one with photos)
-- ============================================================
create table if not exists public.photo_metadata (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id) on delete cascade not null unique,
  -- Text fields
  title text,
  description text,
  -- Tags
  tags text[],
  dietary_tags text[],
  ingredient_tags text[],
  cuisine_tags text[],
  -- Nutrition
  calories integer,
  protein_grams integer,
  carbs_grams integer,
  fat_grams integer,
  -- Details
  spice_level integer check (spice_level between 1 and 5),
  portion_size text check (portion_size in ('light', 'regular', 'large', 'shareable')),
  location_text text,
  price float,
  -- Dietary options
  vegetarian_option boolean default false,
  vegan_option boolean default false,
  gluten_free_option boolean default false,
  -- Categorization
  health_category text check (health_category in ('healthy', 'indulgent', 'balanced', 'protein-packed', 'light')),
  -- Scoring
  completeness_score integer default 0 check (completeness_score between 0 and 100),
  metadata_quality_status text default 'basic' check (metadata_quality_status in ('basic', 'enhanced', 'top-tier')),
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for photo_metadata
alter table public.photo_metadata enable row level security;
create policy "Photo metadata publicly readable" on public.photo_metadata for select using (true);
create policy "Creators can manage own photo metadata" on public.photo_metadata for all using (
  auth.uid() = (select creator_id from public.photos where id = photo_id)
);

-- ============================================================
-- FUNCTION: Recalculate completeness score
-- ============================================================
create or replace function public.calculate_metadata_completeness(metadata_id uuid)
returns integer as $$
declare
  v_score integer := 0;
  v_title text;
  v_description text;
  v_tags text[];
  v_dietary_tags text[];
  v_cuisine_tags text[];
  v_calories integer;
  v_protein integer;
  v_carbs integer;
  v_fat integer;
  v_price float;
  v_restaurant text;
  v_location text;
  v_portion text;
  v_ingredients text[];
  v_veg boolean;
  v_vegan boolean;
  v_gf boolean;
  v_spice integer;
  v_health text;
begin
  select title, description, tags, dietary_tags, cuisine_tags, calories,
         protein_grams, carbs_grams, fat_grams, price,
         (select restaurant_name from public.photos where id = photo_metadata.photo_id),
         location_text, portion_size, ingredient_tags,
         vegetarian_option, vegan_option, gluten_free_option,
         spice_level, health_category
  into v_title, v_description, v_tags, v_dietary_tags, v_cuisine_tags, v_calories,
       v_protein, v_carbs, v_fat, v_price,
       v_restaurant, v_location, v_portion, v_ingredients,
       v_veg, v_vegan, v_gf, v_spice, v_health
  from public.photo_metadata where id = metadata_id;

  -- Title: 5
  if v_title is not null and trim(v_title) <> '' then v_score := v_score + 5; end if;
  
  -- Description: 10
  if v_description is not null and length(trim(v_description)) >= 20 then v_score := v_score + 10;
  elsif v_description is not null and length(trim(v_description)) > 0 then v_score := v_score + 5; end if;
  
  -- Tags: 15
  if v_tags is not null and array_length(v_tags, 1) >= 3 then v_score := v_score + 15;
  elsif v_tags is not null and array_length(v_tags, 1) > 0 then v_score := v_score + 5; end if;
  
  -- Dietary tags: 10
  if v_dietary_tags is not null and array_length(v_dietary_tags, 1) > 0 then v_score := v_score + 10; end if;
  
  -- Cuisine tags: 5
  if v_cuisine_tags is not null and array_length(v_cuisine_tags, 1) > 0 then v_score := v_score + 5; end if;
  
  -- Calories: 10
  if v_calories is not null then v_score := v_score + 10; end if;
  
  -- Macros: 10
  if v_protein is not null and v_carbs is not null and v_fat is not null then v_score := v_score + 10; end if;
  
  -- Price: 10
  if v_price is not null then v_score := v_score + 10; end if;
  
  -- Restaurant + location: 10
  if v_restaurant is not null and v_location is not null then v_score := v_score + 10;
  elsif v_restaurant is not null or v_location is not null then v_score := v_score + 5; end if;
  
  -- Portion size: 5
  if v_portion is not null then v_score := v_score + 5; end if;
  
  -- Ingredient tags: 5
  if v_ingredients is not null and array_length(v_ingredients, 1) >= 3 then v_score := v_score + 5;
  elsif v_ingredients is not null and array_length(v_ingredients, 1) > 0 then v_score := v_score + 2; end if;
  
  -- Veg/vegan/gluten-free: 10
  if v_veg or v_vegan or v_gf then v_score := v_score + 10; end if;
  
  -- Spice or health: 5
  if v_spice is not null or v_health is not null then v_score := v_score + 5; end if;
  
  return least(100, v_score);
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: Update photo completeness from metadata
-- ============================================================
create or replace function public.sync_photo_completeness()
returns trigger as $$
declare
  v_completeness integer;
  v_status text;
begin
  v_completeness := public.calculate_metadata_completeness(new.id);
  
  if v_completeness >= 71 then
    v_status := 'top-tier';
  elsif v_completeness >= 31 then
    v_status := 'enhanced';
  else
    v_status := 'basic';
  end if;
  
  update public.photos
  set completeness_score = v_completeness,
      metadata_quality_status = v_status,
      metadata_updated_at = now()
  where id = new.photo_id;
  
  update public.photo_metadata
  set completeness_score = v_completeness,
      metadata_quality_status = v_status,
      updated_at = now()
  where id = new.id;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_photo_metadata_changed on public.photo_metadata;
create trigger on_photo_metadata_changed
  after insert or update on public.photo_metadata
  for each row execute procedure public.sync_photo_completeness();

-- ============================================================
-- EXPANDED PROFILES (v2 - adds social + verification fields)
-- ============================================================
alter table public.profiles add column if not exists role text default 'eater' check (role in ('eater', 'scout', 'home_creator', 'cottage_creator', 'verified_creator', 'restaurant'));
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists follower_count int default 0;
alter table public.profiles add column if not exists following_count int default 0;
alter table public.profiles add column if not exists post_count int default 0;
alter table public.profiles add column if not exists verification_status text default 'none' check (verification_status in ('none', 'pending', 'approved', 'rejected'));
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists kitchen_type text;
alter table public.profiles add column if not exists has_kitchen boolean default false;
alter table public.profiles add column if not exists needs_kitchen boolean default false;
alter table public.profiles add column if not exists agreed_to_terms boolean default false;
alter table public.profiles add column if not exists terms_agreed_at timestamptz;

-- Update role constraint to include new roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('eater', 'scout', 'home_creator', 'cottage_creator', 'verified_creator', 'restaurant'));

-- ============================================================
-- PHOTOS: Add viral_score and content_label
-- ============================================================
alter table public.photos add column if not exists viral_score int default 0;
alter table public.photos add column if not exists content_label text default 'discovery' check (content_label in ('discovery', 'trending', 'monetized', 'verified_kitchen'));
alter table public.photos add column if not exists recipe_id uuid references public.photo_metadata(id);

create index if not exists idx_photos_viral_score on public.photos(viral_score);
create index if not exists idx_photos_content_label on public.photos(content_label);

-- ============================================================
-- ORDERS: Add locked payout fields
-- ============================================================
alter table public.orders add column if not exists creator_rate float default 0.85;
alter table public.orders add column if not exists payout_tier text default 'basic';
alter table public.orders add column if not exists completeness_score int default 0;

-- ============================================================
-- EARNINGS: Add source field for tips/recipes
-- ============================================================
alter table public.earnings add column if not exists recipe_id uuid;
alter table public.earnings add column if not exists tip_id uuid;
alter table public.earnings add column if not exists source text default 'order' check (source in ('order', 'recipe', 'tip'));

-- ============================================================
-- TIPS (Support / Proud to Pay)
-- ============================================================
create table if not exists public.tips (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  photo_id uuid references public.photos(id) on delete set null,
  amount float not null check (amount > 0),
  message text,
  status text default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz default now()
);

create index if not exists idx_tips_creator_id on public.tips(creator_id);
create index if not exists idx_tips_sender_id on public.tips(sender_id);

-- RLS for tips
alter table public.tips enable row level security;
create policy "Tips are publicly readable" on public.tips for select using (true);
create policy "Users can send tips" on public.tips for insert with check (auth.uid() = sender_id);
create policy "Creators can view tips received" on public.tips for select using (auth.uid() = creator_id);

-- ============================================================
-- RECIPES (Paid recipes attached to posts)
-- ============================================================
create table if not exists public.recipes (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id) on delete cascade not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  recipe_title text not null,
  ingredients text[] not null,
  steps text[] not null,
  prep_time_minutes int,
  cook_time_minutes int,
  price float default 0 check (price >= 0),
  purchase_count int default 0,
  revenue_total float default 0,
  status text default 'active' check (status in ('active', 'removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_recipes_photo_id on public.recipes(photo_id);
create index if not exists idx_recipes_creator_id on public.recipes(creator_id);

-- RLS for recipes
alter table public.recipes enable row level security;
create policy "Recipes are publicly readable" on public.recipes for select using (status = 'active');
create policy "Creators can manage own recipes" on public.recipes for all using (auth.uid() = creator_id);

-- ============================================================
-- RECIPE PURCHASES
-- ============================================================
create table if not exists public.recipe_purchases (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  amount_paid float not null,
  creator_earnings float not null,
  platform_fee float not null,
  created_at timestamptz default now(),
  unique(recipe_id, buyer_id)
);

create index if not exists idx_recipe_purchases_recipe_id on public.recipe_purchases(recipe_id);
create index if not exists idx_recipe_purchases_buyer_id on public.recipe_purchases(buyer_id);

-- RLS for recipe purchases
alter table public.recipe_purchases enable row level security;
create policy "Creators can view purchases of own recipes" on public.recipe_purchases for select using (
  auth.uid() = (select creator_id from public.recipes where id = recipe_id)
);
create policy "Buyers can view own purchases" on public.recipe_purchases for select using (auth.uid() = buyer_id);

-- ============================================================
-- FOLLOWERS
-- ============================================================
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

create index if not exists idx_follows_follower_id on public.follows(follower_id);
create index if not exists idx_follows_following_id on public.follows(following_id);

-- RLS for follows
alter table public.follows enable row level security;
create policy "Follows are publicly readable" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Trigger to update follower/following counts
create or replace function public.update_follow_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_changed on public.follows;
create trigger on_follow_changed
  after insert or delete on public.follows
  for each row execute procedure public.update_follow_counts();

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  reply_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_comments_photo_id on public.comments(photo_id);
create index if not exists idx_comments_user_id on public.comments(user_id);

-- RLS for comments
alter table public.comments enable row level security;
create policy "Comments are publicly readable" on public.comments for select using (true);
create policy "Users can post comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- ============================================================
-- REACTIONS
-- ============================================================
create table if not exists public.reactions (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reaction_type text not null check (reaction_type in ('love', 'hungry', 'yum', 'wow')),
  created_at timestamptz default now(),
  unique(photo_id, user_id)
);

create index if not exists idx_reactions_photo_id on public.reactions(photo_id);

-- RLS for reactions
alter table public.reactions enable row level security;
create policy "Reactions are publicly readable" on public.reactions for select using (true);
create policy "Users can react" on public.reactions for insert with check (auth.uid() = user_id);
create policy "Users can remove reactions" on public.reactions for delete using (auth.uid() = user_id);

-- ============================================================
-- FOOD MOODS (Social posts)
-- ============================================================
create table if not exists public.food_moods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_public boolean default true,
  like_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_food_moods_user_id on public.food_moods(user_id);

-- RLS for food moods
alter table public.food_moods enable row level security;
create policy "Public food moods are readable" on public.food_moods for select using (is_public = true or auth.uid() = user_id);
create policy "Users can post food moods" on public.food_moods for insert with check (auth.uid() = user_id);
create policy "Users can update own food moods" on public.food_moods for update using (auth.uid() = user_id);
create policy "Users can delete own food moods" on public.food_moods for delete using (auth.uid() = user_id);

-- ============================================================
-- CREATOR VERIFICATION
-- ============================================================
create table if not exists public.creator_verification (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null unique,
  business_name text not null,
  business_permit text,
  kitchen_type text not null check (kitchen_type in ('home', 'commercial', 'shared', 'pop-up')),
  kitchen_address text,
  kitchen_lat float,
  kitchen_lng float,
  needs_kitchen_assistance boolean default false,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_creator_verification_status on public.creator_verification(status);

-- RLS for creator verification
alter table public.creator_verification enable row level security;
create policy "Creator verification is readable by owner" on public.creator_verification for select using (auth.uid() = creator_id);
create policy "Creators can submit verification" on public.creator_verification for insert with check (auth.uid() = creator_id);
create policy "Creators can update pending verification" on public.creator_verification for update using (auth.uid() = creator_id and status = 'pending');

-- ============================================================
-- TRIGGER: Update profile post_count on photo insert
-- ============================================================
create or replace function public.update_post_count()
returns trigger as $$
begin
  update public.profiles set post_count = post_count + 1 where id = new.creator_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_photo_created on public.photos;
create trigger on_photo_created
  after insert on public.photos
  for each row execute procedure public.update_post_count();

-- ============================================================
-- TRIGGER: Update recipe purchase count and revenue
-- ============================================================
create or replace function public.handle_recipe_purchase()
returns trigger as $$
begin
  update public.recipes
  set purchase_count = purchase_count + 1,
      revenue_total = revenue_total + new.creator_earnings
  where id = new.recipe_id;
  
  -- Credit creator earnings
  update public.profiles
  set total_earnings = total_earnings + new.creator_earnings,
      pending_earnings = pending_earnings + new.creator_earnings
  where id = (select creator_id from public.recipes where id = new.recipe_id);
  
  -- Insert earnings ledger
  insert into public.earnings (creator_id, recipe_id, order_id, amount, source)
  values (
    (select creator_id from public.recipes where id = new.recipe_id),
    new.recipe_id,
    new.id,
    new.creator_earnings,
    'recipe'
  );
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_recipe_purchased on public.recipe_purchases;
create trigger on_recipe_purchased
  after insert on public.recipe_purchases
  for each row execute procedure public.handle_recipe_purchase();

-- ============================================================
-- TRIGGER: Update comment reply count
-- ============================================================
create or replace function public.handle_new_comment()
returns trigger as $$
begin
  if new.parent_id is not null then
    update public.comments set reply_count = reply_count + 1 where id = new.parent_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.handle_new_comment();

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.orders enable row level security;
alter table public.earnings enable row level security;

-- Profiles: public read, own write
create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Photos: public read, creator write
create policy "Photos are publicly readable" on public.photos for select using (status = 'active');
create policy "Creators can insert own photos" on public.photos for insert with check (auth.uid() = creator_id);
create policy "Creators can update own photos" on public.photos for update using (auth.uid() = creator_id);
create policy "Creators can delete own photos" on public.photos for delete using (auth.uid() = creator_id);

-- Swipes: own only
create policy "Users can insert own swipes" on public.swipes for insert with check (auth.uid() = eater_id);
create policy "Users can view own swipes" on public.swipes for select using (auth.uid() = eater_id);

-- Matches: own only
create policy "Users can view own matches" on public.matches for select using (auth.uid() = eater_id);
create policy "Users can insert own matches" on public.matches for insert with check (auth.uid() = eater_id);

-- Orders: creator can view own, eater can view own
create policy "Creators can view own orders" on public.orders for select using (auth.uid() = creator_id);
create policy "Eaters can view own orders" on public.orders for select using (auth.uid() = eater_id);
create policy "Anyone can insert orders" on public.orders for insert with check (true);

-- Earnings: own only
create policy "Users can view own earnings" on public.earnings for select using (auth.uid() = creator_id);

-- ============================================================
-- EDGE FUNCTION: Process swipe with commission calculation
-- ============================================================
-- Note: This is called via POST /api/swipe from the client
-- The API route handles the transaction

-- ============================================================
-- VISIT VERIFICATIONS (Proof layer)
-- ============================================================
create table if not exists public.visit_verifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  photo_id uuid references public.photos(id) on delete cascade,
  restaurant_name text not null,
  dish_name text,
  verification_type text default 'self-reported' check (verification_type in ('self-reported', 'photo-confirmed', 'receipt-confirmed')),
  accuracy_rating text check (accuracy_rating in ('accurate', 'mostly_accurate', 'not_accurate')),
  ordered_same_dish boolean default false,
  comparison_photo_url text,
  receipt_url text,
  notes text,
  points_awarded integer default 0,
  trust_level integer default 1 check (trust_level between 1 and 3),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.visit_verifications enable row level security;

create policy "Authenticated users can insert visit verifications"
  on public.visit_verifications for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own verifications"
  on public.visit_verifications for select
  using (auth.uid() = user_id);

create policy "Creators can view verifications for their photos"
  on public.visit_verifications for select
  using (
    exists (
      select 1 from public.photos
      where photos.id = visit_verifications.photo_id
      and photos.creator_id = auth.uid()
    )
  );

drop trigger if exists set_visit_verifications_updated_at on public.visit_verifications;
create trigger set_visit_verifications_updated_at
  before update on public.visit_verifications
  for each row execute procedure public.set_updated_at();

create index if not exists idx_visit_verifications_user_id on public.visit_verifications(user_id);
create index if not exists idx_visit_verifications_photo_id on public.visit_verifications(photo_id);

-- ============================================================
-- POINTS SYSTEM
-- ============================================================
create table if not exists public.user_points (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  total_points integer default 0,
  lifetime_points integer default 0,
  tier text default 'newbie' check (tier in ('newbie', 'foodie', 'critic', 'expert', 'legend')),
  updated_at timestamptz default now()
);

alter table public.user_points enable row level security;

create policy "Users can view their own points"
  on public.user_points for select
  using (auth.uid() = user_id);

create policy "Users can update their own points"
  on public.user_points for update
  using (auth.uid() = user_id);

-- Points config: action -> points awarded
create table if not exists public.points_config (
  id uuid default gen_random_uuid() primary key,
  action text unique not null,
  points integer not null,
  description text,
  active boolean default true
);

-- Seed default points config
insert into public.points_config (action, points, description) values
  ('check_in', 5, 'Confirmed you visited a restaurant'),
  ('accuracy_response', 5, 'Reported food accuracy'),
  ('comparison_photo', 15, 'Uploaded your own photo of the same dish'),
  ('receipt_proof', 20, 'Provided receipt or order confirmation'),
  ('first_visit', 10, 'Your first verification for a photo'),
  ('streak_3', 5, '3 verifications in a week'),
  ('streak_10', 20, '10 verifications in a week')
on conflict (action) do nothing;

alter table public.points_config enable row level security;
create policy "Anyone can view points config" on public.points_config for select using (true);

-- Trigger to update user_points total
create or replace function public.award_points_for_verification()
returns trigger as $$
declare
  v_action text;
  v_points integer;
  v_current_total integer;
  v_new_tier text;
begin
  -- Determine action type
  if NEW.verification_type = 'receipt-confirmed' then
    v_action := 'receipt_proof';
  elsif NEW.comparison_photo_url is not null then
    v_action := 'comparison_photo';
  elsif NEW.accuracy_rating is not null then
    v_action := 'accuracy_response';
  else
    v_action := 'check_in';
  end if;

  -- Get points for this action
  select points into v_points
  from public.points_config
  where action = v_action and active = true;

  if v_points is null then
    v_points := 5; -- default fallback
  end if;

  -- Update or insert user_points
  insert into public.user_points (user_id, total_points, lifetime_points, tier)
  values (NEW.user_id, v_points, v_points, 'foodie')
  on conflict (user_id) do update set
    total_points = user_points.total_points + v_points,
    lifetime_points = user_points.lifetime_points + v_points,
    tier = case
      when user_points.lifetime_points + v_points >= 1000 then 'legend'
      when user_points.lifetime_points + v_points >= 500 then 'expert'
      when user_points.lifetime_points + v_points >= 200 then 'critic'
      when user_points.lifetime_points + v_points >= 50 then 'foodie'
      else 'newbie'
    end,
    updated_at = now();

  -- Update verification with points awarded
  NEW.points_awarded := v_points;
  NEW.status := 'approved';

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_visit_verification_approved on public.visit_verifications;
create trigger on_visit_verification_approved
  after insert on public.visit_verifications
  for each row
  when (NEW.status = 'pending')
  execute procedure public.award_points_for_verification();
-- ============================================================
-- VENDORS / RESTAURANTS
-- ============================================================
create table if not exists public.vendors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  location_text text,
  address text,
  city text,
  neighborhood text default 'Other',
  cuisine_type text,
  price_range text check (price_range in ('$', '$$', '$$$', '$$$$')),
  image_url text,
  cover_image_url text,
  discount_offer text,
  discount_code text,
  minimum_order float,
  active boolean default true,
  verified boolean default false,
  commission_rate float default 0.05,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.photos add column if not exists vendor_id uuid references public.vendors(id);
alter table public.photos add column if not exists discount_offer text;
alter table public.photos add column if not exists discount_code text;
alter table public.photos add column if not exists has_discount boolean default false;

-- ============================================================
-- DISCOUNT REDEMPTIONS (tracks when eaters use vendor discounts)
-- ============================================================
create table if not exists public.discount_redemptions (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id),
  vendor_id uuid references public.vendors(id),
  eater_id uuid references public.profiles(id),
  discount_code_used text,
  order_total float,
  discount_amount float,
  redeemed_at timestamptz default now()
);

-- Auto-create vendor on profile role change to 'restaurant'
create or replace function public.handle_restaurant_role()
returns trigger as $$
begin
  if new.role = 'restaurant' and old.role != 'restaurant' then
    insert into public.vendors (id, name)
    values (new.id, coalesce(new.full_name, 'My Restaurant'))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_restaurant_role on public.profiles;
create trigger on_profile_restaurant_role
  after update on public.profiles
  for each row execute function public.handle_restaurant_role();

-- Points for discount redemption: 10 pts each
drop trigger if exists on_discount_redeemed on public.discount_redemptions;
create or replace function public.award_discount_points()
returns trigger as $$
begin
  insert into public.user_points (user_id, points, reason, ref_id)
  values (
    new.eater_id,
    10,
    'discount_redeemed',
    new.id
  )
  on conflict (user_id) do update set
    points = user_points.points + 10;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_discount_redeemed
  after insert on public.discount_redemptions
  for each row execute function public.award_discount_points();


-- Add geolocation to vendors
alter table public.vendors add column if not exists latitude float;
alter table public.vendors add column if not exists longitude float;

-- Add geolocation to photos (for map view)
alter table public.photos add column if not exists latitude float;
alter table public.photos add column if not exists longitude float;

