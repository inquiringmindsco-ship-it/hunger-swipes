# Gate 3 Preview Environment Design

## Current safety finding

Vercel has production configuration, but Gate 1 found no Preview variables. A mutable Vercel Preview must **not** use the production Supabase URL, anon key, service-role key, storage bucket, or test accounts. The current production domain settings also remain unchanged.

## Required isolated resources

Create a separate Supabase project (or an approved branch with fully isolated data and auth) dedicated to Preview, then:

1. Apply the existing committed migrations in order to an empty Preview database. Do not include the unapproved focal-point proposal.
2. Create Preview-only `dish-photos` storage with the same policies and a small set of licensed/test images.
3. Create non-personal test users for eater, seller, and recovery flows. Never copy production users or tokens.
4. Seed clearly labeled test sellers, places, official dishes, and community posts. Do not copy production data.
5. Configure Supabase Preview Site URL to the stable Preview alias once one exists. Allow the exact Vercel deployment pattern needed for `/auth/callback` and `/auth/reset`; keep the allowlist narrow.
6. Set Vercel **Preview scope only** variables: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SECRET`. Secret values must be entered directly in the provider UI/CLI and never committed or reported.
7. Disable or use test mode for any external billing/email side effects. Stripe production keys are not required for the Gate 3 Discover/auth suite.
8. Run authenticated mutation E2E only against this isolated project, then reset it from migrations/seed.

## Safe automated coverage already available

The committed Playwright suite uses an intercepted fixture feed, a fresh guest browser context, blocked service workers, and no database authentication. Vitest covers authenticated persistence response semantics and Saved states without external writes.

## Deployment gate

A backend-connected Preview is safe only after the isolated project and Preview-scoped variables above exist. Until then, an environmentless Vercel Preview may demonstrate build/error states but must not be represented as a complete authenticated Preview.

Gate 3 environmentless Preview: `https://hunger-swipes-2hz4lmgzp-inquiringmindsco-ship-its-projects.vercel.app` (deployment `dpl_DND2xQGwavEMd9tso1yvVnN8KvMR`). It is Vercel-protected, READY, and intentionally returns `Database not configured` from the feed API. It is not a Production deployment and has not been promoted.
