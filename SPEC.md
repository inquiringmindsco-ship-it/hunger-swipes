# HungerSwipes — SPEC.md

## The Concept

**HungerSwipes** is Tinder for food photography — but with a real economic engine underneath. Users swipe left/right on stunning food photos. When you take a photo so good that someone orders from it, you earn a commission. It's part game, part creator economy, part storefront.

---

## The Big Idea

Food photography is broken. Restaurants pay influencers hundreds or thousands for one post that disappears in 24 hours. Meanwhile, amazing home food photographers have no way to monetize their eye.

HungerSwipes fixes this:
- **Photographers** earn commission every time their photo drives an order (forever)
- **Restaurants** get a stream of high-converting food photography, paying only per result
- **Eaters** get a delightfully addictive way to discover what to eat next

---

## The Flow

### For Eaters (Swipers)
1. **Onboarding** — Pick your food preferences (cuisine types, dietary restrictions, budget range)
2. **Swipe Deck** — Browse a vertical feed of gorgeous food photos, 2 at a time
   - Swipe right = "I want to eat this" → see restaurant, price, order link
   - Swipe left = pass
   - Tap photo = expand to full view with details
3. **Match Screen** — "Matches" are foods you swiped right on and is available near you
4. **Order** — Tap through to restaurant (direct link or in-app ordering)
5. **History** — Reorder from your matches anytime

### For Creators (Food Photographers)
1. **Onboarding** — Create account, link your Instagram (optional), set your location
2. **Upload** — Submit food photos with:
   - Restaurant name / location
   - Dish name
   - Your commission rate (default 10%, adjustable 5–20%)
3. **HungerScore™** — Each photo gets a HungerScore (0–100) based on:
   - Conversion rate (how many swipers ordered from it)
   - Engagement (save rate, time viewed)
   - Recency (fresh content scores higher)
4. **Earn** — Commission dashboard shows earnings per photo, per month, lifetime
5. **Leaderboard** — Monthly top photographers get bonus visibility

### For Restaurants / Vendors
1. **Claim Profile** — Claim your restaurant, see which photos are driving orders
2. **Request Photos** — Post "Wanted" requests for specific dishes
3. **Promote** — Boost top-performing photos to more swipers in a region

---

## Core Features

### Swipe Engine
- Two photos side by side (or vertical stack)
- Swipe right = "YES", left = "NO"
- Swipe up = "Super Hunger" (strongest signal, shows to more people)
- Double-tap = save to favorites (no order signal)
- Pull-to-refresh = new batch

### Photo Cards
- Full-bleed food photo (the star)
- Restaurant name + location
- Dish name
- Price range indicator ($, $$, $$$)
- Distance (if location enabled)
- Photographer credit (with commission % badge)
- "Order" button (appears after right-swipe)

### HungerScore™ (Photo Ranking)
- Each photo accumulates signals:
  - Right swipe rate (conversion %)
  - "Super Hunger" (upvote) rate
  - Save/bookmark rate
  - Time spent viewing
  - Order-through rate
- Score updates in real-time
- New photos get a "Fresh" boost for first 48 hours
- Top 10% photos get "Viral" badge

### Commission System
- Photographer sets their commission rate (5–20%)
- When a swiper orders from a photo:
  - Restaurant pays: dish price + commission %
  - Photographer earns: commission % of order
  - Platform earns: 10% of commission
- Commission is baked into the order price (eater pays same price, restaurant slightly less margin, photographer wins)
- Or: restaurant pays extra, eater pays same
- Minimum payout: $10
- Monthly payouts via Stripe

### Discovery Modes
- **For You** — Personalized based on swipe history
- **Nearby** — Food available near your location
- **Rising** — High-converting new photos
- **Cuisines** — Browse by category (Pizza, Sushi, Tacos, etc.)

---

## Design Language

### Name & Brand
- **Name**: HungerSwipes
- **Tagline**: "Swipe. Eat. Earn."
- **Personality**: Fun, appetizing, slightly cheeky

