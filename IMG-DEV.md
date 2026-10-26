# IMG-DEV.md — Hunger Swipes development state
*Machine-readable state for authorized agents. Update at the end of each work session. Never store credential values here.*

## State snapshot (updated 2026-10-26)

- **Architecture:** Next.js App Router + Supabase + Vercel + Capacitor iOS + node:test / Vitest / Playwright.
- **Production:** `main` at `8348cb542f1bb480eff9fd30226804f956848929`; deployment `dpl_BFMGBx2FwTLmnvt6d5LvPf3x2cme` is the incomplete narrow-recovery UI.
- **Corrective candidate:** `codex/build15-recovery`.
- **Authoritative UX:** archived iOS Build 15 (`.ios-build/Hunger Swipes 1.0 Build 15.xcarchive`, Oct 24 10:23 CDT) and source snapshot `a2ed9d2ba1ced90f33c9b2feb03d2874049e1a08`.
- **Discover:** `/` redirects to `/swipe`; anonymous browsing; 15-second right-swipe confirmation; session rediscovery; EAT/MAKE/EXPLORE; first-use coach marks; one safe-area-aware mobile navigation.
- **Profile:** `app/account/page.tsx` uses the Build 15 two-column tile dashboard.
- **Post:** `app/post/page.tsx` contains post-type selection, place/address lookup, photo upload, details, and moderation flow.
- **Preserved Sentinel work:** seven-card live feed recovery, dish-candidate admin, rights gating, emergency unpublish, CI, monitoring, deployment guard, deck/session behavior, and Swipe Bucks safeguards.
- **Dish state:** last verified 7 live approved community dishes; 179 candidates remain permission-gated.
- **Verification:** unit 42/42, UI 20/20, swipe browser 27/27, lint, TypeScript, and production build pass.
- **Deploy status:** do not deploy until the clean corrective commit is previewed and explicitly approved.

## Rollback

If the corrective release later fails critical production checks, roll back to `dpl_BFMGBx2FwTLmnvt6d5LvPf3x2cme`, verify the seven-card feed, and keep the corrective branch intact for repair.

## Agent handoff

1. Start from `codex/build15-recovery`; do not copy from the dirty catalog checkout.
2. Use Build 15 as the visual/behavioral reference, not the 5-second recovery implementation.
3. Keep `feature/catalog-review` and unrelated catalog work out of this release.
4. Required env var names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `IMG_X_LIKENESS_SSO_SECRET`.
5. Production deploys must use an approved clean commit through established Git/CI or the guarded deployment script.
