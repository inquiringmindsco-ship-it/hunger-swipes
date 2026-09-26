# Hunger Swipes — Search Engine & Analytics Setup Instructions

## Google Search Console

1. Open https://search.google.com/search-console.
2. Click **Add property**.
3. Choose **Domain** and enter:
   ```
   hungerswipes.com
   ```
4. Google will provide a DNS TXT verification record. **STOP here** and paste the exact TXT value into chat. Do not invent a value.
5. After O D adds the TXT record to DNS, return to Search Console and click **Verify**.
6. Once verified, add the sitemap:
   ```
   https://hungerswipes.com/sitemap.xml
   ```
7. Request indexing for these canonical URLs one at a time:
   - `https://hungerswipes.com`
   - `https://hungerswipes.com/swipe`
   - `https://hungerswipes.com/nearby`
   - `https://hungerswipes.com/join`

## Bing Webmaster Tools

1. Open https://www.bing.com/webmasters.
2. Click **Add site** and enter:
   ```
   https://hungerswipes.com
   ```
3. Choose verification method:
   - If Bing offers **DNS TXT**, **STOP** and paste the exact TXT value into chat.
   - If Bing offers an HTML file upload, place the file in `public/` and deploy.
4. After verification, submit:
   ```
   https://hungerswipes.com/sitemap.xml
   ```

## Analytics status & recommendation

- **Current status:** no analytics scripts or dependencies are installed.
- **Recommendation (privacy-first):** Use a **self-hosted Umami** or **Plausible** instance on O D's own infrastructure, or a first-party events table in the existing Supabase project for the key events below.
- **Do not** install Google Analytics, Meta Pixel, or other invasive third-party trackers without explicit approval.
- **Key events to measure** once analytics is approved:
  1. Homepage visit
  2. Start Swiping tap
  3. Food impression
  4. Want / right swipe
  5. Pass / left swipe
  6. Save
  7. Seller signup (`/join` submit)
  8. Community post submit
  9. Account signup

## 404 behavior

- The Next.js app currently renders a generic `not-found.tsx` if present; verify after deployment by requesting a nonexistent path such as `https://hungerswipes.com/this-does-not-exist` and confirming a 404 response is returned.
