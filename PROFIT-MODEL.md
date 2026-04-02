# HungerSwipes — Profit & Scalability Model
**April 2026**

---

## Profit Model — How Money Flows

### The Math — Every Order

```
Example order: $25 (avg food order)

EATER PAYS:                              $25.00
  ├── Stripe processing (2.9% + $0.30):   -$1.03
  └── Net platform receives:              $23.97

PLATFORM SPLITS $23.97:
  ├── Vendor (67%):                      $16.06  ← restaurant gets
  ├── Creator (15% avg):                 $3.60   ← photographer earns
  └── Platform (18%):                    $4.31   ← our revenue

PLATFORM KEEPS $4.31:
  ├── Platform ops (hosting, tools):      -$0.43  ← 10% of $4.31
  ├── Payment processing residual:        +$0.20  ← Stripe revenue share
  └── NET PLATFORM MARGIN:               ~$3.08  (~12% of gross)
```

**Platform margin per $25 order: ~$3.08**

---

## Revenue Per Transaction Tiers

| Creator Tier | Max Commission | Platform Share | Per $25 Order |
|-------------|--------------|---------------|--------------|
| Free | 5% | 15% | $1.25 creator / $0.19 platform |
| Pro ($9.99/mo) | 15% | 10% | $3.75 creator / $0.43 platform |
| Elite ($29.99/mo) | 20% | 5% | $5.00 creator / $0.21 platform |

**Insight:** Elite tier is worst for platform per-order. Compensated by subscription revenue.

---

## Breakeven Analysis

### Monthly Fixed Costs (Year 1, lean team)

| Item | Monthly | Annual |
|------|---------|--------|
| Hosting (Vercel Pro) | $100 | $1,200 |
| Supabase (Pro plan) | $75 | $900 |
| Stripe processing (2.9%) | Pass-through | Pass-through |
| Domain (hungerswipes.com) | $20 | $240 |
| Email (Resend/Gmail SMTP) | $20 | $240 |
| Misc tools (analytics, etc) | $50 | $600 |
| Founder stipend (O D) | $2,000 | $24,000 |
| **Total** | **~$2,265/mo** | **~$27,180/yr** |

### Breakeven GMV
- Platform keeps ~12% of GMV (after Stripe fees)
- To cover $2,265/month: **$18,875 GMV/month** needed
- At $25 avg order = **755 orders/month** = 25 orders/day

**First-year goal: $10K GMV/month by Month 3. That's 67x above breakeven.**

---

## Scalability — 10x, 100x, 1000x

### Current Architecture (Supports ~10K users)

**Stack:**
- Next.js 14 (frontend) → Vercel (CDN edge)
- Supabase (Postgres + Auth + Storage)
- Stripe Connect (payments)
- LocalStorage for demo / Postgres for production

**Bottlenecks at scale:**
1. Supabase free tier limits (500MB DB, 1GB storage)
2. No CDN for food images (served from Supabase Storage)
3. Single-region Postgres (Supabase = us-east-1)
4. No caching layer (every swipe = DB read)

### Scalability Roadmap

#### Level 1 — 10K to 100K users
| Change | Cost | Impact |
|--------|------|--------|
| Supabase Pro ($75/mo) | +$75 | 8GB DB, 100GB storage |
| Vercel Pro ($100/mo) | +$80 | 100GB bandwidth |
| Add Cloudflare CDN | Free | Global edge caching for images |
| Redis cache (Upstash) | +$10/mo | Cache hot feeds, reduce DB reads |
| **Total added:** | **~$165/mo** | Handles 100K users |

