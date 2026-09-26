# Hunger Swipes Production Cutover + Resend Readiness

This is a runbook only. **No production deployment, domain attachment, DNS change, or email-domain change was performed in Gate 3.**

## Preconditions

- Gate 3 Preview is approved on mobile Safari, Android Chrome, tablet, and desktop.
- Isolated authenticated E2E passes, including recovery email and callback URLs.
- Focal-point schema decision is complete separately.
- A current database backup and the last known-good Vercel deployment URL/commit are recorded.
- Vercel, Supabase, Network Solutions, and Resend owners are present for the cutover window.

## Exact cutover sequence

1. In the correct Vercel project, add `hungerswipes.com` and `www.hungerswipes.com`; do not edit DNS yet.
2. Copy the **project-specific DNS values shown by Vercel** for the apex and `www`. Do not use remembered or generic values.
3. In Network Solutions, inventory and export the current zone. Preserve mail-related MX/TXT records.
4. Create only the apex and `www` records Vercel requested. Configure `www` to redirect to the selected canonical host in Vercel.
5. Wait for Vercel domain verification and TLS issuance. Verify both HTTP-to-HTTPS and `www`-to-canonical redirects.
6. Change Production `NEXT_PUBLIC_APP_URL` to `https://hungerswipes.com` and redeploy the already-approved commit.
7. In Supabase Auth, set Site URL to `https://hungerswipes.com`. Add exact redirect entries for:
   - `https://hungerswipes.com/auth/callback`
   - `https://hungerswipes.com/auth/reset`
   - any still-required Vercel Preview callback/reset URLs, scoped narrowly
8. Exercise signup confirmation, sign-in, sign-out, password-recovery request, recovery landing, expired-link handling, and `next=/swipe` restoration.
9. Update `metadataBase`, OpenGraph URL/image URLs, canonical URLs, and any public social artwork URLs to the canonical domain. Add and verify `robots.txt` and `sitemap.xml`; both are currently missing.
10. Verify manifest, service worker, icons, start URL `/swipe`, and install-from-domain behavior.
11. Regenerate/verify seller QR and referral URLs so they use `https://hungerswipes.com`; do not invalidate old codes until redirect behavior is confirmed.
12. Smoke-test Discover, Nearby permission/denial, Saved, seller pages, community Post, image delivery, and error/offline states. Watch Vercel and Supabase logs without exposing tokens.

## Production rollback

1. Immediately promote the recorded last known-good Vercel deployment if the application regresses.
2. Restore the previous Production `NEXT_PUBLIC_APP_URL` and Supabase Site URL/redirect list if auth callbacks fail.
3. If DNS itself is the failure, restore the exported Network Solutions apex/`www` records exactly and allow TTL propagation.
4. Do not roll back by weakening RLS, exposing a service-role key, or pointing clients directly at privileged APIs.
5. Database rollback is migration-specific. No Gate 3 migration was applied.

## Resend setup plan

1. Create/confirm the Resend account and add the exact sending domain chosen by the business (root or a dedicated subdomain).
2. Choose a sender identity on that verified domain, such as a transactional address; confirm display name and monitored reply handling.
3. In Resend, obtain the **exact current DNS record names, types, and values** for domain verification and DKIM. Copy them verbatim into Network Solutions. Do not invent or normalize them.
4. Add the SPF record exactly as Resend instructs. If an SPF TXT record already exists, merge authorized senders into a single SPF policy—never publish two SPF records at the same hostname.
5. Add all DKIM records exactly as issued by Resend and wait for verification.
6. Add DMARC at `_dmarc` with an initially monitored policy appropriate to the business (commonly `p=none` with aggregate reporting), then move toward quarantine/reject only after legitimate senders align. The final value and report mailbox require owner approval.
7. Before adding a future mailbox provider, inventory SPF/DKIM/DMARC and MX records. Mailbox MX records and transactional-sender authorization serve different purposes; preserve both deliberately.
8. Send confirmation and recovery test messages to major mailbox providers. Verify From, Return-Path, SPF, DKIM, DMARC alignment, links, and reply behavior.

No DNS record values are included here because provider-generated, project-specific values must be used at execution time.
