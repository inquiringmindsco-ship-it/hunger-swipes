# IMG-DEV.md — Hunger Swipes development state
*Machine-readable state for any authorized agent (Codex / Sentinel / ACP fallback). Update at the END of every work session. NO credentials in this file — env var NAMES only.*

## State snapshot (updated 2026-10-25)
- **Current architecture:** Next.js (App Router) + Supabase (service-role server-side) + Vercel (git deploys) + node:test / vitest / Playwright. Content kinds: official (sellers) / community (posts, moderated) / place_staging (starters, rights-gated).
- **Active development branch:** `feature/ios-capacitor` (iOS RC work, UNPUSHED commits) + `feature/catalog-review` (catalog, 4 commits local) + `sentinel/discover-recovery` (deck fix, 2 commits pushed) + `sentinel/phase1-infra` (CI/monitoring, this branch).
- **Production baseline:** hungerswipes.com ← `dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2` (Oct 25 10:42 CDT; **incident — see below**). Prior known-good: Oct 24 10:36 deploy.
- **Open tasks:** merge `sentinel/discover-recovery` + release (owner keyword); merge `sentinel/phase1-infra`; catalog review adjudication (~11,108 rows); FSQ Details enablement (owner); iOS release flow after catalog merge.
- **Known issues:** Discover deck was 2-cards for returning users (root cause: un-reviewed prod deploy + history-exhaustion semantics — both fixed on recovery branch); Ferguson 11 starters rights-blocked (permission_required, 4 wrong-jurisdiction domains — do NOT publish without documentation); GOOGLE_PLACES_API_KEY absent; FSQ Details/Photos 401 (product gate).
- **Last verified tests:** foundation 15/15 + discover-recovery 7/7 (2026-10-25 local); build exit 0.
- **Pending deployments:** `sentinel/discover-recovery` (preview verified; OWNER APPROVAL REQUIRED), then `sentinel/phase1-infra` (CI + monitoring + continuity).
- **Recent decisions:** test dishes stay removed; starters auto-return only when `rights_status='approved'`; no 250 hard-code in tests; $0-spend modernization.

## Rollback procedure
1. `vercel rollback <last-good-dpl-id>` from a project-linked directory (instant alias flip).
2. Known-good records: `dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2` = current (incident state); Oct 24 10:36 deploy = last pre-incident snapshot.
3. After rollback: run `node --env-file=.env.local scripts/monitor/prod-watch.mjs` and confirm green.

## Production-deploy policy (see GIT_POLICY.md)
Production deploys ONLY via: (a) merge of an approved, CI-green PR to main (git-connected), or (b) `scripts/vercel-prod-guard.sh vercel --prod` from a clean, synced main checkout. NEVER `vercel --prod` from a dirty tree. CLI deploys carry no commit identity and cannot be tied to review — treat as forbidden until guard passes.

## Agent handoff instructions
1. Read this file first; check `git status` for dirty state; if the tree is dirty from another agent's session, DO NOT discard — verify branch ownership in the state block above.
2. Sentinel dispatcher fallback (when Codex unavailable): OpenCode (free, ollama-backed) → GitHub Copilot CLI → Gemini CLI (key required). Auth recovery: `codex login --device-auth`; `claude` interactive sign-in; Gemini: set GEMINI_API_KEY (owner authorizes key provisioning).
3. Environment var names (values NEVER here or in logs): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET, IMG_X_LIKENESS_SSO_SECRET, FOURSQUARE_PLACES_API_KEY, (pending) GOOGLE_PLACES_API_KEY.
4. When finished: run relevant tests + build; commit to your branch; update this file's snapshot; leave the tree clean.