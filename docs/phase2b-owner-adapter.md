# Phase 2B owner adapter (Preview)

Normal Hunger Swipes owner administration now prefers an attributable Supabase user. The server verifies the bearer token with Supabase Auth and then requires the normalized email in `HUNGER_SWIPES_OWNER_EMAILS`. Ordinary users and sellers receive no owner privileges. `ADMIN_SECRET` remains a temporary timing-safe compatibility fallback and should be removed only after the named-owner path is released and observed in Production.

The IMG integration uses `HUNGER_SWIPES_ADAPTER_SECRET` on two narrow server-only routes:

- `GET /api/owner-adapter` returns read-only metrics and limited masked search results.
- `POST /api/owner-session-link` accepts only an allowlisted owner email and creates a one-time Supabase magic-link handoff.

Metric truth rules:

- Total businesses: all `sellers` rows.
- Live businesses: `sellers.status = 'active'`.
- Pending submissions: `business_submissions.status IN ('new','contacted')`.
- Pending claims: `place_claims.status = 'pending'`.
- Pending moderation: active `community_food_posts` with `moderation_status = 'pending_review'`.

`places` are not counted as approved Hunger Swipes businesses. Any failed authoritative query makes the adapter unavailable rather than returning a fabricated zero.
