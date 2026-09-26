# Hunger Swipes — Monetization + Ordering Architecture Audit

**Repo:** `~/Documents/hunger-swipes` (branch `main`, commit `42cd5e7f9a574a911667bef34acc44d97fd17a66`)  
**Production:** https://hungerswipes.com  
**Date:** 2026-09-26  
**Scope:** Code + database reality only. No migrations, deploys, or production data changes were made.

---

## 1. Executive summary

Hunger Swipes is currently a **discovery + bookmarking app**, not an ordering or payments app. Users can swipe on dishes/places, save them, view a place/dish detail page, and take an external action (`Order` link, phone call, directions, website). Sellers can create a profile, add dishes, mark availability, and share a referral QR. **No money moves through the app today.** Stripe dependencies are installed, environment variables are stubbed, and all legacy checkout/order endpoints have been retired.

The required **business phone number** is already captured in onboarding and import flows, but it is **optional at the database/API level** and is currently **displayed publicly** wherever it exists. Active seller profiles are rare (2 active, 0 have a phone), while most discovery content is provider-imported Places (~990 active, ~496 with a phone).

---

## 2. Current capabilities

### What exists and works

| Capability | Evidence |
|------------|----------|
| User auth | Supabase Auth (`/auth`, `lib/auth.ts`, `lib/server-auth.ts`) |
| Swipe feed | `/swipe` → `POST /api/swipe` → `record_food_swipe()` RPC |
| Save / bookmark | `POST/DELETE /api/saves` → `saved_food` table |
| Place discovery | `/nearby` → `/api/nearby` (OSM + `places` table) |
| Place detail | `/places/[id]` → `/api/places` |
| Seller onboarding | `/join` → `POST /api/sellers` (creates `pending_review` seller) |
| Seller dashboard | `/seller/dashboard?id=...` → `/api/sellers`, `/api/sellers/:id/dishes`, `/api/sellers/:id/stats`, `/api/sellers/:id/referrals` |
| Dish management | `/seller/dishes/new`, `POST/PUT/DELETE /api/dishes` |
| Place claim flow | `/claim?place=...` → `POST /api/place-claims` |
| Admin moderation | `/admin` → `/api/admin/sellers`, `/api/admin/dishes`, `/api/admin/suspend` with `x-admin-secret` |
| Referral tracking | QR code per seller, `/api/referrals` records `scan`/`signup`/`seller_created` in `seller_referrals` |
| Photo upload | `/api/upload` → Supabase Storage bucket `dish-photos` |
| Phone / order link display | `PlaceActions.tsx` renders call + order + directions buttons |

### What does **not** exist

- In-app ordering cart/checkout
- Order state tracking
- Payment capture (Stripe is not wired)
- Payouts / Stripe Connect onboarding
- Commission calculation at transaction time
- Recipes for purchase
- Reward/points/loyalty system
- Sponsored content / paid promotions
- Verified creator badges affecting feed ranking
- Notification system for sellers or eaters

---

## 3. Current Get It architecture

The "Get It" action is a **post-save external action**, not an in-app order flow.

### User paths that surface Get It / PlaceActions

1. **Swipe match modal** — after a right swipe, a "Saved" modal shows `PlaceActions` for the matched dish.
2. **Saved page** — `/saved` lists saved dishes and each card renders `PlaceActions` (compact).
3. **Place detail** — `/places/[id]` renders `PlaceActions` for the place.
4. **Nearby results** — `/nearby` renders `PlaceActions` on each place card.

### `PlaceActions.tsx` behavior

```tsx
// File: app/components/PlaceActions.tsx
// Renders, in priority order:
// 1. Order button  -> href = place.order_url (HTTPS only, validated by safePlaceWebUrl)
// 2. Directions   -> Apple Maps / Google Maps
// 3. Call button  -> href = tel:<normalized phone> (if phone exists)
// 4. Website link -> href = place.website (HTTPS only)
```

- `order_url` is read from either `seller.ordering_url` or `place.order_url` depending on context.
- Phone normalization lives in `lib/place-actions.ts` (`normalizePhoneForTel`, `formatPhone`).
- There is **no order click analytics event wired to backend** beyond the static `dishes.order_clicks` column, which is not incremented anywhere.

---

## 4. Current database / payment capabilities

