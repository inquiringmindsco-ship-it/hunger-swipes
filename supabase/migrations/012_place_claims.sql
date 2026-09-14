-- Claims are requests only; they never transfer ownership or approve a seller automatically.
create table if not exists public.place_claims (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  business_email text,
  business_phone text,
  evidence_note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_place_claims_one_pending
  on public.place_claims(place_id, claimant_user_id) where status = 'pending';
create index if not exists idx_place_claims_review on public.place_claims(status, created_at);
alter table public.place_claims enable row level security;
drop policy if exists "claimants read own claims" on public.place_claims;
create policy "claimants read own claims" on public.place_claims for select to authenticated using (claimant_user_id = auth.uid());
drop trigger if exists place_claims_updated_at on public.place_claims;
create trigger place_claims_updated_at before update on public.place_claims for each row execute procedure public.set_updated_at();
