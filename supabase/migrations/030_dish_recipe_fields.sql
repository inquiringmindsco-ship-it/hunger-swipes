-- Hunger Swipes — Add recipe-ready fields to dishes that are referenced by
-- the Food Intent Platform code but missing from this Supabase project.

alter table public.dishes
  add column if not exists recipe_available boolean default false,
  add column if not exists recipe_access_type text default 'none' check (recipe_access_type in ('none','preview','purchase')),
  add column if not exists recipe_price numeric default 0,
  add column if not exists recipe_preview text,
  add column if not exists recipe_id text;