### Tables that exist

| Table | Purpose |
|-------|---------|
| `public.sellers` | Seller profile (owner, business name, phone, ordering method, status, etc.) |
| `public.dishes` | Official dishes linked to a seller |
| `public.places` | Canonical place records (provider imports + claimed sellers) |
| `public.community_food_posts` | User-generated food posts linked to a place |
| `public.saved_food` | Authenticated user saves (official or community) |
| `public.food_swipes` | Swipe events |
| `public.food_impressions` | Impression events |
| `public.seller_referrals` | QR referral funnel |
| `public.place_claims` | Ownership claim requests |
| `public.place_import_runs` | Admin import audit log |
| `public.place_google_enrichment_runs` | Google enrichment audit log |
| `public.admin_actions` | Moderation log |

### Payment-related columns that exist

- `dishes.price` — stored but not used for checkout.
- `dishes.recipe_available`, `recipe_access_type`, `recipe_price`, `recipe_preview` — recipe monetization seam, no purchase flow.
- `dishes.order_clicks` — unused counter.
- `sellers.ordering_method` enum: `'phone' | 'link' | 'in_app' | 'none'`.
- `sellers.ordering_url` — external order URL.
- `places.order_url` — external order URL.

### Payment-related tables that are **missing**

- `orders`
- `order_items`
- `payments` / `payment_intents`
- `payouts`
- `stripe_accounts` (Connect onboarding state)
- `commissions`
- `tips`
- `recipe_purchases`
- `rewards` / `points`

### Stripe status

- `package.json` includes `stripe@^22.0.0` and `@stripe/stripe-js@^9.0.1`.
- `.env.local.example` lists `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` but values are placeholders.
- The only checkout route is a stub:
  ```ts
  // app/api/checkout/route.ts
  export async function POST() {
    return NextResponse.json(
      { error: 'Paid promotions are not available until payment fulfillment and refund handling are complete.' },
      { status: 503 }
    )
  }
  ```
- Legacy order/payment/verification/profile endpoints are retired:
  ```ts
  // app/api/orders/route.ts
  export { GET, POST } from '@/lib/retired-api'
  // app/api/verification/route.ts
  export { GET, POST } from '@/lib/retired-api'
  // app/api/profile/route.ts
  export { GET, PATCH } from '@/lib/retired-api'
  ```

---

## 5. Monetization model architecture

Current intended model (from `lib/types.ts` and UI copy) is aspirational; none is enforced by code:

- **Creator roles**: `eater`, `scout`, `home_creator`, `cottage_creator`, `verified_creator`, `restaurant`.
- **Payout tiers** (`lib/metadata-scoring.ts`):
  - `basic` → 85% creator / 15% platform
  - `enhanced` → 90% creator / 10% platform
  - `top-tier` → 95% creator / 5% platform
- **Content labels**: `discovery`, `trending`, `monetized`, `verified_kitchen`.

### What is real today

- `sellers.status` controls visibility: `draft`, `pending_review`, `active`, `suspended`.
- `sellers.verification_status`: `pending`, `approved`, `rejected`.
- `dishes.status`: `draft`, `pending`, `active`, `removed`.
- `dishes.availability`: `available`, `unavailable`, `sold_out`.
- Feed ranking uses `right_swipes`, `created_at`, distance; completeness score only affects UI copy, not feed rank.

No commission, no payout, no role gating, no "monetized" label logic.

---

## 6. Hunger Swipes Pickup architecture

"Hunger Swipes Pickup" does not exist as a product yet. The primitives are:

- `sellers.pickup_available` boolean.
- `sellers.delivery_available` boolean.
- `sellers.hours_text` free text.
- `places.hours` free text.

There is no:

- Pickup time slot selector.
- Order readiness state.
- Customer-seller messaging.
- Pickup confirmation QR/code.

If built, the order flow would need to record an `order` row (customer, seller, dishes, pickup vs delivery, status), notify the seller, and surface it in `/seller/dashboard`.

---

## 7. Order state machine

There is **no order state machine** in the database or API.

The only state-like concepts are:

