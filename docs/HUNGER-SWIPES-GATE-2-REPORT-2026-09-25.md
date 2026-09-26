# Hunger Swipes — Gate 2 Premium UX / Visual System Redesign

**Date:** 2026-09-25  
**Mode:** Design + Safe Presentational Implementation Only  
**Baseline commit:** `c438288` — "Let guests pass before signup"  
**Report location:** `/Users/sentinel/Documents/hunger-swipes/docs/HUNGER-SWIPES-GATE-2-REPORT-2026-09-25.md`  
**Screenshots:** `/Users/sentinel/Documents/hunger-swipes/screenshots/gate2/`

## Executive Summary

This gate established a reusable premium design system for Hunger Swipes and applied it, presentation-only, to the core product surfaces. No backend, API, auth, database, DNS, deployment, or package changes were made.

The visual direction is **Food First**: the dish photo dominates the screen, the interface disappears around the food, and the primary actions are a large gold heart (WANT) and large red X (PASS).

All routes, backend contracts, and data logic from Gate 1 were preserved.

---

## 1. Design System Summary

### Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--hs-black` | `#0A0A0A` | Deepest background |
| `--hs-ink` | `#0D0D0D` | Page background |
| `--hs-charcoal` | `#141414` | Cards, sheets |
| `--hs-graphite` | `#1A1A1A` | Hover/soft surfaces |
| `--hs-soft` | `#252525` | Inputs, chips |
| `--hs-muted` | `#6B6B6B` | Disabled/tertiary text |
| `--hs-gray` | `#8A8A8A` | Secondary text |
| `--hs-silver` | `#BDBDBD` | Subtle text |
| `--hs-cream` | `#FAF9F6` | Primary text |
| `--hs-gold` | `#D4AF37` | Premium accent, WANT heart, active nav |
| `--hs-gold-light` | `#E8C547` | Hover gold |
| `--hs-gold-dark` | `#B8962E` | Darker gold |
| `--hs-red` | `#E53935` | PASS / destructive / error |
| `--hs-success` | `#22C55E` | Available / success |

### Typography

Google Fonts (`Poppins`/`Inter`) were removed from `globals.css` to avoid CSP failures. The system now uses a safe system-first stack:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

Headings are bold, tight-tracking, and large; body text uses the same stack for consistency.

### Icon System

A single coherent icon family lives in `app/components/icons/HungerIcons.tsx`:

- **Discover**, **Saved**, **Post**, **Sell**, **Profile** nav icons
- **WantItIcon** — filled gold heart for YES
- **PassIcon** — red X for NO
- **Location**, **Restaurant**, **Filter**, **Camera**, **Search**, **Back**, **Close**, **Check**, **Warning**, **More**, **GetIt**

All icons are custom SVG, no emoji, no mixed packs.

### Components

New reusable UI primitives:

- `LoadingState` — branded spinner with gold accent
- `EmptyState` — centered illustration + action
- `ErrorState` — red warning icon + retry action
- `OfflineState` — offline-specific messaging
- `ImageFallback` — premium placeholder for broken/missing food photos
- `FilterSheet` — premium bottom-sheet presentation for Discover filters
- `IconButton` — accessible focus-ring + large touch target

### Motion Tokens

