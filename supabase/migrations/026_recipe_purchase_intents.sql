-- Hunger Swipes — Recipe purchase intent architecture (payment not yet activated)

-- ============================================================
-- RECIPE ENTITLEMENTS: allow pending payment status
-- ============================================================
alter table public.recipe_entitlements drop constraint if exists recipe_entitlements_status_check;
alter table public.recipe_entitlements add constraint recipe_entitlements_status_check
  check (status in ('pending_payment','active','refunded','revoked'));

-- ============================================================
-- RECIPE PURCHASES (audit/intent table; records attempted purchases)
-- ============================================================
create table if not exists public.recipe_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  price_cents integer not null check (price_cents >= 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  creator_payout_cents integer not null default 0 check (creator_payout_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  payment_processor text,
  payment_intent_id text,
  failure_reason text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recipe_purchases_user_id on public.recipe_purchases(user_id);
create index if not exists idx_recipe_purchases_recipe_id on public.recipe_purchases(recipe_id);
create index if not exists idx_recipe_purchases_status on public.recipe_purchases(status);

alter table public.recipe_purchases enable row level security;
drop policy if exists "recipe purchases owner read" on public.recipe_purchases;
create policy "recipe purchases owner read" on public.recipe_purchases for select
  using (user_id = auth.uid());

drop trigger if exists recipe_purchases_updated_at on public.recipe_purchases;
create trigger recipe_purchases_updated_at before update on public.recipe_purchases
for each row execute procedure public.set_updated_at();

-- ============================================================
-- FUNCTION: settle a purchase once real payment confirmation arrives
-- ============================================================
create or replace function public.settle_recipe_purchase(purchase_id uuid, processor text, intent_id text, succeeded boolean, failure text default null)
returns public.recipe_purchases as $$
declare
  purchase public.recipe_purchases;
  existing_entitlement integer;
begin
  update public.recipe_purchases
    set status = case when succeeded then 'succeeded' else 'failed' end,
        payment_processor = coalesce(processor, payment_processor),
        payment_intent_id = coalesce(intent_id, payment_intent_id),
        failure_reason = coalesce(failure, failure_reason),
        updated_at = now()
    where id = purchase_id
    returning * into purchase;

  if not found then
    raise exception 'Purchase not found';
  end if;

  if succeeded then
    select count(*) into existing_entitlement
    from public.recipe_entitlements
    where user_id = purchase.user_id and recipe_id = purchase.recipe_id and status = 'active';

    if existing_entitlement = 0 then
      insert into public.recipe_entitlements (user_id, recipe_id, dish_id, price_paid_cents, platform_fee_cents, creator_payout_cents, status, payment_processor, payment_intent_id)
      values (purchase.user_id, purchase.recipe_id, purchase.dish_id, purchase.price_cents, purchase.platform_fee_cents, purchase.creator_payout_cents, 'active', processor, intent_id);
    end if;
  end if;

  return purchase;
end;
$$ language plpgsql security definer;
