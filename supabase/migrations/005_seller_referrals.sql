-- Seller QR referral tracking: scans, signups, and successful seller conversions.

create table if not exists public.seller_referrals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  event_type text not null check (event_type in ('scan','signup','seller_created')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_seller_referrals_seller_event on public.seller_referrals(seller_id, event_type);
create index if not exists idx_seller_referrals_created on public.seller_referrals(created_at desc);

-- Only service role / server functions write here. No direct client writes.
alter table public.seller_referrals enable row level security;

drop policy if exists "referrals public read own" on public.seller_referrals;
create policy "referrals public read own"
  on public.seller_referrals for select to authenticated
  using (exists (
    select 1 from public.sellers
    where sellers.id = seller_referrals.seller_id
      and sellers.owner_user_id = auth.uid()
  ));
