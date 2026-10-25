# IMG GIT POLICY — production-bearing repositories (hunger-swipes, imglikeness)
*Adopted with Phase 1 (2026-10-25). Owner directive: professional development operation, $0 new tools.*

## Rules
1. **One mission = one branch.** Branch from `main` (or from the applicable feature base for stacked work). Branches are named `sentinel/<mission>`, `codex/<mission>`, or `feature/<scope>`.
2. **End-of-session commits.** No agent leaves a dirty tree (exception: the live working tree may carry another agent's uncommitted stream — preserve, never discard; verify owner of each stream in `IMG-DEV.md`).
3. **Reviewable PRs to main.** CI required checks (typecheck, unit suites, build) must be green before merge. Direct pushes to main are for owner/authorized agent only and must be CI-green commits, never dirty-tree states.
4. **Production deployments happen only from approved, clean commits:**
   - Preferred: git-connected deploy from `main` after merge (Vercel).
   - Manual CLI allowed ONLY through `scripts/vercel-prod-guard.sh vercel --prod` (refuses dirty trees, non-main branches, unsynced state, red CI).
5. **Streams never share a working tree.** iOS Capacitor work stays on `feature/ios-capacitor`; catalog on `feature/catalog-review`; recovery on dedicated branches. Emergency multi-stream state requires an `IMG-DEV.md` note + owner awareness.
6. **Database migrations:** every SQL migration gets a row in the repo `DB_MIGRATIONS.md` (number, purpose, author, date, applied target). Migrations are applied via supabase CLI only after owner approval for production.
7. **Rollbacks documented** in `IMG-DEV.md` (known-good dpl ids + commands). Drilled once per month by Sentinel (dry-run only).
8. **Incidents:** any unreviewed/unintended production change → immediate record in `reports/IMG_DEPLOY_INCIDENT_*.md` + owner notification + rollback decision.

## First incident record (2026-10-25)
Production `dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2` (10:42 CDT) serves a code snapshot OLDER than every current git tip (no provider-photo fingerprints, no place-card path despite 11 eligible starters and place-card code present in all recent tips). CLI/redeploy signature (no git metadata). Full evidence: `reports/IMG_DEPLOY_INCIDENT_2026-10-25.md`.