### Colors
- **Primary**: `#FF5722` (Deep Orange — hunger, appetite, energy)
- **Secondary**: `#1A1A2E` (Dark Navy — sophistication, contrast)
- **Accent**: `#FFD700` (Gold — earnings, premium, "Super Hunger")
- **Background**: `#F7F7F7` (Warm off-white)
- **Card BG**: `#FFFFFF`
- **Text Primary**: `#1A1A2E`
- **Text Secondary**: `#6B7280`
- **Success**: `#10B981`
- **Error**: `#EF4444`

### Typography
- **Headlines**: Poppins (Bold, 700)
- **Body**: Inter (Regular 400, Medium 500)
- **Monospace (numbers)**: JetBrains Mono (for earnings, scores)

### Motion
- Swipe cards: spring physics (tension 180, friction 12)
- Match animation: confetti burst + scale bounce
- Score counters: count-up animation
- Earnings: ripple pulse on increment

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing — Hero, how it works, CTA |
| `/download` | App store links (placeholder for now) |
| `/auth` | Login / Signup (email or social) |
| `/swipe` | Main swipe feed |
| `/matches` | Foods you've swiped right on |
| `/order/[id]` | Order page (restaurant + dish) |
| `/creator` | Creator dashboard |
| `/creator/upload` | Upload a food photo |
| `/creator/photo/[id]` | Photo performance stats |
| `/restaurant/[id]` | Restaurant page with their photos |
| `/leaderboard` | Top photographers |
| `/profile` | User profile + settings |
| `/preferences` | Food preferences setup |

---

## Technical Architecture

### Stack
- **Framework**: Next.js (App Router)
- **Database**: Supabase (users, photos, orders, commissions)
- **Auth**: Supabase Auth (email + Google)
- **Storage**: Supabase Storage (food photos)
- **Payments**: Stripe Connect (photographer payouts)
- **Geolocation**: Browser GPS + restaurant location data
- **Deployment**: Vercel

### Database Schema

```sql
-- Users (extends Supabase auth.users)
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT, -- 'eater' | 'creator' | 'restaurant'
  preferences JSONB,
  created_at TIMESTAMPTZ
)

-- Food Photos
photos (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES profiles,
  image_url TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_location TEXT,
  restaurant_lat FLOAT,
  restaurant_lng FLOAT,
  dish_name TEXT NOT NULL,
  cuisine_type TEXT,
  price_range TEXT, -- '$' | '$$' | '$$$' | '$$$$'
  commission_rate FLOAT DEFAULT 0.10,
  hunger_score FLOAT DEFAULT 0,
  swipes_total INT DEFAULT 0,
  swipes_right INT DEFAULT 0,
  super_hungers INT DEFAULT 0,
  saves INT DEFAULT 0,
  orders INT DEFAULT 0,
  earnings_total FLOAT DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active' | 'removed'
  created_at TIMESTAMPTZ
)

-- Swipes (anonymous interaction log)
swipes (
  id UUID PRIMARY KEY,
  eater_id UUID REFERENCES profiles,
  photo_id UUID REFERENCES photos,
  direction TEXT, -- 'right' | 'left' | 'up'
  created_at TIMESTAMPTZ
)

-- Orders (when someone orders from a photo)
orders (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES photos,
  eater_id UUID REFERENCES profiles,
  restaurant_id UUID,
  amount FLOAT,
  commission_earned FLOAT,
  platform_fee FLOAT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ
)

-- Creator Earnings Ledger
earnings (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES profiles,
  photo_id UUID REFERENCES photos,
  order_id UUID REFERENCES orders,
  amount FLOAT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'paid'
  paid_at TIMESTAMPTZ
)
```

---

## Monetization

### Platform Revenue
- **10% of photographer commission** on every order
  - Photo at 10% commission: photographer gets $1.00, platform gets $0.10, restaurant pays $1.10
- **Restaurant premium listings** (optional boosted placement)
- **Affiliate links** (when direct ordering not available)

