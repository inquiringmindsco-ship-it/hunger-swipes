# IMG DEPLOY INCIDENT — 2026-10-25 (Production snapshot mismatch)

**Classification:** Unreviewed production deployment + regression (Discover reduced to 2 visible dishes for returning users)
**Status:** ROOT CAUSE DOCUMENTED · Fix built and previewed (`sentinel/discover-recovery`, awaiting owner release keyword)

## Verified facts
| Fact | Evidence |
|---|---|
| Current production deployment | `dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2`, created **Sun 2026-10-25 10:42:35 CDT**, target=production, aliased hungerswipes.com, www, hunger-swipes-theta (vercel inspect) |
| origin/main last changed | Oct 5, 2026 (b034238) — **the 10:42 deploy is not a main push deploy** |
| Deploy initiation | No git metadata in inspect output = CLI-upload or dashboard-redeploy signature; both are manual local actions (CLI `vercel --prod` or Vercel "Redeploy"). GitHub-Actions/git-connected deploys carry commit metadata; this one does not. |
| Deployed code fingerprint | /api/dishes signed-out response: 7 community cards, **no provider_photo flags** (refactor state fingerprint absent), **no place_staging cards** (pre-Ferguson-rollout feed path) |
| What SHOULD have served | All current tips (b034238 main, 811c652 ios, + local work) include the place-card path with **11 eligible starters** in the DB → any current tip = 18-card deck from Oct 5+ code |
| Source snapshot conclusion | Production serves a snapshot **older than every known git tip** — consistent with a redeploy of an old deployment's snapshot or a CLI deploy from a machine state unrelated to the main working tree. Exact initiating client unresolved (Vercel logs unavailable via CLI at time of audit — logged limitation). |
| User-visible impact | Discover: 7 eligible cards max; signed-in returning users see 7 − their historical food_swipes (owner saw **2**). Place-starter layer that previously served 29 swipes absent. |
| Database impact | NONE verified — staging/content tables intact (dishes 12 removed-test rows unchanged; community posts 7 approved unchanged; places 2,243 active unchanged) |

## Root cause
`Production deploys` on this project are not tied to reviewed source since at least Oct 20 (4 deploys Oct 24 + 1 Oct 25, none from main and none identifiable). Combined with permanently-hiding swipe-exclusion semantics, a reduced-content deploy silently shrank the deck.

## Prevention (implemented in this branch)
1. `scripts/vercel-prod-guard.sh` — refuses CLI production deploys from dirty trees, non-main branches, unsynced state, or red CI.
2. GitHub Actions required checks on PRs/main (`ci.yml`) — deploys flow only through green CI (Vercel git integration).
3. `GIT_POLICY.md` — production deploy rules + incident recording.
4. `IMG-DEV.md` — rollback runbook with known-good deployment ids.
5. Post-deploy monitor (`scripts/monitor/prod-watch.mjs`) — alerts within 30 min if the deck count drops below the verified baseline or key routes fail.

## Remediation
Owner-approved production release of `sentinel/discover-recovery` (returns the reviewed baseline + deck fix + rights gate; instant rollback documented).