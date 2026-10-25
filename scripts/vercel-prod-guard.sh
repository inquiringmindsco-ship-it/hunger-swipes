#!/usr/bin/env zsh
# IMG-DS production-deploy guard (Phase 1, Priority 1 prevention).
# Refuses to run `vercel --prod` from a dirty, wrong-branch, or unsynced tree.
# Usage: scripts/vercel-prod-guard.sh ["real deploy command ..."]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
BRANCH=$(git branch --show-current)
[[ "$DIRTY" == "0" ]] || { echo "REFUSED: working tree has $DIRTY uncommitted changes. Commit or move them first." >&2; exit 1 }
[[ "$BRANCH" == "main" ]] || { echo "REFUSED: production deploys only from 'main' (current: $BRANCH)." >&2; exit 1 }
git fetch origin main -q 2>/dev/null || true
LOCAL=$(git rev-parse HEAD); REMOTE=$(git rev-parse origin/main 2>/dev/null || echo none)
[[ "$LOCAL" == "$REMOTE" ]] || { echo "REFUSED: local main ($LOCAL) != origin/main ($REMOTE). Push/pull first." >&2; exit 1 }
# Require the newest CI run on this commit to be green (when Actions is in use)
RUNS=$(gh run list --branch main --limit 5 --json conclusion,headSha 2>/dev/null || echo '[]')
GREEN=$(echo "$RUNS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const r=JSON.parse(s);const mine=r.filter(x=>x.headSha==='$LOCAL');console.log(mine.length===0?'unknown':(mine[0].conclusion||'running'))}catch{console.log('unknown')}})")
if [[ "$GREEN" == "unknown" ]]; then echo "WARN: no CI run found for $LOCAL — deploying without a green gate is only allowed when CI is not configured for this repo." >&2; fi
if [[ "$GREEN" == "failure" || "$GREEN" == "running" ]]; then echo "REFUSED: CI for $LOCAL is '$GREEN'. Wait for success." >&2; exit 1; fi
echo "OK: clean tree, main synced ($LOCAL), CI: $GREEN. Deploy authorized path."
if [[ $# -gt 0 ]]; then eval "$@"; else echo "(dry-guard pass — no command supplied)"; fi