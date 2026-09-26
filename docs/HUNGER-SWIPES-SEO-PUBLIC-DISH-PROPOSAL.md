# Hunger Swipes — Public Dish Page SEO Proposal

## Current state

- The primary discovery object is a **dish** surfaced in `/swipe`.
- Individual dishes do **not** have stable public URLs today.
- Sellers/Places have public pages at `/places/<id>`, but those represent the place, not each dish.
- Saved dishes live under `/saved` (private, auth-gated).
- Community posts are created under `/post` and surfaced in the feed, but they also lack public permalinks.

## Why public dish pages matter

Search engines index pages. A feed is hard to rank. A single dish page can be:

- Linked from social shares.
- Indexed for the dish name, cuisine, location, and seller.
- Reused in structured data (Restaurant menu, Product, LocalBusiness).
- The canonical URL for an official dish vs. a community post about the same food.

## Required page representation

A future public dish page must be capable of representing:

- dish name
- food image
- restaurant/seller/place
- city
- description
- price when available
- cuisine/category when available
- where to get it
- Hunger Swipes discovery CTA

This creates the potential for searches like:

- "stuffed salmon St Louis"
- "burgers near me"
- "chicken alfredo St Louis"

Do not create thin pages for nonexistent or removed content.

## Proposed URL architecture

```
/food/<slug-or-stable-id>
```

### Identifier choice

Option A: stable UUID (`/food/550e8400-e29b-41d4-a716-446655440000`)
- Pros: never breaks when dish name changes, trivial to implement.
- Cons: ugly for sharing.

Option B: slug from dish name (`/food/ashleys-fried-catfish`)
- Pros: readable, keyword-rich URL.
- Cons: needs uniqueness enforcement and a redirect strategy when the name changes.

Option C: hybrid (`/food/<slug>--<short-id>`)
- Pros: readable and stable.
- Cons: slightly more complex.

**Recommendation:** Start with Option A for speed, then migrate to Option C once slug generation is solid.

## Page content (MVP, no fake data)

A public dish page should display only what Hunger Swipes actually has:

1. Dish name as `<h1>`.
2. Food photo with descriptive `alt` text.
3. Seller/place name and link to `/places/<id>`.
4. City/location when available.
5. Description when available.
6. Price or price range when stored.
7. Cuisine/category tags when stored.
8. Where to get it CTA.
9. A clear CTA: "Open in Hunger Swipes" linking to `/swipe?dish=<id>`.
10. Official vs. community attribution.

## Metadata per page

```
title:       "{dishName} — {sellerName} | Hunger Swipes"
description: "{dishName} from {sellerName} in {city}. Discover the dish on Hunger Swipes and find where to get it."
canonical:   "https://hungerswipes.com/food/{id}"
og:image:    dish photo (fallback to site og-image)
```

## Structured data

Use JSON-LD with types the product can actually support:

- `Restaurant` or `FoodEstablishment` for the seller.
- `MenuItem` for the dish, offered by the seller.
- Avoid `AggregateOffer`, `AggregateRating`, or `Review` unless real data exists.

## Internal linking

- Link each dish card in `/swipe` to its public page (or use it as the share target).
- Link from `/places/<id>` to its dishes.
- Add public dish URLs to the sitemap once the route is live.

## Next steps to implement

1. Add `slug` or confirm stable `dish.id` usage.
2. Create server route `/food/[id]/page.tsx` that fetches one dish by id.
3. Generate dynamic metadata and JSON-LD.
4. Add the route to `sitemap.ts`.
5. Add share action in `/swipe` that copies `/food/<id>`.
6. Add redirect or canonical handling if a slug changes.

## What this proposal does NOT do

- Create fake reviews, ratings, or locations.
- Build hundreds of thin pages before data exists.
- Change auth, swipe behavior, or Supabase schema without approval.