- `transition-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- `transition-premium`: `cubic-bezier(0.4, 0, 0.2, 1)`
- Swipe exit: 350ms, translateX ±120%, rotate ±18°
- Spring reset on cancel
- Reduced-motion media query zeroes animations

---

## 2. Discover (/swipe) Redesign

### Before
- Vertically scrollable page
- Filter clutter (cuisine/dietary/health pills + expanded panel)
- Mode tabs (For You / Nearby / Trending)
- Success-green WANT button, generic card UI
- No premium loading/empty/error states

### After
- Dedicated full-screen discovery canvas
- Single dominant dish card with large food photo
- Compact top header with brand + saved + preferences
- One discreet **Filters** pill opens premium bottom sheet
- Large gold heart (WANT) and large red X (PASS) controls
- Bottom padding clears fixed mobile nav so controls remain visible
- Subtle bottom gradient for text legibility without hiding food
- Premium loading, error, empty, and end-of-feed states

### Preserved
- All API calls (`/api/dishes`, `/api/saves`, `/api/swipe`, `/api/impressions`)
- Gesture handler and state logic (presentation only)
- Guest flow: right swipe redirects to `/auth?mode=signup&next=/swipe`
- Match modal timing and behavior

### Files changed
- `app/swipe/page.tsx`
- `app/components/ui/FilterSheet.tsx` (new)

---

## 2a. Discover Refinement Pass

A second polish pass focused only on Discover presentation. No backend/API/auth changes.

### Header simplification
- Logo increased from 28px to 34px.
- Removed gear (settings) and bookmark icons from the header.
  - Settings already reachable from `/account` → **Profile**.
  - Saved already has its own bottom-nav slot.
- Brand name and "Sign in" both use `whitespace-nowrap` + `truncate` so they never wrap, even at 320px.
- Header works at 320px width.

### Reduced generic pills
- Removed the prominent "100% want it" hunger-score badge from the primary card. Low interaction volume makes percentages misleading at small sample sizes.
- Community origin label retained but made subtle: tiny glass tag (`bg-black/35`, `text-white/80`, `backdrop-blur`) only shown for `contentKind === 'community'`.

### Card composition / image crop
- Changed `dish-image` `object-position` from `center` to `center 55%` so narrow phones favor the plated food area and de-emphasize background like the broccoli in the original screenshot.
- Next-card preview sits 2% behind the current card, adding depth without clutter.
- Locked-canvas feel: `h-[100dvh]` + `overflow-hidden` so the page never feels scrollable.

### Dish information hierarchy
Reduced location noise to a single metadata line:

```
STUFFED SALMON
Open Flame Grill
<location icon> short location cue • $$$
```

Long street addresses are reserved for place-action sheets/details.

### X / Heart action area
- Anchored action zone below the card instead of floating circles on the image.
- Red X uses Hunger Swipes red (`#E53935`) with red-10% background.
- Gold heart is larger (`72×72` on small screens, `80×80` on larger) and uses brand gold.
- Responsive sizing ensures 320×568 still shows both controls clearly above the nav.

### Removed clipped helper text
- Deleted "Swipe right to want • Swipe left to pass" text.
- First-use onboarding cue will be handled in Gate 3; no half-visible helper copy remains.

### Bottom navigation refinement
- MobileNav icons increased to 23px, labels to 10–11px.
- Minimum tap targets 56×56 dp.
- Active state uses gold icon + gold-10% rounded background.
- Fixed bottom padding reserved by main content (`pb-16`) so nav never overlaps content.
- No unintended "N" / browser overlay appears in Playwright-captured screenshots.

### 320px verification
- Brand one line.
- Sign in one line.
- Nav labels readable.
- Card actions visible.
- No clipped helper copy.

### Files changed in refinement
- `app/swipe/page.tsx`
- `app/components/MobileNav.tsx`
- `app/globals.css`

---

## 2b. Final Discover Polish

A final visual-only pass approved the overall direction and fixed the remaining Discover issues.

### X + Heart moved back inside the card
- Primary actions now live inside the card's bottom gradient zone.
- Left: red PASS X. Right: premium gold WANT heart (larger).
- Both are completely visible, vertically aligned, and sit safely above MobileNav at all captured sizes including 320×568.

### Reduced card height
- Card wrapper uses a fixed height: `h-[calc(100dvh-188px)] max-h-[720px]`.
- This reserves space for header, filter context, and nav while keeping one dish dominant.
- The card remains the single decision object: photo → info → actions.

### Neutral image crop
- Reverted the global `object-position: center 55%` hack to `object-position: center`.
- Card aspect ratio/height now handles common food photos with a safe neutral crop.
- **Gate 3 note:** Implement image focal-point/crop positioning for uploaded dish images so sellers/customers can position the visible crop or the system stores focal-point coordinates.

### Removed long street address
- Discover no longer shows `location_text` / full street address.
- Uses the shortest derivable safe metadata:
  - `seller.city` if available
  - otherwise the last comma-separated segment of `location_text` (typically city/state)
- Display format: `Dish Name / Restaurant / City • $$$`.

### Community label
- Made smaller/quieter: `text-[9px]`, `px-1.5 py-0.5`, `bg-black/30`, `text-white/75`.
- Communicates provenance only; no percentage or promotional badge.

### Filter
- Kept the small restrained icon.
- Touch target explicitly `min-w-[44px] min-h-[44px]`.

