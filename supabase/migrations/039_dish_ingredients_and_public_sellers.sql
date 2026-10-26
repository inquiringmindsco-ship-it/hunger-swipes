-- Structured food details for seller dishes. These describe the meal being sold;
-- full preparation instructions remain in the separate recipes product.
alter table public.dishes
  add column if not exists ingredients jsonb not null default '[]'::jsonb,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists serving_size text;

comment on column public.dishes.ingredients is 'Array of {quantity, unit, name} ingredient objects supplied by the seller.';
comment on column public.dishes.allergens is 'Seller-declared allergen labels; not a substitute for customer verification.';