| Entity | State field | Values |
|--------|-------------|--------|
| `sellers` | `status` | `draft`, `pending_review`, `active`, `suspended` |
| `sellers` | `verification_status` | `pending`, `approved`, `rejected` |
| `dishes` | `status` | `draft`, `pending`, `active`, `removed` |
| `dishes` | `availability` | `available`, `unavailable`, `sold_out` |
| `places` | `status` | `active`, `hidden` |
| `places` | `claimed_status` | `unclaimed`, `claim_pending`, `claimed` |
| `places` | `operational_status` | `operational`, `temporarily_closed`, `closed`, `unknown` |
| `place_claims` | `status` | `pending`, `approved`, `rejected`, `withdrawn` |

A future order state machine would be a new table, e.g.:

```text
orders.status: pending → confirmed → ready → picked_up / delivered → completed → refunded
```

---

## 8. Payment / payout architecture

### Payment capture

- **Missing.** No `PaymentIntent`, no checkout session, no cart.
- `app/api/checkout/route.ts` returns `503`.

### Seller onboarding for payouts

- **Missing.** No Stripe Connect onboarding UI or API.
- Creator dashboard (`/creator`) has a UI mock with "Stripe" payout method option and a fake "Request Payout" button, but it is not functional and uses mock data (`MOCK_PHOTOS`, `EARNINGS_PLACEHOLDER`).

### Payout tiers

- Defined in `lib/metadata-scoring.ts` but not linked to any real transaction.

### Refunds

- **Missing.** No refund policy or API.

### Fraud / compliance

- No KYC flow.
- No tax document handling.
- No age verification for cottage food sellers.

---

## 9. Restaurant dashboard evolution

### Current seller dashboard (`/seller/dashboard`)

Data sources:
- `/api/sellers?id=...` or `/api/sellers?mine=true`
- `/api/sellers/:id/dishes`
- `/api/sellers/:id/stats`
- `/api/sellers/:id/referrals`

Features:
- Shows seller status, business info, phone/hours/location.
- Shows aggregate stats: impressions, right swipes, want rate.
- Lists dishes with availability toggle.
- Shows referral QR + scan/signup/joined counts.

### What it lacks for real restaurant operations

- Live order list.
- Order status actions (confirm / ready / hand off).
- Customer contact or messaging.
- Sales / revenue totals (all earnings are mocked).
- Hours builder (still free-text `hours_text`).
- Inventory / sold-out automation.
- Staff accounts.

---

## 10. Rewards architecture

**Does not exist.**

No tables, no API, no UI for:
- Points.
- Referral rewards to customers.
- Seller-to-eater coupons.
- Loyalty streaks.

The only reward-like mechanism is `seller_referrals`, which tracks seller-to-seller referrals (scans → signups → sellers_created), but it does not pay anything.

---

## 11. Verified food-post architecture

### Content origin model

- `content_kind` = `official` (from `dishes` table, seller-owned) or `community` (from `community_food_posts` table, user-posted).
- `dishes.content_origin` column is forced to `'official'` by check constraint.
- `community_food_posts.source` = `'community'` or `'legacy_import'`.

### Verification flow

1. Seller creates profile at `/join` → `sellers.status = 'pending_review'`.
2. Admin `/admin` page lists pending sellers.
3. Admin calls `POST /api/admin/suspend` with action `approve` → sets `status = 'active'`, `verification_status = 'approved'`.
4. Reject sets `verification_status = 'rejected'`.

### Place claim flow

1. User visits `/claim?place=<id>`.
2. Submits `business_email` and/or `business_phone` + evidence note.
3. `POST /api/place-claims` creates `place_claims` row with `status = 'pending'` and sets `places.claimed_status = 'claim_pending'`.
4. **There is no admin UI or API to review/approve claims yet.**

### RLS / safety

- `sellers` read policy: `status = 'active'` or `owner_user_id = auth.uid()`.
- `dishes` read policy: active/available dishes from active sellers.
- `community_food_posts` read policy: active posts from active places.
- Write operations are intentionally server-mediated via service-role key in API routes.

---

## 12. Affiliate / external-order architecture

### Affiliate mechanism

- Seller QR code at `/join?ref=<seller_id>`.
- `/api/referrals` records `scan`, `signup`, and `seller_created` events in `seller_referrals`.
- `seller_referrals.metadata->>'actor_id'` unique index prevents duplicate signups per seller.

### Limitations

