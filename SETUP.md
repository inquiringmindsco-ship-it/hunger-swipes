# HungerSwipes Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- A Supabase account (free tier works)

---

## Manual Setup Steps

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Name it `hunger-swipes` (or your preference)
4. Set a strong database password (SAVE THIS!)
5. Select a region closest to your users
6. Wait for the project to be created (~2 minutes)

### 2. Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Find these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this secret!)

### 3. Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute
5. Wait for "Success" confirmation

### 4. Create Environment File

```bash
cd ~/Documents/hunger-swipes
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### 5. Configure Storage (for food photos)

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it: `food-photos`
4. Set it as **Public** bucket
5. Done!

### 6. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Set **Site URL**: `http://localhost:3002`
3. Set **Redirect URLs**: `http://localhost:3002/**`
4. For production, add your production domain too

---

## Schema Quirks

### Auto-Creating Profiles
The `on_auth_user_created` trigger automatically creates a profile when a user signs up via Supabase Auth. The profile uses:
- `auth.users.id` as the profile ID
- `auth.users.email` for email
- `raw_user_meta_data.full_name` for full_name
- `raw_user_meta_data.username` for username (falls back to `user_<8-char-id>`)

### Photos Start as 'pending'
New photo uploads get `status='pending'`, not `'active'`. They won't appear in the feed until:
- You manually update via Supabase dashboard, OR
- Add an admin endpoint to approve photos

### HungerScore Calculation
The `calculate_hunger_score()` function runs on every swipe via trigger:
```
hunger_score = (right_rate * 40) + (super_rate * 25) + (save_rate * 15) + (order_rate * 20)
```

### Payout Tiers
Based on `completeness_score` (0-100):
- **basic** (0-30): Creator gets 85% of commission
- **enhanced** (31-70): Creator gets 90%
- **top-tier** (71-100): Creator gets 95%

### Trigger Flow for Orders
1. Order inserted with `status='pending'`
2. Trigger `on_order_completed` fires
3. Calculates `platform_fee = commission_amount * 0.10`
4. Calculates `creator_earnings = commission_amount - platform_fee`
5. Updates photo stats (orders++, earnings_total)
6. Updates creator profile (total_earnings++, pending_earnings++)
7. Inserts earnings ledger entry
8. Sets order status to 'completed'

### Follower Count Updates
The `update_follow_counts()` trigger automatically maintains `follower_count` and `following_count` on profiles when follows are added/removed.

---

## Development

### Start Development Server
```bash
cd ~/Documents/hunger-swipes
npm run dev
```
App runs at `http://localhost:3002`

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm run test
```

---

## Troubleshooting

### "Database not configured" errors
- Check `.env.local` has correct Supabase URL and keys
- Restart dev server after changing env vars

### Photos not appearing in feed
- Verify photo `status` is `'active'` in database
- Check RLS policies allow reading

### Auth signup not creating profile
- Verify trigger `on_auth_user_created` exists
- Check trigger function `handle_new_user()` is active

### Swipe creating duplicate matches
- The trigger uses `ON CONFLICT DO NOTHING` so duplicates are handled gracefully

---

## Production Checklist

- [ ] Set all env vars in production environment
- [ ] Enable Row Level Security (RLS) - already in schema
- [ ] Configure production redirect URLs in Auth Settings
- [ ] Set up Stripe webhook endpoint for real payments
- [ ] Enable email confirmations in Auth Settings
- [ ] Set up monitoring/logging for Supabase