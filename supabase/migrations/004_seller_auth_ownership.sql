-- Durable seller ownership and defense-in-depth RLS.

-- Reconcile the production status value that was introduced before this migration.
alter table public.sellers drop constraint if exists sellers_status_check;
alter table public.sellers
  add constraint sellers_status_check
  check (status in ('draft','pending_review','active','suspended'));

alter table public.sellers
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_sellers_owner_user_id on public.sellers(owner_user_id);

-- Existing unowned records are legacy and must never become public accidentally.
update public.sellers
set status = 'suspended',
    suspension_reason = coalesce(suspension_reason, 'Legacy record without authenticated owner')
where owner_user_id is null;

-- Public can read only live profiles. Authenticated owners can also read their own.
drop policy if exists "sellers public read active" on public.sellers;
drop policy if exists "sellers owner manage" on public.sellers;
drop policy if exists "sellers owner read" on public.sellers;
drop policy if exists "sellers owner create" on public.sellers;
drop policy if exists "sellers public or owner read" on public.sellers;
drop policy if exists "sellers owner create pending" on public.sellers;

create policy "sellers public or owner read"
  on public.sellers for select
  using (status = 'active' or owner_user_id = auth.uid());

create policy "sellers owner create pending"
  on public.sellers for insert to authenticated
  with check (
    owner_user_id = auth.uid()
    and status = 'pending_review'
    and verification_status = 'pending'
  );

-- Dish writes remain server-mediated so owners cannot bypass field/status rules.
drop policy if exists "dishes seller manage" on public.dishes;
drop policy if exists "dishes owner read" on public.dishes;
create policy "dishes owner read"
  on public.dishes for select to authenticated
  using (exists (
    select 1 from public.sellers
    where sellers.id = dishes.seller_id
      and sellers.owner_user_id = auth.uid()
  ));

-- Anonymous eater IDs are handled only by server routes. Block direct table mutation.
drop policy if exists "swipes own" on public.swipes;
drop policy if exists "saved_dishes own" on public.saved_dishes;
