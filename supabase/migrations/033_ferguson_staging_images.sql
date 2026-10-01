-- Ferguson staging images: display the 13 pre-selected candidate images as temporary
-- starter imagery while preserving their unresolved rights status and source metadata.

-- 1. Add a dedicated staging image column to places so staging is distinct from
--    approved owner/licensed images and approved community photos.
alter table public.places
  add column if not exists temporary_staging_place_image_url text;

-- 2. Track how a candidate is being used without changing its rights_status.
alter table public.place_image_candidates
  add column if not exists usage_status text
    check (usage_status in ('temporary_staging'));

-- 3. Mark the 13 Ferguson candidates as temporary staging and display them on
--    their corresponding places. Rights status remains permission_required.
update public.place_image_candidates
  set usage_status = 'temporary_staging',
      updated_at = now()
where rights_status = 'permission_required'
  and place_id in (
    '96cbcb9f-3e48-4904-bd35-dffe3615bbf4', -- Burger King
    'b98c0c72-5d93-4a56-9f2a-c6831f79da13', -- Church's Chicken
    '06195185-90cb-4a21-8050-a66ade32e0bf', -- Cracker Barrel
    '713e8fa0-93b1-4531-8480-86c8a72a344f', -- IHOP
    'a500973d-5025-4f80-be20-9eb8e47a326a', -- Krispy Kreme
    '40fe1bce-7c6a-4360-a087-9f436a4cc24d', -- McDonald's
    'db468225-5c8e-4cc8-b872-e36e209132dc', -- Papa John's
    '44a215ef-6195-4e1c-8021-c94826e7cf32', -- Paul's Market
    'dc58ae1c-a5bf-4977-ab79-6296559bc626', -- Starbucks
    'ced386c0-a201-4871-b942-afa1cc5ebfe9', -- Steak 'n Shake
    '0c78260c-0cf8-464a-bbe6-9ea601915153', -- Subway
    'ecb8c61d-a5b5-4d59-90ba-a1388f1c0151', -- Whistle Stop Depot
    'e22d1aba-e03c-4567-9fa2-eac75ce36cc3'  -- Wingstop
  );

-- 4. Publish each staging image to its matching place record.
update public.places
  set temporary_staging_place_image_url = c.image_url,
      updated_at = now()
from public.place_image_candidates c
where places.id = c.place_id
  and c.usage_status = 'temporary_staging'
  and places.temporary_staging_place_image_url is null;

-- 5. Add a standard admin-visible notice to each staging candidate without
--    overwriting the existing source notes. The notice stays factual and does
--    not claim fair use or any copyright rights.
update public.place_image_candidates
  set notes = coalesce(notes, '') || E'\n[STAGING NOTICE] Temporary staging image. Source retained. Reuse rights have not been independently confirmed. Replace with an owner-supplied, licensed, or approved community image when available.'
where usage_status = 'temporary_staging'
  and (notes is null or notes not like '%[STAGING NOTICE]%');
