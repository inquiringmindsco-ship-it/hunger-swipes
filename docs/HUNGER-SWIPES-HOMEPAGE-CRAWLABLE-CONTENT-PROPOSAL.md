# Hunger Swipes — Homepage Crawlable Content Proposal

## Current state

The root `/` page renders a client-only splash screen by default, followed by a tabbed mobile app shell. The server-rendered initial HTML contains navigation, title, and metadata but almost no crawlable body content about what Hunger Swipes is.

Search engines that execute JavaScript may still see the splash, and crawlers that do not will receive only the nav and metadata.

## Proposed narrow change (no redesign)

Keep the existing splash and tab experience intact. Add a small, server-rendered `<main>` section on the root page that is visible to crawlers and to users without JavaScript, but visually hidden or presented as a minimal footer blurb for normal mobile users.

Two implementation options:

### Option A: `<noscript>` block (safest, no visual change)

Render the value proposition inside a `<noscript>` tag so only non-JS clients (including some crawlers) see it:

```html
<noscript>
  <main>
    <h1>Hunger Swipes — Swipe food. Find your next meal.</h1>
    <p>Discover real food from real local places through official dishes and clearly labeled community food posts. Browse nearby restaurants, food trucks, home kitchens, and community food photos, then save the dishes you want to try.</p>
    <a href="/swipe">Start discovering food</a>
    <a href="/nearby">Find food places near you</a>
    <a href="/join">List your food business</a>
  </main>
</noscript>
```

Pros: zero visual change for normal users.
Cons: Googlebot generally executes JavaScript and may ignore `<noscript>` content as primary.

### Option B: Static intro rendered before/around the splash (small visual addition)

Render a compact, premium-styled intro block as part of the server HTML, then overlay the splash on top for first-time users. For returning users (splash skipped via sessionStorage), the intro remains visible as the top of the Home tab.

Content:

```html
<main>
  <h1>Swipe food. Find your next meal.</h1>
  <p>Discover real dishes from real local places — restaurants, food trucks, home kitchens, and community food posts.</p>
  <a href="/swipe">Discover food</a>
  <a href="/nearby">Nearby places</a>
  <a href="/join">Join as a seller</a>
</main>
```

Pros: guaranteed crawlable, also improves first-load perceived value.
Cons: slightly changes the splash-first experience; requires careful stacking so the splash still works.

## Recommendation

Start with **Option A** if the splash experience must remain untouched, then measure crawler behavior after deployment. Move to **Option B** if search engines do not index the homepage well.

## What this does NOT do

- Redesign the homepage visual system.
- Remove the splash screen.
- Add keyword stuffing.
- Change auth, swipe logic, or routes.
