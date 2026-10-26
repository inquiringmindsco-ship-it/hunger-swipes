# Hunger Swipes iOS — Build Instructions

## Prerequisites

- macOS with Xcode 16+ installed
- Node.js 18+ and npm
- Apple Developer account (for signing / TestFlight / App Store)
- Hunger Swipes repo cloned at `~/Documents/hunger-swipes`

## One-time setup

```bash
cd ~/Documents/hunger-swipes
npm install
```

## Build the iOS app

```bash
cd ~/Documents/hunger-swipes
npm run build:ios
```

This runs `scripts/build-ios-export.mjs` which:
1. Cleans `.next/` and `dist/`
2. Temporarily moves `app/api/`, `app/robots.ts`, `app/sitemap.ts` aside
3. Builds a static Next.js export into `dist/`
4. Restores the moved files
5. Runs `npx cap sync ios` to copy web assets into the Xcode project

## Open in Xcode

```bash
cd ~/Documents/hunger-swipes
npm run ios:open
```

This opens `ios/App/App.xcworkspace` in Xcode.

## Run on simulator

In Xcode:
1. Select a simulator (e.g., iPhone 16)
2. Press `Cmd + R`

## Run on device / archive for TestFlight

1. In Xcode, select the App target → Signing & Capabilities
2. Choose your Apple Developer team
3. Register/confirm bundle ID `com.inquiringminds.hungerswipes`
4. Add the entitlements file reference: `App.entitlements`
5. Add Push Notifications capability and Associated Domains (`applinks:hungerswipes.com`)
6. Build to a connected device or use Product → Archive → Distribute App

## Environment variables for native build

The native app reads the same `.env.local` values as the website. The only additional variable required is:

```env
NEXT_PUBLIC_API_BASE_URL=https://hungerswipes.com
```

This is already set in `.env.production.local` and used when `IOS_BUILD=true`.

## Important: do not commit secrets

- Never commit `.env.local`, `.env.production.local`, or service-role keys.
- The mobile app only uses the public Supabase anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `xcodebuild: error: missing scheme` | Open the workspace in Xcode once and let it resolve SPM packages. |
| `app/api~hold` or stale errors | Delete `.next/` and re-run `npm run build:ios`. |
| Splash screen not showing | Verify `Assets.xcassets/Splash.imageset` contains `splash-2732x2732.png`. |
| API calls 404 in simulator | Check `NEXT_PUBLIC_API_BASE_URL` is set to a reachable URL. |
