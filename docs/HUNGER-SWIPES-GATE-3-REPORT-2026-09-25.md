# Hunger Swipes — Gate 3 Product Hardening Report

Date: 2026-09-25  
Branch: `codex/gate3-hardening`  
Gate 2 restore checkpoint: `288c8c6` (`chore: checkpoint approved Gate 2 visual baseline`)  
Production baseline before Gate 2: `c4382885b4b471581b3d3850576891a5c5f28018`

## Safety boundary

- No production deployment was performed.
- No DNS or `hungerswipes.com` change was performed.
- No production data was written or modified.
- No RLS policy, auth provider, secret, or production Site URL was changed.
- No database migration was created or applied. The focal-point schema is a proposal awaiting approval.
- Gate 2 composition, tokens, typography, card hierarchy, and primary action treatment were retained.

## Implemented hardening

### Gesture engine

The card now owns Pointer Events. Intent remains undecided through a 10px dead zone, becomes horizontal only when horizontal displacement meaningfully dominates vertical displacement, and remains sticky once chosen. Only X displacement is rendered. The adaptive commit threshold is clamped for small and large screens; cancelled/below-threshold gestures return to center. Starts at system-edge exclusion zones are ignored. Buttons and ArrowLeft/ArrowRight use the same commit function as dragging. Reduced-motion remains enforced by the global media query.

### Persistence state machine

```text
idle -> exiting/persisting -> success -> advance once
                         \-> failure -> restore same card -> retry/sign-in/dismiss
```

An action lock prevents duplicate logical submissions. Authenticated cards do not advance until the existing `/api/swipe` operation succeeds. Network/server failures are retryable; authentication and application rejection are identified separately. The payload remains `{ contentId, contentKind, direction }`. The database's existing atomic `record_food_swipe` function, primary key, right-save upsert, and left-save removal semantics were preserved. Match UI captures the successful dish directly, removing the old `currentIndex` race.

### Feed

- Refill begins with five cards remaining.
- Consumed `contentKind:id` keys are excluded client- and server-side.
- Authenticated prior-swipes remain excluded on the server.
- Official/community identity and existing visibility/status constraints remain intact.
- For You, Trending, and Nearby have distinct ordering/query behavior.
- End, initial failure, refill failure, retry, loading, and empty states are explicit; no demo fallback was added.
- Canonical profile preferences and temporary Discover filters are sent to the feed. Dietary/cuisine/health use existing tags; price tiers are consistently `<$12`, `$12–24`, `$24+`; spice is exact and intentionally yields no matches when content lacks spice metadata.

### Nearby

Nearby requests browser geolocation only after user selection, sends coordinates only to the first-party feed request, clamps radius to `1..100` miles, calculates Haversine distance from existing seller/place coordinates, excludes rows without coordinates, filters to radius, and sorts nearest first. Denied/unavailable states tell the user to allow access or choose For You. Production schema compatibility was verified: official sellers have coordinates but no `city/state` columns, so the query does not request nonexistent fields.

### Images

Managed dish images now use Next Image with an exact configured Supabase host/path, responsive device widths, AVIF/WebP negotiation, a quality allowlist, one-day optimizer cache minimum, a high-quality current card, one lower-quality next card, fixed fill geometry, and graceful fallback. Only current and next cards exist in the DOM; there is no hidden full-feed image queue.

Read-only production-mode measurement at a 390×844 viewport:

| Metric | Gate 1 | Gate 3 |
|---|---:|---:|
| First-card source/transfer | about 2.8–3.6 MB raw | 15,245 bytes transferred |
| Next-card source/transfer | about 2.8–3.6 MB raw | 16,162 bytes transferred |
| First + next | about 6 MB | 31,407 bytes |
| Delivered card dimensions | source approximately 4032×3024 | first 358×477; next 358×478 |
| Initial JS | Gate 1 observed about 818 KB decoded | 262,530 bytes transferred / 873,723 decoded, 15 chunks |