- No affiliate commission calculation.
- No attribution on orders or revenue share.
- No cookie/localStorage persistence of `ref` beyond the `/join` URL query param.

### External order flow

- If `sellers.ordering_url` or `places.order_url` is set, `PlaceActions` renders an `Order` button that opens the external URL.
- If `ordering_method = 'phone'`, the phone call button is the primary action.
- If `ordering_method = 'none'`, no Order button appears; only directions and call.

---

## 13. Recipe monetization seam

`public.dishes` has these recipe columns:

| Column | Purpose |
|--------|---------|
| `recipe_available` | Boolean flag |
| `recipe_access_type` | Enum `'none'`, `'preview'`, `'purchase'` |
| `recipe_price` | Numeric price |
| `recipe_preview` | Text preview |

### What is missing

- Recipe content storage (ingredients, steps).
- Recipe purchase table.
- Recipe purchase API.
- UI to buy or view recipes.
- Payout logic for recipe revenue.

The `recipe_*` columns are safe to keep; they are dormant.

---

## 14. Promotion / sponsored-content rules

- `app/api/checkout/route.ts` blocks all paid promotions with `503`.
- No `promotions`, `campaigns`, `sponsored_posts`, or `ad_impressions` tables.
- No admin controls for boosting content.

Recommended rule for future:

> Paid promotions are disabled until payment capture, refund handling, and seller payout rails are operational.

---

## 15. Privacy / security considerations

### Phone number exposure

- `sellers.phone` and `places.phone` are displayed publicly via `PlaceActions` if present.
- There is no `show_phone_publicly` consent flag.
- Home cooks / sole proprietors may be exposing personal numbers.

### Recommendations

1. Add `contact_phone` (required, internal) vs `display_phone` (optional, public) to both `sellers` and `places`.
2. Require `contact_phone` before approving a seller or claiming a place.
3. Default `display_phone` to the contact phone for restaurants, but allow home sellers to opt out.
4. Normalize phone on insert/update (`lib/place-actions.ts` already has the helper).
5. Store E.164-ish format for internal use and formatted format for display.

### Authentication / authorization

- Admin endpoints use a shared `ADMIN_SECRET` header. This is acceptable for V1 but should move to role-based auth.
- `getRequestUser` validates Supabase JWT in API routes.
- No `profiles` table; app relies on `auth.users` + `sellers`.
- No service-role leak in frontend.

### Data integrity

- `sync_seller_place()` trigger keeps `places` in sync with `sellers` on insert/update of key seller fields.
- Place imports from OSM overwrite only unclaimed places.
- Active dishes require a real photo via constraint `active_dishes_require_photos`.

---

## 16. Required business phone number amendment

### Where phones are captured today

| Flow | Field | Required? | Storage |
|------|-------|-----------|---------|
| Seller onboarding (`/join`) | `form.phone` | No | `sellers.phone` |
| Place claim (`/claim`) | `business_phone` | One of email/phone required | `place_claims.business_phone` |
| OSM provider import | `phone` | If provider has it | `places.phone` |
| Google enrichment | `phone` | If Google has it | `places.phone` |
| Admin dish/seller APIs | `phone` | No | `sellers.phone` |

### Current validation / normalization

- `lib/place-actions.ts`:
  - `normalizePhoneForTel()` strips non-digits, rejects <7 or >15 digits.
  - `formatPhone()` formats 10-digit US numbers as `(314) 555-0199`.
- API routes do **not** enforce phone normalization on write.
- There is **no database-level phone format check**.

### Differences by source

| Source | Phone behavior |
|--------|----------------|
| Seller onboarding (`/join`) | Optional free-text field. Default `ordering_method` is `phone`. |
| Admin-added places (OSM/Google) | Phone imported if available. Not validated. |
| Community-added places (`/post`) | No phone captured for the place itself; posts link to existing `places`. |
| Claimed places | Claim form captures `business_phone`; not copied to `places.phone` automatically. |

### Live data snapshot (read-only)

```json
{
  "sellers": {
    "total": 12,
    "withPhone": 8,
    "active": 2,
    "activeWithPhone": 0,
    "activeWithoutPhone": 2
  },
  "places": {
    "total": 1000,
    "withPhone": 496,
    "active": 990,
    "activeWithPhone": 496,
    "claimed": 3,
    "unclaimed": 997
  }
}
```

