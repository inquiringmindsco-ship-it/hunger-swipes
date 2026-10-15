# Hunger Swipes iOS — Handoff to Codex

> Prepared by Sentinel-main on 2026-10-15.
> Branch: `feature/ios-capacitor`
> Commit: `fc1105c`
> Status: Development build complete. Ready for Xcode signing, testing, and App Store submission.

## What you have

A real Capacitor 8 native iOS application wrapping the existing Hunger Swipes Next.js web app. The Xcode workspace is generated and the build script is verified on this machine.

## Quick start

```bash
cd ~/Documents/hunger-swipes
npm install
npm run build:ios   # builds static export + syncs web assets into Xcode project
npm run ios:open    # opens ios/App/App.xcworkspace in Xcode
```

Then in Xcode:
1. Select your Apple Developer team.
2. Set bundle ID `com.inquiringminds.hungerswipes`.
3. Reference `ios/App/App/App.entitlements` in Build Settings.
4. Enable Push Notifications and Associated Domains capabilities.
5. Add `applinks:hungerswipes.com` to Associated Domains.
6. Build/run on iPhone simulator, then archive for TestFlight.

## Critical Apple-side tasks only you can do

- Replace `TEAM_ID` in `app/.well-known/apple-app-site-association/route.ts` with the real Apple Team ID, then deploy the website so Apple can verify the AASA file.
- Generate APNS key/certificate and configure server-side push sending.
- Create App Store Connect app record, fill privacy labels, upload screenshots.
- Handle TestFlight distribution and App Store review submission.

## Verified without Xcode

- `npm run lint` passes (TypeScript clean).
- `npm test` passes (15/15).
- `npm run test:ui` passes (19/19).
- `npm run build` passes (standard website unaffected).
- `npm run build:ios` passes (static export + Capacitor sync).

## Known limitations

- Xcode build/simulator testing was not run here because Xcode is not installed on this machine.
- Push notifications are scaffolded but the server-side sender is not implemented.
- Sign in with Apple is not needed (auth is email/password + magic link).
- Some upload pages still use the file input fallback instead of the Capacitor Camera picker.

## Do not submit without

- Replacing the `TEAM_ID` placeholder in the AASA file.
- Running the app on a real iPhone and confirming sign-in, swipe, save, upload, and account deletion.
- Verifying App Store privacy labels against `ios-handoff/PRIVACY.md`.

## Files to read

- `ios-handoff/ARCHITECTURE.md` — why Capacitor and how it works
- `ios-handoff/BUILD.md` — exact build steps
- `ios-handoff/CONFIG.md` — env vars and bundle ID
- `ios-handoff/PRIVACY.md` — data inventory for App Store disclosures
- `ios-handoff/CHECKLIST.md` — completed vs Codex-required items
- `ios-handoff/ISSUES.md` — outstanding items and assumptions

## Contact

Ping Sentinel-main if anything in the web build or Capacitor configuration blocks Xcode compilation.
