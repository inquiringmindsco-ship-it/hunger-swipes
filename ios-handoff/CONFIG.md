# Hunger Swipes iOS — Configuration

## Required environment variables

These must be available at build time (the native build uses the same variables as the website):

| Variable | Purpose | Where used |
|----------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Auth, database, storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key | Auth, database, storage |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL | Share links, redirects |
| `NEXT_PUBLIC_API_BASE_URL` | Live API base for native app | `lib/api-url.ts` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Checkout (web fallback) |

## iOS-specific variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL=https://hungerswipes.com` | Tells the iOS app to call the live production API |

## Native configuration files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor appId, plugins, splash/status-bar/keyboard |
| `ios/App/App/Info.plist` | Bundle display name, permissions, status bar, orientations |
| `ios/App/App/App.entitlements` | Push notifications + Associated Domains |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset` | App icons (generated from `public/icon-1024.png`) |
| `ios/App/App/Assets.xcassets/Splash.imageset` | Launch screen image (generated) |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard` | Launch screen layout |

## Bundle ID

`com.inquiringminds.hungerswipes`

This must be registered in the Apple Developer portal and match the Xcode signing profile.

## Capabilities Codex must enable in Xcode

- **Push Notifications** (requires APNS key/certificate)
- **Associated Domains** with `applinks:hungerswipes.com`
- Sign in with Apple is **not** required unless we add Apple ID auth later

## What the mobile app does NOT contain

- Supabase service-role key
- Stripe secret key
- Any admin credentials
- Any hardcoded secrets
