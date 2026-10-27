# Hunger Swipes current state

Updated: 2026-10-26

## Authoritative development state

- Production source branch: `main` at merge commit `d8b062fd4daa77b5fe69fd25b1e68eb27481ce67`.
- Current production deployment: `dpl_FWF9pq5CPnuTBKWSZkprsQqx93dz`.
- Launch-completion release branch: `codex/launch-completion`.
- Canonical Discover route: `/swipe`; `/` redirects there immediately.
- Authoritative mobile UX reference: archived iOS Build 15 at `.ios-build/Hunger Swipes 1.0 Build 15.xcarchive`, created October 24, 2026 at 10:23 CDT.
- Preserved source snapshot for that app build: `a2ed9d2ba1ced90f33c9b2feb03d2874049e1a08`.

## Build 15 recovery status

- The Build 15 iOS/Capacitor foundation was integrated into current production code rather than replacing Sentinel's recovery work.
- Direct anonymous food discovery remains active.
- Right swipes restore the verified 15-second saved/want confirmation, countdown text and progress bar, pause behavior, place actions, and manual “Keep Swiping” continuation.
- Profile restores the two-column dashboard tiles for Food Profile, Preferences, Saved, Swipe Bucks, Seller Hub/List Your Food, Add a Dish/Post Food, and History.
- Post restores the complete post-type choice and restaurant/community food submission flow, including place search, address lookup, photo upload, dish details, and moderation language.
- The first-use Discover tutorial, replay control, keyboard-aware navigation, content reporting/blocking, updated seller/recipe flows, support/privacy updates, and safe-area styling are restored.
- Sentinel's dish candidate administration, rights gates, emergency unpublish, CI, monitoring, session rediscovery, deck supply, and Swipe Bucks protections remain preserved.

## Dish truth

- Last verified production state: 7 approved community dishes live with working images.
- Candidate rows: 179 total, still rights-gated. Do not publish a candidate without documented permission evidence.

## Verification

- `npm test`: 54/54 passed.
- `npm run test:ui`: 21/21 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser checks: 35/35 passed; 31 fixture-backed tests passed in the default local environment and the 4 live-catalog integration tests passed with the protected production-connected environment.

## Build 17 launch-completion candidate

- Default Nearby radius is 3 miles with explicit 1, 3, 5, 10, and 15-mile choices. The preference persists locally and in authenticated account metadata. Empty local results offer an explicit next-radius action and never expand silently.
- A Following feed reuses the existing follow graph, approved community posts, seller dishes, and blocked-user controls. Creator/profile follow and unfollow remain available without exposing saves or location history.
- MAKE does not surface the only active test recipe because its linked dish is removed. The release candidate uses an honest publish-readiness empty state instead of inventing content.
- Cards surface verified place hours when available. Directions, order, call, and website actions use existing verified fields and record lightweight outbound intent/engagement events for signed-in users.
- Retired Social and Visits entry points redirect to supported Discover and History experiences.
- Swipe Bucks earning and redemption remain disabled. The activation and liability analysis is recorded in `docs/SWIPE_BUCKS_ACTIVATION.md`.
- These bundled web changes require Build 17; processed Build 16 is not the release candidate for this branch.

## Release policy

1. Commit and push the clean `codex/build15-recovery` candidate.
2. Review its preview against the archived Build 15 reference on a mobile viewport.
3. Obtain owner approval for the exact candidate commit.
4. Merge through green CI and deploy the exact clean commit only.
5. Immediately verify production Discover, 15-second confirmation, tiled Profile, complete Post, navigation, Saved, History, images, and dish administration.
6. If a critical check fails, roll back to `dpl_BFMGBx2FwTLmnvt6d5LvPf3x2cme` while a corrected candidate is prepared.

## Owner Dish Manager access candidate

- Stacked branch: `codex/owner-dish-manager-access` (based on the verified Build 15 recovery candidate).
- `/admin/dish-candidates` now uses the same verified Supabase session and server-side `HUNGER_SWIPES_OWNER_EMAILS` allowlist as `/admin`; it no longer asks the owner for a separate secret.
- The production allowlist setting exists but was empty when verified on October 26. Before deployment, set it securely to the confirmed existing owner account; never commit that value or expose it through a `NEXT_PUBLIC_` variable.
- The mobile Dish Manager includes full-image preview, rights approval, publish, reject, emergency unpublish, and owner-uploaded image replacement. Replacement images must be in the signed-in owner's managed storage and include permission evidence.
- Every mutation still writes the existing catalog audit log. Ordinary authenticated users and sellers receive `401` and never see the owner controls.
- A visible Dish Manager link is present on `/admin`.
- Access-specific browser coverage passes at 320×568; the complete browser suite passes 35/35 with the protected Supabase environment loaded.

## Preserved work

- The dirty `/Users/sentinel/Documents/hunger-swipes` checkout remains intact; no uncommitted catalog or agent work was discarded.
- `feature/catalog-review` remains separate. Catalog experiments are not part of this corrective release.