### MobileNav
- Reduced to `54px` min touch targets while staying above 44dp.
- All five destinations fit at 320px with `whitespace-nowrap` labels.
- `py-2` keeps nav compact; active Discover state remains readable.
- Main content uses `pb-16` to clear the fixed nav; no overlap, no clipping.

### Screenshot QA checklist (all verified)
- logo visible
- "Hunger Swipes" does not wrap
- "Sign in" does not wrap
- Community visible but subtle
- dish name visible
- seller/place visible
- no truncated street address
- price metadata aligned
- X completely visible
- heart completely visible
- X/heart inside card
- MobileNav completely visible
- no overlap
- no clipping
- no horizontal scrollbar
- no helper text
- no development overlay
- no content hidden behind navigation

### Files changed in final polish
- `app/swipe/page.tsx`
- `app/components/MobileNav.tsx`
- `app/globals.css`

---

## 3. Saved (/saved) Redesign

### Before
- Light gray background, admin-list feel
- White cards with small thumbnails
- Orange price/accents
- Generic empty state

### After
- Dark canvas consistent with Discover
- Large food-photo cards with rounded corners and shadow
- Dish name, seller, location, hours, price
- Gold price accent
- Get It actions (Order / Directions / Call)
- Trash removal without clutter
- Premium empty state with CTA

### Preserved
- `/api/saves` fetch and delete
- Auth redirect for unauthenticated users
- `formatOptionalFoodPrice` logic

### Files changed
- `app/saved/page.tsx`

---

## 4. Account / Profile (/account) Redesign

### Before
- Sparse dark list
- No grouping of discovery vs selling vs account controls

### After
- Profile summary with avatar + email
- Grouped sections:
  - **Discovery** — Food Preferences, Location & Distance
  - **Selling** — Seller Dashboard / List Your Food, Add a Dish
  - **Saved** — Saved Dishes
  - **Account** — Notifications (coming soon), Privacy, Sign Out
- Gold section headers
- Consistent chevron-row pattern

### Preserved
- `useAuth`, `signOut`, `/api/sellers?mine=true` check
- All existing navigation targets

### Files changed
- `app/account/page.tsx`

---

## 5. Post (/post) Redesign

### Before
- Dense form, old orange accents, admin language ("Publish community food post")
- No photo preview

### After
- Clean photographic sharing flow
- Large photo upload dropzone with preview
- Step-like sections: Photo → Dish Name → Place → Description → Price → Publish
- Gold section headers
- Premium search/location picker
- "Publish Food Post" CTA in gold

### Preserved
- All form state and validation
- Place search/create APIs
- Photo upload and community-post publish APIs
- Auth redirect

### Files changed
- `app/post/page.tsx`

---

## 6. Seller Onboarding (/join) + Dashboard (/seller/dashboard) Redesign

### /join Before
- Light theme, orange CTAs, generic multi-step form

### /join After
- Unified dark premium experience
- Step progress: Welcome → Business → Ordering
- Seller-type grid with custom icons
- Gold active states
- Gold "You're on Hunger Swipes" success state with QR code in brand colors

### /seller/dashboard Before
- Dark but visually inconsistent (orange, green success, mixed spacing)
- Admin-list dishes

### /seller/dashboard After
- Status banner in brand colors
- Business summary card
- Performance stats with gold WANT accent
- Dish list with large thumbnails and availability toggle
- Join QR with referral stats on warm-white background for scan contrast

### /seller/dishes/new
- Unified to dark system
- Gold publish CTA
- Photo preview and image-URL fallback

### Preserved
- All seller workflow contracts
- Pending review / moderation behavior
- `/api/sellers`, `/api/sellers/[id]/dishes`, `/api/sellers/[id]/stats`, `/api/sellers/[id]/referrals`
- QR generation logic

### Files changed
- `app/join/page.tsx`
- `app/seller/dashboard/page.tsx`
- `app/seller/dishes/new/page.tsx`

---

## 7. State / Error / Empty / Offline Redesign

Premium states added across all redesigned surfaces:

| State | Visual treatment |
|-------|-------------------|
| First load / fetching | Branded spinner + gold top border on loader |
| No dishes available | Centered brand icon + refresh + list-your-food CTA |
| Feed failure | Red warning icon + "Try Again" gold button |
| Empty Saved | Gold heart icon + "Start Discovering" CTA |
| Image failure | Premium `ImageFallback` with restaurant icon |
| Offline | Dedicated offline state (component ready) |
| Seller with no dishes | Utensils icon + add-first-dish CTA |
| No location | Location input shown in filter sheet |

