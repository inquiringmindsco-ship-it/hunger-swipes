-- Approved first-party Place imagery remains distinct from food-post imagery.
alter table public.places add column if not exists approved_owner_place_image_url text
  check (approved_owner_place_image_url is null or approved_owner_place_image_url ~ '^https://');
alter table public.places add column if not exists approved_community_place_image_url text
  check (approved_community_place_image_url is null or approved_community_place_image_url ~ '^https://');