### Creator Revenue
- Commission per order driven (set by creator, 5–20%)
- Monthly leaderboard bonuses (platform-funded)
- Tips (future)

### Restaurant Cost
- Normal food cost + commission %
- No upfront fee, no monthly fee — pay only per result

---

## Competitive Edge

| Feature | HungerSwipes | Instagram | Tinder | Yelp |
|----------|-------------|-----------|--------|------|
| Food-focused swiping | ✅ | ❌ | ❌ | ❌ |
| Commission for photographers | ✅ | ❌ | ❌ | ❌ |
| Built-in ordering | ✅ | ❌ | ❌ | ❌ |
| HungerScore™ ranking | ✅ | ❌ | ❌ | ❌ |
| Real money for creators | ✅ | ❌ | ❌ | ❌ |
| Discovery by swiping | ✅ | ❌ | ✅ | ❌ |

---

## MVP Scope (This Build)

### What's Built
1. Landing page with concept + how it works
2. Swipe interface (fake data for MVP)
3. Creator signup / dashboard
4. Photo upload flow (mock)
5. Commission dashboard (mock)
6. Matches page (food you've saved)
7. Restaurant page

### What's Simulated
- Real swipe algorithm (use mock data for now)
- Real ordering (link out to restaurant)
- Real payments (Stripe integration pending)
- Real photo uploads (use placeholder URLs)
- Geolocation (use static location for MVP)

### Next Phase
- Supabase integration (real DB + auth)
- Stripe Connect for payouts
- Real photo upload with S3/Supabase Storage
- Push notifications for matches
- Instagram import for photographers

---

## Verified Visit + Accuracy Rewards System (v1.2)

### The Concept
A proof layer that rewards users for confirming they actually visited a restaurant and whether the food matched the post. Creates visual trust + user-generated content.

### Core Actions
1. **Visit confirmation** — Mark that you went to a restaurant
2. **Accuracy rating** — Report if the food was accurate/misleading
3. **"I ordered this too"** — Upload your own comparison photo
4. **Receipt/proof** — Optional stronger verification

### Points System
| Action | Points |
|--------|--------|
| Check in | 5 |
| Accuracy response | 5 |
| Comparison photo | 15 |
| Receipt/order proof | 20 |
| First visit bonus | 10 |
| 3-verification streak | 5 |
| 10-verification streak | 20 |

### Trust Levels
- **Level 1 (Self-reported):** "I went there" — 5 points
- **Level 2 (Photo-confirmed):** Uploaded comparison photo — 15 points
- **Level 3 (Receipt-confirmed):** Receipt or order confirmation — 20 points

### Tier Progression
- **newbie:** 0–49 lifetime points
- **foodie:** 50–199 lifetime points
- **critic:** 200–499 lifetime points
- **expert:** 500–999 lifetime points
- **legend:** 1000+ lifetime points

### User Points Tiers + Perks
| Tier | Points Needed | Perks |
|------|---------------|-------|
| newbie | 0 | Basic access |
| foodie | 50 | Early features, badge |
| critic | 200 | Priority support, featured |
| expert | 500 | Exclusive streaks, boosts |
| legend | 1000 | Top placement, founder badge |

### New Database Tables
- `visit_verifications` — Tracks individual verifications
- `user_points` — Per-user points balance + tier
- `points_config` — Configurable points per action

### New API Routes
- `POST /api/visits` — Submit verification
- `GET /api/visits` — Get verifications for photo or user
- `GET /api/visits/points` — Get user's points + tier

### UI Flow
After viewing a match:
1. Prompt: "Did you go?"
2. If yes: "Was it accurate?" → accuracy rating
3. "Order the same thing?" → comparison photo upload
4. Points awarded → trust level shown
5. Comparison photos shown on photo card (social proof)

### Verification Display on Photos
Verified visits shown as badges on photo cards:
- 🏠 Level 1 verified (green)
- 📸 Level 2 verified (blue)  
- 🧾 Level 3 verified (gold)

Accuracy breakdown:
- "98% accurate" from 12 verified visits
- Comparison photo gallery