#### Level 2 — 100K to 1M users
| Change | Cost | Impact |
|--------|------|--------|
| Supabase Team ($599/mo) | +$524 | Unlimited DB, 10TB storage |
| Vercel Enterprise (negotiate) | ~$200/mo | Unlimited bandwidth, edge functions |
| AWS S3 for images (Supabase moves to) | +$100/mo | 10TB storage + CloudFront |
| Upstash Redis (pay-as-you-go) | +$200/mo | 100M ops/day |
| Background jobs (Inngest/Convex) | +$25/mo | Async order processing, notifications |
| **Total added:** | **~$1,000/mo** | Handles 1M users |

#### Level 3 — 1M to 10M users (Year 3+)
- Migrate to custom Postgres (Neon serverless) — cheaper than Supabase at scale
- Add read replicas for each city/region
- Separate microservices: feed service, payment service, notification service
- Real-time (Ably/Pusher) for swipe matches and order updates
- ML recommendation engine (open source: Qdrant/Pinecone vector search)
- **Estimated infra: $5K-$15K/month** (offset by $500K+/month GMV)

---

## Creator Earning Potential (Why They Stay)

| Creator Type | Followers | Photos/Month | Orders/Photo | Monthly Earnings |
|-------------|-----------|-------------|-------------|-----------------|
| Casual | 100 | 5 | 2 | $1.50 |
| Active | 1,000 | 15 | 5 | $11.25 |
| Micro-Influencer | 10,000 | 20 | 15 | $45.00 |
| Food Blogger | 50,000 | 30 | 40 | $360.00 |
| Pro Creator | 200,000 | 50 | 100 | $2,500.00 |

**Key insight:** Creators earn more when they have photos from MULTIPLE vendors. The more vendors they photograph, the more diverse their earning stream.

---

## Vendor ROI (Why They Pay)

| Vendor Size | Monthly Orders | Avg Order | GMV | HungerSwipes Fee (10%) | New Customers | Revenue Lift |
|-------------|--------------|-----------|-----|----------------------|--------------|-------------|
| Food Truck | 100/mo | $15 | $1,500 | $150 | 30 | +$450 |
| Small Restaurant | 300/mo | $22 | $6,600 | $660 | 80 | +$1,760 |
| Mid Restaurant | 1,000/mo | $28 | $28,000 | $2,800 | 200 | +$5,600 |
| Chain (10 locations) | 5,000/mo | $32 | $160,000 | $16,000 | 500 | +$32,000 |

**ROI calculation:** A food truck paying $150/month would need to get just 10 new customers from HungerSwipes ($150 revenue) to break even.

---

## Competitive Moat — Why We Win

### 1. First Mover (Food Swipe)
No major platform exists with Tinder-style food discovery + per-order creator commission. Being first = brand association.

### 2. Creator Lock-In (Passive Income)
Once a creator has 50 photos generating $200/month passive income, they're not leaving. Every photo is a "mini-employee" that keeps earning.

### 3. Data Moat
Photos + orders + creator preferences = food recommendation engine no competitor can replicate. More orders = smarter recommendations = more orders (flywheel).

### 4. Network Effects
- More creators → more food photos → better for eaters
- More eaters → more orders → better for vendors
- More vendors → more food variety → better for creators

**Power law:** At 10K creators and 10K eaters in a city, the flywheel is self-sustaining.

---

## Financial Projections — 5 Years

| Year | Creators | Vendors | GMV/Month | Platform Revenue | Net Income |
|------|----------|---------|-----------|-----------------|------------|
| 1 | 10,000 | 5,000 | $500K | $50K | -$23K |
| 2 | 50,000 | 15,000 | $3M | $300K | +$180K |
| 3 | 200,000 | 50,000 | $15M | $1.5M | +$800K |
| 4 | 500,000 | 100,000 | $50M | $5M | +$2.5M |
| 5 | 1M | 250,000 | $150M | $15M | +$7.5M |

**Assumptions:**
- Platform takes 10% of GMV
- Creator subscriptions add $500K/year by Year 2
- Vendor subscriptions add $1M/year by Year 2
- Team grows from 2 to 15 people by Year 3
- Significant R&D investment in Years 1-2
