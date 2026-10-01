# Ferguson image rollout

## Release behavior

- The 13 active Ferguson Places keep the Hunger Swipes placeholder until an approved image exists.
- A placeholder invites the customer to take a food photo and routes directly to `/post?place=<place-id>`.
- The configured first-photo Swipe Bucks reward is issued only after moderation approval.
- The first approved community photo becomes the Place hero automatically. If that photo is removed, the next approved photo is selected or the Place returns to the rewarded placeholder.
- Confirmed-closed Place records remain preserved for history but are hidden from discovery with `status = 'hidden'` and `operational_status = 'closed'`.
- Owner/licensed imagery always takes priority over community imagery.

## Migration 032

Apply `supabase/migrations/032_ferguson_image_rollout.sql` before the production smoke test. It:

1. creates the private `place_image_candidates` rights-review queue;
2. inserts the 13 researched Ferguson menu-image candidates as `permission_required`;
3. retires Corner Coffee House and Ferguson Brewing Company, which are confirmed closed;
4. installs the database trigger that keeps approved community Place imagery synchronized.

The migration does **not** publish any restaurant-site candidate. Candidate rows have no public RLS policy.

## Rights approval

Use the admin-only `/api/admin/place-image-candidates` endpoint.

- `GET` lists candidates. An optional `status` query filters by `permission_required`, `approved`, or `rejected`.
- `POST` with `candidateId`, `action: "approve"`, and `rightsConfirmed: true` records approval and publishes the image as owner imagery.
- `POST` with `action: "reject"` rejects the candidate and removes it from the Place if it was published.

Do not send `rightsConfirmed: true` until Hunger Swipes has permission or a license covering production use.

## Production order

1. Record the current database backup and last known-good Vercel deployment.
2. Apply migration 032 to the correct Supabase project.
3. Deploy the approved application commit.
4. Search Nearby for Ferguson and verify 13 active results; the two closed records must not appear.
5. Open a placeholder and verify the photo CTA preselects that Place.
6. Submit a test photo, approve it, verify the reward ledger entry, and confirm it becomes the Place hero.
7. Remove the test post and verify the hero falls back safely.
8. Verify the candidates endpoint is unauthorized without the admin secret and that no `permission_required` image is public.

## Rollback

- Promote the recorded last known-good Vercel deployment.
- Disable the sync trigger if necessary:
  `alter table public.community_food_posts disable trigger sync_approved_community_place_image;`
- Restore the two retired rows only if the closure findings are disproven.
- Candidate data is private and can remain in place during application rollback.
