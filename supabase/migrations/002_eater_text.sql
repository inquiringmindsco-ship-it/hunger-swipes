-- V1 uses local demo eater IDs before real auth. Allow text eater IDs for swipes/saves.

-- Drop dependent policies first
drop policy if exists "swipes own" on public.swipes;
drop policy if exists "saved_dishes own" on public.saved_dishes;

-- Alter columns
alter table public.swipes alter column eater_id drop not null;
alter table public.swipes alter column eater_id type text using eater_id::text;
alter table public.swipes alter column eater_id set not null;

alter table public.saved_dishes alter column eater_id drop not null;
alter table public.saved_dishes alter column eater_id type text using eater_id::text;
alter table public.saved_dishes alter column eater_id set not null;

-- Recreate permissive policies for V1 (service role handles auth in API routes)
create policy "swipes own"
  on public.swipes for all
  using (true)
  with check (true);

create policy "saved_dishes own"
  on public.saved_dishes for all
  using (true)
  with check (true);
