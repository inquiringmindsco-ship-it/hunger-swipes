-- Hunger Swipes — Pre-create BJuiced seller profile for upcoming onboarding.
-- Owner email: bjuiced+hs@inquiringmindsco.com (user f5dafd2c-1574-4733-ba3b-9dbc58c86f1b)

insert into public.sellers (
  owner_user_id,
  slug,
  business_name,
  seller_type,
  description,
  location_text,
  address,
  phone,
  hours_text,
  pickup_available,
  delivery_available,
  ordering_method,
  ordering_url,
  website_url,
  status,
  verification_status,
  logo_url,
  hero_url
)
select
  'f5dafd2c-1574-4733-ba3b-9dbc58c86f1b'::uuid,
  'bjuiced',
  'BJuiced',
  'restaurant',
  null,
  null,
  null,
  null,
  null,
  false,
  false,
  'none',
  null,
  'https://shop.bjuicedmo.com/',
  'active',
  'approved',
  null,
  null
where not exists (select 1 from public.sellers where slug = 'bjuiced');
