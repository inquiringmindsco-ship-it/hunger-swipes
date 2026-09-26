#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
OUT_DIR="/Users/sentinel/Documents/hunger-swipes/screenshots/gate2"
mkdir -p "$OUT_DIR"

ROUTES=(
  "discover:/swipe"
  "saved:/saved"
  "post:/post"
  "join:/join"
  "account:/account"
  "seller-dashboard:/seller/dashboard"
)

VIEWPORTS=(
  "320,568:iphone-se"
  "360,800:android-default"
  "390,844:iphone-14"
  "430,932:iphone-14-pro-max"
  "768,1024:ipad-mini"
  "1280,800:desktop"
)

for route in "${ROUTES[@]}"; do
  IFS=: read -r name path <<< "$route"
  for vp in "${VIEWPORTS[@]}"; do
    IFS=: read -r size vpname <<< "$vp"
    filename="$OUT_DIR/${name}-${vpname}.png"
    echo "Capturing $path @ $size -> ${name}-${vpname}.png"
    npx playwright screenshot \
      --viewport-size="$size" \
      --wait-for-timeout=1200 \
      --color-scheme=dark \
      "$BASE_URL$path" \
      "$filename" || true
  done
done

echo "Screenshots saved to $OUT_DIR"
