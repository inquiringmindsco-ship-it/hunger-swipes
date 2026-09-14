-- A seller and its Place must be created/updated in the same transaction.
create or replace function public.sync_seller_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into places (
    name, location_text, address, latitude, longitude, source,
    claimed_seller_id, legacy_seller_id, created_by, status, created_at
  ) values (
    trim(new.business_name),
    trim(coalesce(nullif(new.location_text, ''), nullif(new.address, ''), 'Location not supplied')),
    new.address, new.latitude, new.longitude,
    case when new.owner_user_id is null then 'legacy_import' else 'seller' end,
    case when new.owner_user_id is null then null else new.id end,
    new.id, new.owner_user_id, 'active', new.created_at
  )
  on conflict (legacy_seller_id) do update set
    name = excluded.name,
    location_text = excluded.location_text,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    source = excluded.source,
    claimed_seller_id = excluded.claimed_seller_id,
    created_by = coalesce(places.created_by, excluded.created_by),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists sellers_sync_place on public.sellers;
create trigger sellers_sync_place
after insert or update of business_name, location_text, address, latitude, longitude, owner_user_id
on public.sellers
for each row execute procedure public.sync_seller_place();