Components: `LoadingState`, `EmptyState`, `ErrorState`, `OfflineState`, `ImageFallback`.

---

## 8. Navigation Redesign

`app/components/MobileNav.tsx` updated:

- Swipe → **Discover**
- Saved → **Saved**
- Post → **Post**
- Sell/Dashboard → **Dashboard** for sellers, **Sell** for non-sellers
- Account → **Profile**
- Active state: gold icon + gold-10% background
- Inactive state: gray icon
- Large touch targets, safe-area padding

---

## 9. Accessibility Review

- All interactive controls maintain minimum 44×44 dp touch targets
- `IconButton` includes visible gold focus ring
- Swipe actions have tap alternatives (large X / heart buttons)
- Images have descriptive `alt` text
- Color is not the sole state indicator: active nav uses background + icon color; availability toggle uses icon shape + color
- Reduced-motion media query disables animations
- Form labels remain visible
- `aria-label` preserved on icon buttons and swipe card

---

## 10. Files Changed

### Design system
- `tailwind.config.js` — new `hs.*` color tokens, font stacks, shadows, radii, easing
- `app/globals.css` — removed Google Fonts, added CSS variables, premium utilities, animations
- `public/manifest.webmanifest` — `theme_color`/`background_color` aligned to `#0A0A0A`

### Icons + components
- `app/components/icons/HungerIcons.tsx` — coherent premium icon family
- `app/components/ui/IconButton.tsx` — focus ring + accessible base
- `app/components/MobileNav.tsx` — new labels + active states
- `app/components/PlaceActions.tsx` — gold directions/order accents

### New UI primitives
- `app/components/ui/LoadingState.tsx`
- `app/components/ui/EmptyState.tsx`
- `app/components/ui/ErrorState.tsx`
- `app/components/ui/OfflineState.tsx`
- `app/components/ui/ImageFallback.tsx`
- `app/components/ui/FilterSheet.tsx`

### Pages
- `app/swipe/page.tsx`
- `app/saved/page.tsx`
- `app/account/page.tsx`
- `app/post/page.tsx`
- `app/join/page.tsx`
- `app/seller/dashboard/page.tsx`
- `app/seller/dishes/new/page.tsx`
- `app/auth/page.tsx` — styled to match system (no auth logic change)

### Reference / deliverables
- `docs/HUNGER-SWIPES-GATE-1-FORENSIC-AUDIT-2026-09-25.md`
- `docs/HUNGER-SWIPES-GATE-2-REPORT-2026-09-25.md`
- `screenshots/gate2/` — primary set (6 surfaces × 6 viewports)
- `screenshots/gate2/discover-{iphone-se,android-default,iphone-14,iphone-14-pro-max}.png` — Discover refinement set (4 viewports)
- `scripts/gate2-screenshots.sh` — reproducible primary screenshot script
- `scripts/gate2-discover-refinement-screenshots.sh` — Discover-only reproducible screenshot script

---

## 11. Tests / Build Results

```bash
npm test       # 9 tests pass
npm run lint   # tsc --noEmit — clean
npm run build  # 63 routes prerendered successfully
```

No production deployment was performed.

---

## 12. Responsive Screenshots

### Full Gate 2 primary set
Captured at:

- 320×568 (iPhone SE)
- 360×800 (Android default)
- 390×844 (iPhone 14)
- 430×932 (iPhone 14 Pro Max)
- 768×1024 (iPad Mini / tablet)
- 1280×800 (desktop)

Surfaces:

- Discover (`discover-*`)
- Saved (`saved-*`)
- Post (`post-*`)
- Join (`join-*`)
- Account (`account-*`)
- Seller Dashboard (`seller-dashboard-*`)

### Discover refinement set (this pass only)
Captured at the required narrow-to-tall phone sizes:

- `discover-iphone-se.png` — 320×568
- `discover-android-default.png` — 360×800
- `discover-iphone-14.png` — 390×844
- `discover-iphone-14-pro-max.png` — 430×932

**Note:** Saved, Post, Join, Account, and Seller Dashboard redirect unauthenticated users to `/auth`. The captured screenshots for those routes therefore show the redesigned `/auth` entry page. The actual redesigned gated surfaces were verified by code inspection and would render after authentication.

---

## 13. Gate 3 Engineering Handoff

