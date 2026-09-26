# Hunger Swipes — Gate 1 Forensic Audit Reference

**Date:** 2026-09-25  
**Mode:** Design + Safe Presentational Implementation Only  
**Current commit:** `c438288` — "Let guests pass before signup"  

## Current Architecture (Source of Truth)

- Next.js app in `/app` directory (not `src/app`).
- Tailwind CSS with hardcoded colors across files.
- Google Fonts (`Poppins`, `Inter`, `JetBrains Mono`) loaded via `globals.css` `@import` — conflicts with CSP.
- Primary routes:
  - `/swipe` (Discover)
  - `/saved`
  - `/post`
  - `/join`
  - `/account`
  - `/seller/dashboard`
  - `/seller/dishes/new`
- Mobile nav: Swipe / Saved / Post / Sell / Account.
- Icons: `lucide-react` + custom `HungerIcons.tsx`.
- Auth: Supabase.
- Backend APIs: `/api/dishes`, `/api/saves`, `/api/swipe`, `/api/sellers`, etc.

## Gate 2 Safe-Edit Boundary

**ALLOWED:**
- CSS/Tailwind tokens and theme values
- Presentational components
- Layout and spacing
- Icon styling and replacements
- Color/typography harmonization
- Loading/empty/error UI
- Visual states and motion specifications
- Screenshot capture

**NOT ALLOWED:**
- Production deployment
- DNS changes
- Supabase/database/schema changes
- API/auth/route contract changes
- Persistence logic changes
- Swipe engine behavior changes
- Package/dependency changes (unless separately approved)
- Environment variable changes
- Resend/email changes

## Key Findings

1. `/swipe` is vertically scrollable, has filter clutter, oversized vertical stack, generic UI.
2. Gold is used inconsistently (success green currently drives "want" action, not gold).
3. Typography relies on Google Fonts which fail under CSP.
4. Image treatment is inconsistent; multi-megabyte images served raw.
5. Saved page is admin-list-like, not a visual saved-food collection.
6. Account page is sparse and does not group discovery/selling/account controls.
7. Seller onboarding (`/join`) and dashboard are visually separate light-theme experiences.
8. Mobile nav uses inconsistent iconography and orange active state.
9. PWA `start_url` is `/` while core product is `/swipe` — document, do not change.

## Commit Baseline

```
c438288 Let guests pass before signup
2658cc8 Simplify swipe cards and hide unknown prices
7c845fd fix(icons): install proper Hunger Swipes app icon v2 + social card
ff387f9 Expand real places across St Louis metro
88a17ba Use project-friendly Overpass endpoints
```

## Reference Only

This file documents Gate 1 findings for Gate 2 redesign. Do not alter the audit facts.
