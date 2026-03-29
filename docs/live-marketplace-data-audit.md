# Live Marketplace Data Audit

## Current State of the Pipeline
The PriceIQ storefront tries to pull real-time data from two RapidAPI endpoints (Amazon and Flipkart). Currently, no live products are being shown, and the application is falling back to dummy seeded MongoDB data. 

Here are the answers to the root cause trace:

1. **Which route fetches live Amazon data?**
   - `backend/src/routes/marketplace.js` (used to build categories and the home feed)
   - `backend/src/routes/search.js` (a secondary Amazon-only proxy, mainly for `searchRealProducts`).

2. **Which route fetches live Flipkart data?**
   - `backend/src/routes/marketplace.js` (primary feed builder)
   - `backend/src/routes/flipkart.js` (standalone Flipkart proxy, currently unused by the frontend).

3. **Which API/service is actually called by the frontend?**
   - **Home/Categories:** `GET /api/marketplace/home` and `GET /api/marketplace/category/:cat`.
   - **Search:** `GET /api/marketplace/search?q=`.
   - **Product Detail:** `GET /api/marketplace/product/:id` is attempted first. If it fails or it's a numeric local ID, the frontend calls `GET /api/products/:id`.

4. **Where are dummy/seeded/local DB products being returned?**
   - Inside `frontend/src/contexts/ProductContext.tsx`. If `fetchMarketplaceHome` returns an empty feed (or throws an error), the frontend explicitly switches `feedSource` to `"local"`. 
   - It then hits `/api/products`, which completely bypasses the live marketplace and loads the seeded MongoDB items.

5. **Are external API failures silently falling back to dummy data?**
   - **Yes.** In `backend/src/routes/marketplace.js`, the functions `fetchAmz` and `fetchFk` wrap their fetch calls in a `try...catch` block. 
   - When an API key runs out or an endpoint is removed, an error is thrown, but the `catch` block silently returns an empty array `[]` without logging the exact upstream error.

6. **Are response mappings broken?**
   - **Amazon:** The API mapping works, but the RapidAPI key `4ce45154damsh...` has exceeded its Monthly Basic quota (`429 Too Many Requests`).
   - **Flipkart:** The endpoint `/search` for the Flipkart API is returning a `404 Not Found`, suggesting the API provider changed the endpoint route or it's defunct.

7. **Is caching returning stale results?**
   - In `backend/src/routes/marketplace.js`, cross-restart disk caching `getCache(...)` is enabled. It may serve old JSON files if they were recorded before the API ran out of quota. However, if the cache expires, it pulls empty arrays and caches *that*, making the storefront permanently empty or defaulting to local data.

8. **Is MongoDB being used as a source of truth when it should not be?**
   - Yes, for the main storefront views. Because the backend doesn't feed any live results when quotas expire, the frontend context completely abandons the marketplace structure in favor of `staticProducts` or MongoDB products. 

9. **Are environment variables / RapidAPI keys missing?**
   - They are present in `.env`, but as mentioned, the Amazon plan is exhausted, and the Flipkart endpoint is down. 

10. **Is the frontend calling the wrong endpoint?**
    - No, the calls to `/api/marketplace/...` are correct for the Hackathon's scope, but the `/api/marketplace/search` route needs to handle JSON metadata rather than a flat array.

11. **Are product cards using DB data instead of normalized live search results?**
    - Yes, they are rendering local IDs (like `id: 1, 2, 3`) rather than Amazon ASINs (`amz_B08...`).

12. **Is there a mixed-source inconsistency between search results and the product detail page?**
    - The Product Detail Page (`ProductDetail.tsx`) is actually mostly aware of `amz_` and `fk_` prefixes. If you passed it a correct `amz_` ID, it would fetch it from `/api/marketplace/product/:id`. 
    - But since the storefront is defaulting to local `api/products`, users are only clicking local IDs.

---

## The Verdict
The current architecture silently collapses under the weight of upstream API failure. An API `429` (Amazon) and `404` (Flipkart) cause the backend proxy to return `[]`. The `buildHomeFeed` returns empty categories, and the `ProductContext` in the frontend panics, swapping the entire store catalog to MongoDB dummy JSON items.
