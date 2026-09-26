#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
OUT_DIR="/Users/sentinel/Documents/hunger-swipes/screenshots/gate2"
mkdir -p "$OUT_DIR"

VIEWPORTS=(
  "320,568:iphone-se"
  "390,844:iphone-14"
  "430,932:iphone-14-pro-max"
)

for vp in "${VIEWPORTS[@]}"; do
  IFS=: read -r size vpname <<< "$vp"
  filename="$OUT_DIR/discover-${vpname}.png"
  echo "Capturing $BASE_URL/swipe @ $size -> discover-${vpname}.png"
  npx playwright screenshot \
    --viewport-size="$size" \
    --wait-for-timeout=1500 \
    --color-scheme=dark \
    "$BASE_URL/swipe" \
    "$filename" || true
done

echo "Discover screenshots saved to $OUT_DIR"
