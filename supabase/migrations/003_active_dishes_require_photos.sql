-- Published dishes must have a seller-supplied display image.
-- Draft/pending records may remain incomplete while the seller edits them.
alter table public.dishes
  drop constraint if exists active_dishes_require_photos;

alter table public.dishes
  add constraint active_dishes_require_photos
  check (
    status <> 'active'
    or nullif(btrim(photo_url), '') is not null
  );
