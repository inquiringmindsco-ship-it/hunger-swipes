# Hunger Swipes current state

Updated: 2026-10-25

## Authoritative development state

- Production source branch: `main`.
- Launch-recovery branch awaiting owner approval: `codex/launch-recovery`.
- Launch-recovery base: `5a359fd4545263b786a2fdb0467d7bdb29bfc04a`.
- Canonical Discover route: `/swipe`; `/` redirects there immediately.
- Authoritative Discover UX: `app/swipe/page.tsx` on `codex/launch-recovery`.
- Current Vercel production deployment: `dpl_8WyZ7ekyWJ1PmkZDyBR6N4F2Rivk` (2026-10-25 12:39 CDT). Vercel reports no Git metadata for this CLI deployment, so it cannot be truthfully mapped to a source commit.
- No production deployment was made during this recovery.

## Recovery status

- Direct anonymous food discovery: restored.
- Visible right-swipe countdown: restored (5, 4, 3, 2, 1, then next card).
- Mobile navigation: one persistent, safe-area-aware navigation component.
- Gesture lock, one-card advancement, feed refill, and session rediscovery: covered by automated tests.
- Swipe Bucks persistence and database uniqueness safeguards: preserved.
- Dish-candidate administration, rights gates, audit trail, publish/unpublish controls, CI, and monitoring: preserved from `main`.

## Dish truth

- Live Discover cards: 7 approved community dishes; all seven image URLs returned valid JPEG responses during recovery verification.
- Candidate rows: 179 total. The database currently records all 179 as `permission_required`; 11 have staged records but remain rights-blocked. “168 owner review + 11 blocked” is an operational queue split, not an `approved` database count.
- Do not publish any candidate without documented rights evidence. Do not treat staged records as live dishes.

## Verification

- `npm test`: 42/42 passed.
- `npm run test:ui`: 19/19 passed.
- `npm run lint`: passed.
- `npm run build`: passed (Next.js production build and TypeScript).
- Playwright with the app environment: 33/33 passed, including changing countdown numerals, next-card transition, anonymous browsing, single navigation, mobile viewports, feed refill, and rights checks.
- Admin unpublish code and regression guards passed; a live dish was not destructively unpublished during release preparation.

## Release and rollback

1. Owner reviews the exact commit on `codex/launch-recovery`.
2. Merge only after CI is green and the branch is clean.
3. Deploy from clean, synchronized `main` through the Git-connected Vercel project or `scripts/vercel-prod-guard.sh`.
4. Immediately verify `/`, `/swipe`, countdown, next-card transition, navigation, images, and `/api/dishes` on production.
5. Operational rollback target: `dpl_8WyZ7ekyWJ1PmkZDyBR6N4F2Rivk`; then run the production monitor. This target restores the current seven-card feed but does not contain the recovered visible countdown.

## Preserved work

- The dirty `/Users/sentinel/Documents/hunger-swipes` checkout and unfinished `feature/catalog-review` work were not modified or copied into this release.
- iOS/Capacitor and unrelated seller/catalog experiments remain separate from the launch recovery.