**Key issue:** active sellers currently have no phone, which means the primary `phone` ordering method would fail.

### Public vs internal display

- Today there is only one phone field; if it exists, it is public.
- Recommended model:
  - `contact_phone` — required, internal, used for admin/claim verification and order issue escalation.
  - `display_phone` — optional, public, rendered in `PlaceActions`.
  - For home sellers, default `display_phone` to null even if `contact_phone` is collected.

### How phone supports operations

- **Onboarding verification:** Admin can call `contact_phone` to verify legitimacy before approving seller.
- **Order communication:** If in-app ordering is added, `contact_phone` is the fallback for pickup issues.
- **Customer call action:** `display_phone` drives the `tel:` link in `PlaceActions`.

---

## 17. Phased build plan

### Phase A — Phone + claim hardening (foundation)

- Add `contact_phone` (required) and `display_phone` (optional) to `sellers` and `places`.
- Normalize phone on write in `/api/sellers` and `/api/place-claims` using `lib/place-actions.ts`.
- Require `contact_phone` before admin can approve a seller or place claim.
- Backfill existing active sellers; if no phone, suspend until provided.
- Add admin API/UI to review `place_claims`.
- Update `/join`, `/claim`, and `/seller/dashboard` to collect and show the split phone fields.

### Phase B — Verified content + ranking

- Enforce `verification_status = 'approved'` before a seller's dishes appear in the feed.
- Add `verified_kitchen`/`official` badge logic based on `sellers.verification_status`.
- Wire `metadata-scoring.ts` into feed ranking (completeness score weight).
- Add report/abuse flow for places/dishes.

### Phase C — External order attribution

- Track `order_url` clicks into a new `order_attempts` table (content_kind, content_id, actor_id, referrer, created_at).
- Add affiliate attribution cookie/localStorage for `ref` seller code.
- Build seller-facing "Order clicks" metric in dashboard.
- **Still no money changes hands.**

### Phase D — In-app pickup orders (MVP)

- New tables: `orders`, `order_items`.
- `orders` columns: `id`, `customer_id`, `seller_id`, `place_id`, `status`, `total`, `platform_fee`, `seller_earnings`, `pickup_time`, `special_instructions`, `created_at`, `updated_at`.
- New routes:
  - `POST /api/orders` (create from saved dish / place)
  - `GET /api/orders` (customer list)
  - `GET /api/sellers/:id/orders` (seller list)
  - `PATCH /api/orders/:id/status` (seller updates status)
- UI pages:
  - `/order/[id]` for customer
  - Seller dashboard order list + status actions.

### Phase E — Payments + payouts

- Wire Stripe Connect Express/Standard onboarding.
- Add `stripe_connect_id` to `sellers`.
- Replace checkout stub with real Stripe PaymentIntent / Checkout Session.
- Webhook handler for `payment_intent.succeeded`, `charge.refunded`.
- Payout ledger table + seller "Available to payout" UI.

### Phase F — Recipes + rewards + promotions

- Recipe content table + purchase table.
- Customer rewards/points table.
- Seller-sponsored promotion controls (after payments are solid).

---

## 18. Tables / routes / components likely affected by each phase

### Tables

- `sellers` — add `contact_phone`, `display_phone`, `stripe_connect_id`, `payout_method`.
- `places` — add `contact_phone`, `display_phone`.
- `dishes` — keep recipe columns; add `sold_out_count`, `max_daily_orders` if needed.
- `orders` (new)
- `order_items` (new)
- `payments` (new) or Stripe as source of truth.
- `payouts` (new)
- `order_attempts` (new) for external order attribution.
- `recipes` (new) for full recipe content.
- `recipe_purchases` (new).
- `rewards` / `points` (new).
- `promotions` / `sponsored_content` (new).

### API routes

- `/api/sellers` — phone split, validation.
- `/api/place-claims` — copy approved `contact_phone` to `places`.
- `/api/admin/suspend` — require phone before approve/activate.
- `/api/orders` (new)
- `/api/checkout` — replace stub.
- `/api/webhooks/stripe` (new)
- `/api/sellers/:id/orders` (new)
- `/api/sellers/:id/payouts` (new)
- `/api/recipes` (new)

