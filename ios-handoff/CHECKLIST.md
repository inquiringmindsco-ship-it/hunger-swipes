# Hunger Swipes iOS — App Store Submission Checklist

## ✅ Completed by Sentinel

- [x] Capacitor 8 + `@capacitor/ios` integrated
- [x] Xcode project generated at `ios/App/App.xcworkspace`
- [x] Static export build script: `npm run build:ios`
- [x] Native API path resolution (`lib/api-url.ts`, `lib/auth-fetch.ts`)
- [x] App icons generated from `public/icon-1024.png`
- [x] Dark launch screen generated and configured
- [x] Info.plist permissions: camera, photo library, location, notifications
- [x] Portrait-only orientation configured
- [x] Dark status bar configured
- [x] Native detection helper (`lib/capacitor.ts`)
- [x] Haptic feedback on swipe commits
- [x] Capacitor Camera integration for photo upload (with web fallback)
- [x] Native app initialization: status bar, keyboard, splash screen, push registration, deep links
- [x] Account deletion UI + API endpoint
- [x] Handoff documentation package
- [x] TypeScript lint passes (`npm run lint`)
- [x] iOS static export builds successfully (`npm run build:ios`)

## ⏳ Requires Codex / Apple Developer Account

- [ ] Apple Developer team selected in Xcode
- [ ] Bundle ID `com.inquiringminds.hungerswipes` registered
- [ ] Signing certificate + provisioning profile
- [ ] `App.entitlements` referenced in Xcode build settings
- [ ] Push Notifications capability enabled
- [ ] Associated Domains capability enabled (`applinks:hungerswipes.com`)
- [ ] APNS key/certificate generated and uploaded to Supabase/Vercel backend
- [ ] TestFlight build archived and uploaded
- [ ] App Store Connect app record created
- [ ] Privacy labels filled in (see `PRIVACY.md`)
- [ ] App Store screenshots (iPhone required sizes)
- [ ] App Store review information + demo account if needed
- [ ] Submit for review

## ⚠️ Known limitations / decisions for Od

1. **No Xcode on current build machine**: Final Xcode build and simulator testing could not be run here. Codex must run `npm run ios:open` and build in Xcode.
2. **Entitlements not wired in pbxproj**: `ios/App/App/App.entitlements` exists but must be assigned to the target in Xcode.
3. **Push notifications are scaffold only**: Server-side notification sending is not implemented.
4. **Deep links / universal links need Apple portal setup**: The app handles `hungerswipes.com` links; Apple domain verification file must be served at `https://hungerswipes.com/.well-known/apple-app-site-association`.
5. **Sign in with Apple not implemented**: If Apple requires it for the auth flow, it must be added.
