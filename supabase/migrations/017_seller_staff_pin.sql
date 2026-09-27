-- Hunger Swipes — Restaurant staff PIN for phone-based dish uploads
-- Reusable: every seller can have its own staff PIN; the PIN is never stored plaintext.

alter table if exists public.sellers
  add column if not exists staff_pin_hash text,
  add column if not exists staff_pin_updated_at timestamptz;

comment on column public.sellers.staff_pin_hash is 'Slow-hashed staff PIN (scrypt) for the restaurant-specific upload flow.';
comment on column public.sellers.staff_pin_updated_at is 'When the staff PIN was last changed.';

-- Helper to regenerate the PIN from the owner dashboard if needed.
create index if not exists idx_sellers_staff_pin_updated on public.sellers(staff_pin_updated_at);

-- Row Level Security: keep existing policies; staff uploads are handled server-side
-- via service role and never expose this column to the public RLS path.