### Components / pages

- `app/components/PlaceActions.tsx` — use `display_phone`.
- `app/join/page.tsx` — add required `contact_phone`, optional `display_phone`.
- `app/claim/page.tsx` — require `business_phone`.
- `app/seller/dashboard/page.tsx` — show orders, earnings, payout method.
- `app/order/*` (new pages)
- `app/creator/*` — replace mocks with real data.
- `app/admin/page.tsx` — add claim review + phone check.

---

## 19. What NOT to build yet

Aligned with current stop conditions:

1. **Do not enable real payments** until Stripe keys are configured, Connect onboarding is built, and a refund policy exists.
2. **Do not launch in-app ordering** until sellers can reliably receive and fulfill orders (seller notifications, status actions, pickup handoff).
3. **Do not enable paid promotions / sponsored content** until payment/refund rails are live.
4. **Do not promise creator payouts** — the `/creator` page is currently mock data.
5. **Do not auto-approve place claims** — claims are still pending review with no review UI.
6. **Do not expose home-creator personal phones publicly** without an opt-in `display_phone` split.
7. **Do not build a rewards/points system** until core transaction flow is stable.
8. **Do not add recipe purchases** until payout rails exist.

---

## 20. Restaurant onboarding readiness

### Can restaurants onboard right now?

**Yes, but with limits.**

A restaurant can:
- Sign up at `/auth`.
- Create a seller profile at `/join` with business name, location, phone, hours, ordering method, and ordering URL.
- Add dishes at `/seller/dishes/new`.
- Appear in `/nearby` only if the seller is approved and active AND its synced `places` record is active.
- Share a referral QR from `/seller/dashboard`.

A restaurant **cannot**:
- Be auto-approved; admin must activate in `/admin`.
- Receive in-app orders.
- Receive payments through Hunger Swipes.
- Edit hours beyond free text.
- Manage multiple staff accounts.

### Can customers do anything?

Customers can:
- Swipe/browse dishes.
- Save dishes.
- View places and dishes.
- Click external order links or call the phone shown.
- Get directions.
- Submit a place claim.

Customers **cannot**:
- Order or pay inside the app.
- Message sellers.
- Earn rewards.
- Buy recipes.

### Can future ordering be added without re-onboarding?

**Yes.** Existing sellers already have `ordering_method`, `ordering_url`, `pickup_available`, `delivery_available`, and synced `places` records. To add in-app ordering, you only need to:
1. Add an `orders` table.
2. Build the order creation + seller status UI.
3. Later add Stripe Connect to the existing seller record (`stripe_connect_id` column).

No structural re-onboarding is required.

---

## 21. Recommended next build

**Build Phase A first: phone split + claim review.**

Why:
- It unblocks honest seller activation (currently active sellers have no phone).
- It fixes the public privacy issue for home cooks before any ordering flow launches.
- It creates the admin claim-review path that is already implied by the schema but missing in UI/API.
- It is the smallest, lowest-risk change that makes the platform legally and operationally ready for the next layer (external order attribution, then in-app orders).

Concrete first task:

> Add `contact_phone` (required) and `display_phone` (optional) to `sellers` and `places`, normalize on write, require `contact_phone` before admin approval, and build an admin claim-review action in `/admin`.

---

## Appendix: key files referenced

- `app/components/PlaceActions.tsx`
- `lib/place-actions.ts`
- `app/join/page.tsx`
- `app/claim/page.tsx`
- `app/seller/dashboard/page.tsx`
- `app/admin/page.tsx`
- `app/api/sellers/route.ts`
- `app/api/place-claims/route.ts`
- `app/api/admin/suspend/route.ts`
- `app/api/dishes/route.ts`
- `app/api/checkout/route.ts`
- `app/api/orders/route.ts`
- `app/api/referrals/route.ts`
- `lib/retired-api.ts`
- `lib/metadata-scoring.ts`
- `lib/types.ts`
- `supabase/migrations/001_field_ready.sql`
- `supabase/migrations/006_food_content_foundation.sql`
- `supabase/migrations/009_sync_seller_places.sql`
- `supabase/migrations/011_place_import_foundation.sql`
- `supabase/migrations/012_place_claims.sql`
- `supabase/migrations/013_metro_google_place_enrichment.sql`