The following items require functional implementation and are intentionally deferred to Gate 3 or a later engineering pass. No backend/API/auth/schema changes were made in Gate 2.

| Item | Current problem | Intended UX | Likely owning file(s) | Backend/API change? |
|------|-----------------|-------------|----------------------|---------------------|
| Gesture axis lock | Card visibly drags vertically during diagonal gestures | Horizontal-only drag with subtle rotation | `app/swipe/page.tsx` | No |
| Horizontal intent detection | Any drag >80px triggers swipe regardless of angle | Require dominant horizontal intent + threshold | `app/swipe/page.tsx` | No |
| Double-swipe protection | Rapid repeated taps can fire multiple swipes | Debounce / lock while animating | `app/swipe/page.tsx` | No |
| Persistence error/retry | Failed swipe/record silently logs to console | Retry with exponential backoff + surface failure state | `app/swipe/page.tsx`, `lib/auth-fetch.ts` | Possible |
| Match modal race | Modal auto-dismisses via timeout regardless of user action | Dismiss on next tap or after delay, whichever first | `app/swipe/page.tsx` | No |
| Feed refill / pagination | Reaching end of 20-dish feed shows empty state | Auto-fetch next page or show explicit refresh | `app/swipe/page.tsx`, `/api/dishes` | Possible |
| Image compression/optimization | Multi-megabyte originals served raw | Server-side or client-side resize + WebP | `app/api/upload`, `app/swipe/page.tsx` | Yes |
| Image prefetch strategy | Next card image may not load until visible | Prefetch next 2–3 images | `app/swipe/page.tsx` | No |
| Nearby distance behavior | "Nearby" mode exists but distance radius UX is unclear | Show distance badge, radius selector, sort by distance | `app/swipe/page.tsx`, `/api/nearby` | Yes |
| Preference integration | Filters are presentational in Gate 2; preferences live in `/preferences` | Wire filter sheet to real saved preferences | `app/swipe/page.tsx`, `/api/profile`, `/preferences` | Yes |
| CSP / font fix | Google Fonts blocked by CSP; removed in Gate 2 | Decide on self-hosted font or keep system fonts | `next.config.js`, `app/globals.css` | No |
| Broken-image recovery | ImageFallback shown but no retry | Retry failed image once, then fallback | `app/components/ui/ImageFallback.tsx` | No |
| Offline handling | No online/offline listener | Cache feed + show offline state, queue swipes | `app/swipe/page.tsx`, service worker | Yes |
| Password recovery | No visible recovery flow | Add "Forgot password" link + Supabase reset | `app/auth/page.tsx`, `/api/auth` | Yes |
| PWA entry route | `start_url` is `/` while core product is `/swipe` | Change `start_url` to `/swipe` after product decision | `public/manifest.webmanifest` | No |
| Domain/canonical changes | Production URL still `hunger-swipes-theta.vercel.app` | Move to custom domain when ready | `next.config.js`, `vercel.json`, DNS | Yes |
| Resend setup | Auth confirmation emails rely on Supabase default | Configure Resend + branded templates | Supabase / Resend config | Yes |
| Preview environment | No staging/preview branch workflow | Add Vercel preview + smoke tests | CI/CD | Yes |
| Test automation | Only foundation tests exist | Add visual regression + swipe E2E tests | `tests/` | Yes |

---

## 14. Known Items Intentionally Not Changed

- **Route contracts** — all route names and API paths preserved.
- **Swipe engine logic** — gesture math, thresholds, and state transitions unchanged; only visual surface redesigned.
- **Backend / database / Supabase** — no schema or data changes.
- **Auth mechanism** — `/auth` login/signup logic unchanged; only UI styled.
- **CSP headers** — not modified. Fonts now use system stack to avoid CSP conflict.
- **Environment variables** — unchanged.
- **Package dependencies** — no new dependencies added.
- **Production deployment** — not performed. Build only.
- **Legacy routes** (`/creator`, `/onboarding`, `/vendor*`, `/social`) — not redesigned; listed as technical debt.
- **PWA `start_url`** — kept at `/` per Gate 2 boundary; documented as Gate 3 item.
- **Image optimization pipeline** — not built; designed for it (ImageFallback component,预留 CSS utilities).

---

## 15. STOP — WAITING FOR APPROVAL

No deploy. No DB write. No DNS change. No env change. No package change.

Gate 2 is complete pending Od's review and approval to proceed to Gate 3.
