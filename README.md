# HungerSwipes 🍔

**Swipe on food. Order it. Earn forever.**

A Tinder-style food photography marketplace where creators earn commission every time someone orders from their food photos.

---

## Quick Start

```bash
cd ~/Documents/hunger-swipes
npm install
npm run dev
```

App runs at **http://localhost:3001**

---

## What It Does

### For Eaters
- **Swipe** through food photos (Tinder-style)
- **Save matches** — foods you want to order
- **Discover nearby** vendors with discount codes
- **Track visits** and build your food reputation

### For Creators
- **Upload** food photos with your commission rate (5–20%)
- **Earn per order** — locked at order time, never changes
- **Leaderboard** — compete by HungerScore
- **Tips** — 100% goes to creator

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Mobile app shell with tab bar |
| `/swipe` | Card swiping feed |
| `/matches` | Your saved food matches |
| `/creator` | Creator dashboard |
| `/creator/upload` | Upload a food photo |
| `/creator/upgrade` | Upgrade eater → creator |
| `/leaderboard` | Top photos by HungerScore |
| `/nearby` | Vendors near you (geolocation) |
| `/vendors` | All vendors + discount codes |
| `/visits` | Visit verification + re-swipe |
| `/preferences` | Taste profile (sweet/savory/etc) |
| `/social` | Social mood feed |
| `/auth` | Signup / login |

---

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Supabase** (database + auth)
- **Stripe** (payments — configure env vars)
- **Google OAuth** (auth)

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Database Schema

Run the schema in Supabase SQL Editor:
```
supabase/schema.sql
```

Tables:
- `profiles` — users (eater/creator roles)
- `photos` — food photos with HungerScore
- `swipes` — left/right swipe records
- `matches` — mutual likes
- `orders` — purchases with locked payout
- `vendors` — restaurants with discount codes
- `visits` — TrustLevel verification
- `follows`, `comments`, `reactions`, `recipes`

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo in the Vercel dashboard.

Add env vars in Vercel project settings.

---

## Key Features

- **HungerScore** — photo ranking algorithm (freshness + engagement + recency)
- **Viral score** — photos spread faster when liked early
- **Payout locking** — creator rate locked at ORDER time (prevents gaming)
- **Re-swipe to shortlist** — swipe through your own matches to prioritize
- **TrustLevel** — self-reported / photo-confirmed / receipt-confirmed
- **Vendor discounts** — codes revealed after match, order triggers commission
