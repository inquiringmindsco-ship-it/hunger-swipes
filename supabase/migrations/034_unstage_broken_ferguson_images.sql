-- Two of the 13 Ferguson staging image URLs are not loadable in production:
--   - Paul's Market pinwheel image returns 404
--   - Starbucks caramel macchiato recipe image returns 403
-- Remove their staging usage so those restaurants keep the generic photo CTA
-- while the remaining 11 Ferguson candidates stay published as staging images.

update public.place_image_candidates
  set usage_status = null,
      notes = coalesce(notes, '') || E'\n[STAGING REMOVED] Image URL was not loadable at publish time (404/403). Kept as permission_required candidate for later replacement.'
where place_id in (
  '44a215ef-6195-4e1c-8021-c94826e7cf32', -- Paul's Market
  'dc58ae1c-a5bf-4977-ab79-6296559bc626'  -- Starbucks
)
  and usage_status = 'temporary_staging';

update public.places
  set temporary_staging_place_image_url = null,
      updated_at = now()
where id in (
  '44a215ef-6195-4e1c-8021-c94826e7cf32', -- Paul's Market
  'dc58ae1c-a5bf-4977-ab79-6296559bc626'  -- Starbucks
)
  and temporary_staging_place_image_url is not null;
