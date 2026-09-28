# Hunger Swipes — Food Intent Platform Implementation Audit

## Backend Checklist
- [x] Migration 027: Eat/Make/Explore eligibility, recipe types, Proud to Pay min, Stripe Connect, handles, food_profiles, user_follows, food_impact_events, recipe_commerce_config
- [x] Migration 028: profile_eligible flag
- [x] /api/dishes supports discoveryMode=eat|make|explore
- [x] /api/recipes validates recipe_type and minimum prices server-side
- [x] /api/recipes/[id] unlock respects free vs paid entitlements
- [x] /api/recipes/purchase creates Stripe PaymentIntent + pending purchase (test mode only)
- [x] /api/stripe/connect onboarding + status
- [x] /api/stripe/webhook idempotent payment/refund handling
- [x] /api/follows CRUD
- [x] /api/handles claim/update/lookup with reserved-route protection
- [x] /api/profiles/[handle] public profile with private counts only for owner
- [x] /api/profiles update
- [x] /api/impact records private food interaction events
- [x] Admin APIs: recipe-commerce-config, recipe-purchases, handles
- [ ] Admin sell page UI updates (in frontend subagent)

## Frontend Checklist (subagent: hs_food_intent_frontend)
- [ ] /swipe EAT | MAKE | EXPLORE mode switch
- [ ] Mode persistence
- [ ] Recipe preview/unlock/purchase UI
- [ ] Follow button placement
- [ ] Shareable Food Profile page
- [ ] Handle claim + profile edit UI
- [ ] Seller dashboard Stripe Connect section
- [ ] /seller/recipes/new recipe_type UI
- [ ] Admin sell page enhancements

## Stripe / Commerce Checklist
- [ ] STRIPE_SECRET_KEY configured as test key
- [ ] STRIPE_WEBHOOK_SECRET configured
- [ ] Test creator onboarding in Stripe Connect test mode
- [ ] Test $4.99 fixed recipe transaction
- [ ] Test $9.99 fixed recipe transaction
- [ ] Test $5.00 Proud to Pay transaction
- [ ] Test $10.00 Proud to Pay transaction
- [ ] Verify customer amount, Stripe fee, Hunger Swipes amount, creator amount, refund behavior
- [ ] Live money remains OFF

## Deployment / Verification
- [ ] npm run build passes after frontend integration
- [ ] Production routes 200
- [ ] Audit changed paths
- [ ] Deploy
- [ ] Update memory/2026-09-28.md and HEARTBEAT.md
