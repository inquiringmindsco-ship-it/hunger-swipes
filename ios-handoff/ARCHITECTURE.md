# Hunger Swipes iOS — Architecture

## Summary

Hunger Swipes iOS is a **Capacitor 8** native application that wraps the existing Next.js web app. It reuses the production Supabase backend, auth, database, storage, and business logic. It is **not** a bare WebView — it adds native plugins for camera, haptics, push notifications, geolocation, keyboard handling, safe areas, and deep links.

## Why Capacitor (and not React Native)

Hunger Swipes already had a polished PWA with:
- App shell + persistent bottom tab bar
- Splash screen and app icons
- Tinder-style swipe engine with gesture physics
- EAT / MAKE / EXPLORE discovery modes
- Swipe Bucks wallet, saved dishes, user profiles
- Seller dashboards and admin tools

React Native would have required rebuilding the entire UI, duplicating state management, and reimplementing business logic. Capacitor preserves that investment while delivering a real iOS app with native APIs.

## Repository layout

```
~/Documents/hunger-swipes/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Home / app shell
│   ├── swipe/page.tsx          # Discover (EAT/MAKE/EXPLORE)
│   ├── account/page.tsx        # Profile + Account deletion
│   ├── post/page.tsx           # Community food post upload
│   └── ...
├── lib/
│   ├── capacitor.ts            # Native-platform detection
│   ├── api-url.ts              # Resolves /api/ paths for native builds
│   ├── auth-fetch.ts           # Authenticated fetch wrapper (now API-base aware)
│   ├── image-picker.ts         # Capacitor Camera + web fallback
│   ├── haptics.ts              # Haptic feedback helper
│   ├── push-notifications.ts   # Push notification registration scaffold
│   └── deep-links.ts           # Universal link handling
├── ios/                        # Generated Xcode project
│   └── App/App.xcworkspace
├── scripts/
│   ├── build-ios-export.mjs    # Static-export build + cap sync
│   ├── generate-ios-assets.mjs # App icon + splash image generator
│   └── patch-native-api-calls.mjs # Patch fetch('/api/...) for native
├── capacitor.config.ts         # Capacitor configuration
├── next.config.ts              # Next.js config with IOS_BUILD conditional export
└── ios-handoff/                # This package
```

## How the static export works

Next.js `output: 'export'` cannot include API Routes or dynamic routes without `generateStaticParams()`. The `build:ios` script temporarily moves these out of the build, then restores them:

1. `app/api/` → all backend API routes (the iOS app calls the live production API)
2. `app/robots.ts` and `app/sitemap.ts` → server-only route handlers
3. Dynamic routes already have `generateStaticParams()` returning a preview shell.

The exported static bundle lives in `dist/` and is copied into `ios/App/App/public` by `npx cap sync ios`.

## How deep links work

The app handles `https://hungerswipes.com/*` links via the Capacitor App plugin. Apple requires an App Site Association file served at `/.well-known/apple-app-site-association`; this file is included in the web app at `app/.well-known/apple-app-site-association/route.ts`. Codex must replace the `TEAM_ID` placeholder with the real Apple Team ID.

## Native push notification behavior

The app attaches push listeners on launch but does **not** request permission immediately (to avoid App Store rejection). Users can enable notifications from **Account → Notifications**.

## Account deletion

The app provides in-app account deletion at **Account → Delete Account**. It calls `DELETE /api/account/delete`, which removes the Supabase auth user and anonymizes related records. The endpoint is part of the web API and must be deployed to production before native users can delete accounts.

## API routing in the native app

The web app uses relative paths like `/api/dishes`. Inside the Capacitor WebView the app loads from `capacitor://localhost`, so relative API calls would 404. `lib/api-url.ts` and `lib/auth-fetch.ts` detect native mode and prefix paths with `NEXT_PUBLIC_API_BASE_URL`, which points to `https://hungerswipes.com` in the native build.

## Native plugins installed

| Plugin | Purpose |
|--------|---------|
| `@capacitor/camera` | Photo / camera picker for uploads |
| `@capacitor/geolocation` | Location for nearby discovery |
| `@capacitor/push-notifications` | APNS registration scaffold |
| `@capacitor/local-notifications` | Local notification capability |
| `@capacitor/app` | App state + deep link handling |
| `@capacitor/browser` | External links in Safari |
| `@capacitor/share` | Native share sheets |
| `@capacitor/splash-screen` | Launch splash control |
| `@capacitor/status-bar` | Dark status bar styling |
| `@capacitor/keyboard` | Keyboard resize / dark style |
| `@capacitor/preferences` | Key/value native storage |
| `@capacitor/network` | Online/offline detection |
| `@capacitor/haptics` | Swipe haptic feedback |
| `@capacitor/action-sheet` | Native action sheets |

## What Codex will need Apple-side

- Apple Developer account + team
- Bundle ID `com.inquiringminds.hungerswipes` registered in Apple Developer portal
- Push Notifications capability + APNS key/certificate
- Associated Domains entitlement for `applinks:hungerswipes.com`
- App Store Connect app record, privacy labels, screenshots, signing certificate, provisioning profile
- TestFlight build and App Store review submission
