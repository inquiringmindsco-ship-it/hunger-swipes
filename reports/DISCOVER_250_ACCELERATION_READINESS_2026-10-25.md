# DISCOVER RECOVERY & 250-DISH ACCELERATION — Production-Readiness Report
**Date:** 2026-10-25 · **Branch:** `sentinel/discover-recovery` (from production baseline b034238) · **Preview:** https://hunger-swipes-6osu602qh-inquiringmindsco-ship-its-projects.vercel.app (Vercel Authentication protected — one SSO click)
**Nothing deployed to production. No moderation changes. No publishing. No DB writes beyond read-only queries + validation CSV.**

---

## 0. NEW ROOT-CAUSE EVIDENCE — production was replaced TODAY from an unsafe working tree

Vercel record (verified via CLI):
- **Current production:** `dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2`, created **Sun Oct 25 2026 10:42:35 CDT** (18 min before the "2 dishes" report), aliased to hungerswipes.com.
- origin/main has not changed since **Oct 5** (b034238) → the 10:42 production deploy was **not a reviewed main build**; it matches a CLI deploy of the mixed working tree (uncommitted provider-photo refactor + iOS + intake streams, 118 modified files at that time). The provider-photo refactor state **removes place-starter cards from the dishes feed** — matching the exact observed drop.
- Prior production deploys: 4 on Oct 24 (10:15–10:36), one Oct 20 10:07 — all from uncommitted/branch states, none from main pushes (no CI exists — Report 5 IMG-DS finding).

**Full causation chain for "only 2 dishes":** (1) current production build dropped starter cards (unsafe 10:42 deploy) → deck = 7 community cards; (2) deployed exhaustion semantics subtract every historical food_swipe forever → your 5 swiped = 7 − 5 = **2**. Root-cause classification: **B (incorrect filtering) + deployment-process failure** — not missing records, not moderation, not frontend rendering.

## 1. Exact files changed on the recovery branch

| File | Change |
|---|---|
| `lib/food.ts` | + additive: FOOD_FAMILIES taxonomy, foodVarietyKey, diversifyFoodOrder, **buildDiscoverDeck** (pure deck builder w/ dedupe + seen/unseen ordering) |
| `app/api/dishes/route.ts` | exhaustion fix: `excluded` = client-pass only; `swipedKeys` = ordering signal (unseen first, seen cards reappear each session); replay diversifies; **starter query gated to `place_image_candidates.rights_status='approved'`**; nearby radius filter preserved |
| `tests/discover-recovery.test.ts` | NEW: 7 regression cases (full-deck for new users; returning users re-see; session exclusions; no duplicate keys; ledger double-award guards asserted against migration files; moderation passthrough; variety ordering) |
| `tests/e2e/discover-mobile.spec.ts` | NEW: Playwright 390×844 mobile spec — signed-out deck ≥7 cards, no duplicate keys, rights gate enforcement, lab gating |
| `app/preview/dishes/page.tsx` | NEW: Dish Lab 250 preview (renders **only** when `VERCEL_ENV=preview`; 404 in production; placeholders only — no third-party image use; computes remaining-to-250 live) |
| `scripts/validate-dish-candidates.mjs` | NEW: internal-only candidate validation (HEAD checks, concurrency-capped) |
| `reports/place-image-research/2026-10-25-179-validation.csv` | NEW: per-candidate validation results |

Not touched: iOS Capacitor work, catalog branch, intake stream, moderation code, migration files, Swipe Bucks logic.

## 2. Test results

- **Unit: 22/22 pass** (15 existing foundation incl. Ferguson rights-discipline tests + 7 new recovery tests).
- **Production build: exit 0** (Next.js, with env parity; env symlink removed after).
- **Playwright mobile spec:** staged; runs against the SSO-protected preview (or any served build) — see blockers.
- **Live verification (production-mode local run of the SAME build):** `/api/dishes` = **7 cards, all community, zero duplicate keys** · `/preview/dishes` = 200 with lab flag, **404 without** (production default).

## 3. Legitimate cards expected after production release (of this branch)

| Layer | Cards | Notes |
|---|---|---|
| Official dishes | 0 | 12 test artifacts remain removed (correct) |
| Community posts | **7** | approved+active, place-linked |
| Place starters | **0 (gated)** | all 11 are rights_status=permission_required; auto-return when rights documented |
| **Fresh session total** | **7** for every user — including previously swiped ones (history no longer hides; it only orders unseen-first) |

The deck additionally gains diversity ordering (no two same-family dishes back-to-back, seller streaks broken).

## 4. Can the 11 starter cards legally and safely return? — **NO, not yet (blocker)**

Verified against migrations 032/033: the Ferguson 13 were deliberately staged as a **temporary imagery pilot with rights unresolved** (`usage_status='temporary_staging'`, `rights_status='permission_required'`); 2 were already unstaged for broken URLs; 11 remain. Since then 4 more prove to be **wrong-jurisdiction or mismatched-source images**:
- IHOP from `ihopmexico.com` (Mexico regional portal)
- Papa John's from `papajohns.com.pa` (Panama regional portal)
- Subway from `subwaypanama.com` (Panama regional portal)
- Wingstop from `www.palacestation.com` (domain not verifiably the Ferguson operator page)
- Plus the set is almost entirely **national chains**, which your own Discover direction (Oct 24) excludes from the exclusive experience.

Per your conditions (Mission 2 + 179-candidate directive), they remain **unpublished**, their `permission_required` status preserved; the code path re-armss automatically the moment rights are documented (`rights_status → 'approved'`).

## 5. The 179 candidate pipeline (internal authorization applied)

- **Validation:** 179/179 places active · **162 usable** (reachable image, verified content-type, specific dish name) · 6 broken images (documented in CSV) · 11 staged/legacy · 0 generic names. All remain `permission_required`.
- **Dish Lab preview** demonstrates the composition: demo deck = **169** (162 candidates + 7 community), placeholder imagery for all third-party candidates, **remaining to 250 = 81** (excluding the 11 restaurant-only starters).
- Nothing changed in the database: statuses untouched, no inserts, no publishes.

## 6. Remaining blockers (exact)

1. **Production release approval** — deploy keyword required. Rollback plan: current production is `dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2` (instant rollback via `vercel rollback`); prior known-good = Oct 24 10:36 deploy. Recovery release target = this branch via `vercel --prod` from the recovery worktree.
   - **Note:** production is currently running un-reviewed mixed-tree code (see §0). Release of this branch ALSO removes the unreviewed soup (catalog admin routes, iOS changes, intake routes stay branch-side until properly merged).
2. **Previews are SSO-protected** — verify with one click in your browser (cards 7 / Dish Lab rendered), or provide a Vercel Protection Bypass token for CI-grade e2e.
3. **Rights documentation** for the 162 candidates (Field Ops permission outreach) unlocks candidate publishing + (separately, when approved) the 11 starters.
4. **81 additional dishes** needed beyond 169 to reach 250 (community first-photo campaign + owner menu submissions; no scraping/fabrication).
5. (Separate stream) FSQ Places Details enablement + optional Google key for provider photos on place cards.

## 7. Deployment procedure (for when you say "deploy")

```
cd /tmp/hs-disc-rec        # recovery worktree (branch sentinel/discover-recovery @ b034238+fix)
ln -s /Users/sentinel/Documents/hunger-swipes/.env.local .env.local
vercel --prod              # reviewed baseline + deck fix + rights gate
rm -f .env.local
# Rollback if needed: vercel rollback dpl_8DZkCsn5XsFK54DDmuQgV57AwAL2
```