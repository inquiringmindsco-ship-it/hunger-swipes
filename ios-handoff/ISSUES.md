# Hunger Swipes iOS — Outstanding Issues & Assumptions

## Build-time assumptions

- The iOS app is built as a **static export** of the Next.js web app. API routes are moved out during the export and restored afterward. The native app calls the live production API.
- `NEXT_PUBLIC_API_BASE_URL` must be set to `https://hungerswipes.com` (or a dev backend) for native API calls to work.
- The current build machine does not have Xcode installed, so the final Xcode build was not verified here.

## Functional gaps

1. **Apple Team ID placeholder**: `app/.well-known/apple-app-site-association/route.ts` contains `TEAM_ID.com.inquiringminds.hungerswipes`. Replace `TEAM_ID` with the real Apple Team ID before deploying the website to production.
2. **Push notification server**: The app registers for APNS tokens, but no server-side push-sending infrastructure exists yet. Permission is user-initiated from Account → Notifications.
3. **Universal links domain verification**: AASA file is in place, but Apple must verify it at `https://hungerswipes.com/.well-known/apple-app-site-association` after production deploy.
4. **Sign in with Apple**: Not implemented. Not required because auth is email/password + magic link only.
4. **Offline mode**: The app detects offline state but does not queue swipes/uploads for later sync.
5. **Camera upload polish**: Only the `/post` page has the Capacitor Camera picker integrated. Other upload pages still use the file input fallback, which works in the WebView but is less native-feeling.

## iOS-specific polish not yet done

- Pull-to-refresh on lists
- Native share sheet integration beyond the plugin install
- Image prefetching / native image cache tuning
- Accessibility audit on VoiceOver labels

## No blockers for handoff

The Xcode project is generated, the web assets are wired, and the build script is verified end-to-end on this machine. Codex can take over Apple-specific configuration, signing, and submission.
