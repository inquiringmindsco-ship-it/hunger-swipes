# IMG-DEV.md — Hunger Swipes development state
*Machine-readable state for any authorized agent (Codex / Sentinel / ACP fallback). Update at the END of every work session. NO credentials in this file — env var NAMES only.*

## State snapshot (updated 2026-10-25)
- **Current architecture:** Next.js (App Router) + Supabase (service-role server-side) + Vercel + node:test / Vitest / Playwright. Content kinds: official (sellers), community (moderated posts), and rights-gated place staging.
- **Canonical production branch:** `main`. **Release candidate:** `codex/launch-recovery`, based on `5a359fd4545263b786a2fdb0467d7bdb29bfc04a`, awaiting owner approval.
- **Authoritative UX:** `/` redirects to `/swipe`; `app/swipe/page.tsx` contains the single-card Discover deck, 5-second visible right-swipe countdown, gestures, feed refill, and session rediscovery. `app/components/MobileNav.tsx` is the sole mobile navigation implementation.
- **Production baseline:** `dpl_8WyZ7ekyWJ1PmkZDyBR6N4F2Rivk` (Oct 25 12:39 CDT). It has no Vercel Git metadata and therefore no verifiable source commit. No deployment was made by the launch-recovery work.
- **Dish state:** 7 approved community dishes live with valid images; 179 candidates remain `permission_required`. Eleven have staged records but remain blocked by the rights gate.
- **Preserved Sentinel work:** Discover supply/session recovery, Swipe Bucks safeguards, dish-candidate admin and emergency unpublish, CI, monitoring, and deployment guard.
- **Preserved separate work:** `feature/catalog-review`, iOS/Capacitor, and dirty agent worktrees were not merged into this release.
- **Verification:** 42/42 unit, 19/19 UI, 33/33 browser tests, lint, TypeScript, and production build all pass.
- **Next action:** owner reviews the exact `codex/launch-recovery` commit; merge/deploy is prohibited until explicit approval.

## Rollback procedure
1. `vercel rollback dpl_8WyZ7ekyWJ1PmkZDyBR6N4F2Rivk` from a project-linked directory (instant alias flip).
2. This operational rollback restores the current seven-card feed, but not the recovered visible countdown.
3. After rollback, run `node --env-file=.env.local scripts/monitor/prod-watch.mjs` and confirm green.

## Production-deploy policy (see GIT_POLICY.md)
Production deploys ONLY via: (a) merge of an approved, CI-green PR to main (git-connected), or (b) `scripts/vercel-prod-guard.sh vercel --prod` from a clean, synced main checkout. NEVER `vercel --prod` from a dirty tree. CLI deploys carry no commit identity and cannot be tied to review — treat as forbidden until guard passes.

## Agent handoff instructions
1. Read this file first; check `git status` for dirty state; if the tree is dirty from another agent's session, DO NOT discard — verify branch ownership in the state block above.
2. Sentinel dispatcher fallback (when Codex unavailable): OpenCode (free, ollama-backed) → GitHub Copilot CLI → Gemini CLI (key required). Auth recovery: `codex login --device-auth`; `claude` interactive sign-in; Gemini: set GEMINI_API_KEY (owner authorizes key provisioning).
3. Environment var names (values NEVER here or in logs): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET, IMG_X_LIKENESS_SSO_SECRET, FOURSQUARE_PLACES_API_KEY, (pending) GOOGLE_PLACES_API_KEY.
4. When finished: run relevant tests + build; commit to your branch; update this file's snapshot; leave the tree clean.
