# Hunger Swipes 1.0 — App Store Connect Release Material

## Product page copy

**Name:** Hunger Swipes

**Subtitle:** Swipe food. Find your next meal.

**Promotional text:** Discover real dishes from local food businesses and community food posts—one swipe at a time.

**Description:**

Hunger Swipes makes finding your next meal visual, local, and simple.

Swipe through real dishes from nearby food businesses and community food posts. Save what looks good, pass on what does not, and come back to your favorites when you are ready to eat.

Use EAT to discover dishes, MAKE to explore recipes and food ideas, and EXPLORE to find local sellers. Post food you have tried, build your food profile, and keep your discoveries organized in Saved and History.

Hunger Swipes currently highlights the St. Louis area as we grow our local food community.

**Keywords:** food,restaurants,dishes,local,swipe,recipes,community,St Louis,discover,nearby

**Marketing URL:** https://hungerswipes.com

**Support URL:** https://hungerswipes.com/support

**Privacy Policy URL:** https://hungerswipes.com/privacy

**Copyright:** 2026 Inquiring Minds Limited Liability Company

## App Review notes

Hunger Swipes opens directly to Discover and supports anonymous browsing. An account is required for actions such as saving, posting, and maintaining a profile. Reviewers may use a dedicated review account supplied in App Store Connect to test authenticated features. Account deletion is available in the Profile/Account area.

The app displays user-submitted food content. Reporting, blocking, moderation, approval, and emergency-unpublish controls are implemented. Paid recipe unlocking is unavailable in the iOS app; free recipes remain available. The app does not install affiliate tracking scripts and does not currently provide delivery.

The location permission is used to show nearby food. Camera and photo-library permissions are requested only when the user chooses to post a food photo. Notification permission is user initiated.

## Privacy label working answers

Declare the following as **linked to the user** and used for **App Functionality**, not tracking:

- Contact Info: email address; name and phone number when voluntarily provided.
- Location: precise location when the user enables nearby discovery.
- User Content: photos, posts, profile information, comments, and recipes.
- Identifiers: user ID and push-notification device token.
- Usage Data: swipes, saves, follows, history, and other product interactions.

Payment card details are handled by Stripe and are not stored by Hunger Swipes. Confirm App Store Connect's Purchases answer against the production payment configuration before submission. Select **No** for tracking unless the production data practices change.

## Screenshots

Upload at least one portrait iPhone screenshot; use the current 6.9-inch accepted size from Apple. Recommended release set:

1. Discover food nearby — food card and EAT tab.
2. Save what you want — right-swipe confirmation/countdown.
3. Explore your way — EAT / MAKE / EXPLORE.
4. Share real food — Post flow.
5. Keep it organized — tiled Profile dashboard, Saved, and History.

Screenshots must show production-like content, must not contain debug overlays, and must not claim delivery or ordering features that are not live.

## Release selections

- Version: 1.0
- Build: 17
- Platform: iPhone only
- Minimum iOS: 15.0
- Category: Food & Drink
- Secondary category: Lifestyle (optional)
- Availability: Manual release after approval
- Encryption: only exempt/system-provided encryption; `ITSAppUsesNonExemptEncryption` is `NO`.
- Review contact and demo-account credentials: enter securely in App Store Connect; never commit them.
