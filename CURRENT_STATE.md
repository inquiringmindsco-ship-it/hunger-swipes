# Hunger Swipes current state

Updated: 2026-10-26

## Authoritative development state

- Production source branch: `main` at merge commit `8348cb542f1bb480eff9fd30226804f956848929`.
- Current production deployment: `dpl_BFMGBx2FwTLmnvt6d5LvPf3x2cme`. It contains the narrow recovery UI and is not the approved Build 15 experience.
- Corrective release branch: `codex/build15-recovery`.
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

- `npm test`: 42/42 passed.
- `npm run test:ui`: 20/20 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `tests/e2e/swipe.spec.ts`: 27/27 passed across 320×568, 360×800, 390×844, 430×932, tablet, and desktop checks.
- Local live-catalog tests require the real Supabase environment; fixture-backed interaction tests are green.

## Release policy

1. Commit and push the clean `codex/build15-recovery` candidate.
2. Review its preview against the archived Build 15 reference on a mobile viewport.
3. Obtain owner approval for the exact candidate commit.
4. Merge through green CI and deploy the exact clean commit only.
5. Immediately verify production Discover, 15-second confirmation, tiled Profile, complete Post, navigation, Saved, History, images, and dish administration.
6. If a critical check fails, roll back to `dpl_BFMGBx2FwTLmnvt6d5LvPf3x2cme` while a corrected candidate is prepared.

## Preserved work

- The dirty `/Users/sentinel/Documents/hunger-swipes` checkout remains intact; no uncommitted catalog or agent work was discarded.
- `feature/catalog-review` remains separate. Catalog experiments are not part of this corrective release.
