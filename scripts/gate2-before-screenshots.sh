#!/bin/bash
set -e

URL="https://hunger-swipes-theta.vercel.app/swipe"
OUT_DIR="/Users/sentinel/Documents/hunger-swipes/screenshots/gate2-before"
mkdir -p "$OUT_DIR"

VIEWPORTS=(
  "320,568:iphone-se"
  "390,844:iphone-14"
  "430,932:iphone-14-pro-max"
)

for vp in "${VIEWPORTS[@]}"; do
  IFS=: read -r size vpname <<< "$vp"
  filename="$OUT_DIR/before-swipe-${vpname}.png"
  echo "Capturing production $URL @ $size -> before-swipe-${vpname}.png"
  npx playwright screenshot \
    --viewport-size="$size" \
    --wait-for-timeout=2500 \
    --color-scheme=dark \
    "$URL" \
    "$filename" || true
done

echo "Before screenshots saved to $OUT_DIR"