The two-card image payload fell by roughly 99.5% against the Gate 1 approximately 6 MB observation. The JS decoded size is slightly higher because the hardened client includes gesture/feed/auth/PWA behavior; compressed transferred JS is 262.5 KB. No obvious card layout shift was observed: both images use a fixed fill container. Slow-feed E2E confirms the branded loading state then recovery. Swipe transitions remain transform-only.

### Preferences

The canonical local key is `hungerswipes_discovery_preferences_v1` with versioned dietary, cuisine, health, spice, price, and distance fields. Reads remain compatible with `hw_prefs` and `hungerswipes_preferences`; legacy data is not deleted during read/write. Only an explicit Reset clears legacy keys. Discover consumes this model.

### Auth

Supabase email/password remains the provider. Added recovery request, callback-to-reset, new-password landing, expired-link/session messaging, safe internal-only `next` restoration, callback failure handling, and password-updated confirmation. `NEXT_PUBLIC_APP_URL` continues to drive confirmation/recovery redirects; no production Site URL changed.

### PWA, CSP, font, and accessibility

- Manifest id/start URL is `/swipe`; scope, icons, dark theme, standalone display, and safe areas remain.
- A versioned service worker provides a small shell and network-first navigation fallback. It never caches API or auth traffic. The worker has no-cache and strict worker-specific CSP headers.
- System fonts from Gate 2 remain; no Google Font request or CSP weakening was introduced.
- Card/article semantics, descriptive alt text, live action announcements, keyboard alternatives, alert/status regions, focus rings, 44px+ touch targets, and reduced motion are present.
- `/` remains intact for now. The cutover gate should decide whether it becomes a redirect to `/swipe`; the PWA no longer starts there.

## Automated verification

- `npm test`: 11/11 passed.
- `npm run test:ui`: 19/19 passed across gesture, persistence, auth route safety, preference compatibility, and Saved item/removal/empty/failure behavior.
- `npm run test:e2e`: 6/6 passed in isolated Chromium: buttons, guest redirect/no writes, threshold, horizontal/diagonal/vertical intent, one-action behavior, responsive composition, slow feed, and refill without repeats.
- `npm run lint`: TypeScript passed.
- `npm run build`: passed; 64 routes generated/validated.
- Browser E2E uses fixture interception and performs no external mutation.

## Responsive evidence

Production-mode screenshots (no development overlay):

- `screenshots/gate3/swipe-mobile-320x568.png`
- `screenshots/gate3/swipe-mobile-360x800.png`
- `screenshots/gate3/swipe-mobile-390x844.png`
- `screenshots/gate3/swipe-mobile-430x932.png`
- `screenshots/gate3/swipe-tablet-768x1024.png`
- `screenshots/gate3/swipe-desktop-1280x800.png`

Emulated Chrome passed. Physical mobile Safari and Chrome/Android were not available in this environment and remain a pre-cutover requirement.

## Preview and remaining gates

The code can be deployed only as a Vercel Preview, never Production. A complete backend-connected Preview remains contingent on the isolated Supabase resources and Preview-scoped variables in `docs/gate3/PREVIEW-ENVIRONMENT.md`. It is unsafe to point Preview at production merely to make authenticated tests work.

Known remaining items:

1. Provision isolated Preview Supabase/auth/storage/test users and run authenticated mutation E2E there.
2. Obtain approval for the focal-point proposal before creating/applying any migration or adding upload crop controls.
3. Run real-device Safari/Android testing.
4. Add `robots.txt`, `sitemap.xml`, and canonical production-domain metadata only in the final cutover gate.
5. Decide the final `/` redirect without deleting legacy routes.
6. Execute the cutover and Resend runbook only with provider-generated DNS values and explicit approval.

## Rollback

- Restore the approved Gate 2 tree exactly with checkpoint `288c8c6` in a new branch/worktree; do not rewrite the user's branch.
- Revert the eventual Gate 3 implementation commit to remove all code/test/doc changes.
- No database rollback is required because no migration ran.
- No production deployment/DNS rollback is required because neither changed.
