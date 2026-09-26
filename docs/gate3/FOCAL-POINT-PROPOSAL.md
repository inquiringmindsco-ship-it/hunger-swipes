# Gate 3 Focal-Point Proposal — Approval Required

Status: **proposal only; no database migration was created or applied**.

## One compatible model

Use the same nullable normalized coordinates on both official dishes and community posts:

- `focal_x` decimal in the inclusive range `0..1`
- `focal_y` decimal in the inclusive range `0..1`
- `null, null` means the safe existing default, `50% 50%`

The Discover image maps a valid pair to `object-position: focal_x * 100% focal_y * 100%`. A missing, partial, or invalid pair falls back to center. This avoids separate seller/community crop systems.

## Proposed migration (do not run yet)

```sql
begin;

alter table public.dishes
  add column focal_x numeric(5,4),
  add column focal_y numeric(5,4),
  add constraint dishes_focal_pair_check check (
    (focal_x is null and focal_y is null) or
    (focal_x between 0 and 1 and focal_y between 0 and 1)
  );

alter table public.community_food_posts
  add column focal_x numeric(5,4),
  add column focal_y numeric(5,4),
  add constraint community_food_posts_focal_pair_check check (
    (focal_x is null and focal_y is null) or
    (focal_x between 0 and 1 and focal_y between 0 and 1)
  );

commit;
```

Before approval, make this migration idempotent in the repository's migration sequence and validate it against a cloned Preview database. Production remains untouched.

## API and upload changes after approval

1. Accept `focal_x` and `focal_y` only as a pair on official dish create/update and community post create/update.
2. Validate finite numbers in `0..1` in the API before database writes. Keep ownership checks and managed-photo checks unchanged.
3. Include both fields in feed mapping. Do not infer coordinates from the image.
4. Add one reusable crop-position control to seller Add Dish and community Post. The user drags the image inside the exact Discover aspect/crop frame; the control stores the normalized point, not pixels.
5. Keep upload and focal-point persistence in the same successful form transaction. An upload without a chosen focal point saves `null, null`.
6. Apply `object-position` to current, next, saved, and preview images only when both fields are valid.

## Backward compatibility

- Existing rows remain null and display exactly as they do now.
- Old clients may omit both fields.
- API readers tolerate absent fields during a rolling deploy.
- No image object-position is changed globally.

## Rollback

Deploy code that stops reading/writing focal fields first, then run:

```sql
begin;
alter table public.dishes drop constraint if exists dishes_focal_pair_check;
alter table public.dishes drop column if exists focal_x, drop column if exists focal_y;
alter table public.community_food_posts drop constraint if exists community_food_posts_focal_pair_check;
alter table public.community_food_posts drop column if exists focal_x, drop column if exists focal_y;
commit;
```

No approval was assumed, so Gate 3 intentionally stops before this schema change.
