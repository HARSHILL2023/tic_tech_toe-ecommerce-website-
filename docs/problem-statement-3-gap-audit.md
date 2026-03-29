# Problem Statement 3 — Gap Audit
> PriceIQ: E-Commerce Dynamic Pricing & Personalization Engine
> Audited: 2026-03-29 | Auditor: Antigravity AI

---

## 1. Real-Time Event Processing

### ✅ FULLY IMPLEMENTED
| Feature | File | Notes |
|---|---|---|
| `POST /api/track` endpoint | `backend/src/routes/track.js` | Accepts eventType, productId, sessionId, userId, device, city, metadata |
| MongoDB event persistence | `track.js` → `Event.create()` | All event types persisted |
| Product demand counters (`$inc`) | `track.js` | cartAddCount, purchaseCount, viewCount updated on events |
| Session upsert on every event | `track.js` | `Session.findOneAndUpdate` with `upsert: true` |
| Redis recent-views LPUSH | `track.js` | `viewed:${sessionId}` list maintained |
| 15-min view velocity counter | `price.js` | `views:15m:${productId}` incremented with Redis TTL |
| Live SSE event stream | `products.js` + `dashboard.js` | Two SSE endpoints; both work  |
| Frontend subscribes to SSE | `Dashboard.tsx` | `connectLiveEvents()` → updates events state |
| `trackEvent()` in frontend API | `api/index.ts` | Non-blocking, includes device detection |
| `page_view` fired on ProductDetail | `ProductDetail.tsx:67,90` | ✅ Fires for both local and marketplace products |
| `add_to_cart` fired on ProductDetail | `ProductDetail.tsx:164` | ✅ Fully wired |
| `wishlist_add` fired on ProductDetail | `ProductDetail.tsx:176` | ✅ Fully wired |
| `purchase` fired on Cart checkout | `Cart.tsx:52` | ✅ Full purchase event with price/category metadata |
| `remove_from_cart` tracked | `Cart.tsx:45` | ✅ |
| Search events | `api/index.ts` has no `trackSearch` | ❌ Search events NOT yet fired |

### ❌ MISSING / WEAK
| Gap | Detail |
|---|---|
| **Session engagement score** | Not computed anywhere. No `engagementScore` field in Session model or Redis key |
| **Category affinity score** | Not computed. `viewed:${sessionId}` stores productIds but category mapping is never derived |
| **Purchase intent probability** | Not computed. No heuristic or score stored per session |
| **Search events not fired** | `SearchResults.tsx` and `Navbar` search do not call `trackEvent('search', ...)` |

---

## 2. Dynamic Pricing Model

### ✅ FULLY IMPLEMENTED
| Feature | File | Notes |
|---|---|---|
| Pricing engine with `calculate()` | `pricingEngine.js` | Full rule-based engine |
| Low stock urgency (+12% / +22%) | `pricingEngine.js:15-17`, `:42-45` | `stock <= 5` and `stock <= 3` rules |
| High demand velocity pricing (+8% / +15%) | `pricingEngine.js:21-27` | Uses `views:15m:${id}` from Redis |
| A/B variant (control = base price) | `pricingEngine.js:30-33` | Session variant respected |
| Competitor match discount (-5%) | `pricingEngine.js:36-38` | `product.id % 5 === 0` rule |
| Business rule floor/ceiling | `pricingEngine.js:48-50` | `>= mrp*0.7` and `<= mrp` enforced |
| Discount % computed | `pricingEngine.js:52` | `(mrp - price) / mrp * 100` |
| `reason` field returned | `pricingEngine.js:12,17,23...` | All rules set a reason string |
| `GET /api/price` endpoint | `price.js` | Full with Redis cache, PriceHistory log, session update |
| Price cached in Redis (30s TTL) | `price.js:44-50` | `price:${productId}` key |
| PriceHistory logged to MongoDB | `price.js:61-65` | Every price check creates a history entry |
| Price displayed with MRP strikethrough | `ProductDetail.tsx:303-309` | Shows live price + MRP + discount % |
| `priceReason` shown in UI | `ProductDetail.tsx:312-323` | "Why this price?" box with full detail |
| `PriceBadge` component | `components/PriceBadge.tsx` | Renders colored badge for reason |
| Price polled every 30s | `ProductDetail.tsx:132-147` | Auto-updates with flash animation |
| Price flash animation on change | `ProductDetail.tsx:117-120,310` | Yellow highlight + "⚡ Price just updated!" |
| `calculateWithRedis()` wired | `price.js:42` | Route properly uses the async version |

### ❌ MISSING / WEAK
| Gap | Detail |
|---|---|
| **User segment willingness-to-pay** | No segment logic. No `value_seeker`/`standard`/`premium_intent` label exists anywhere |
| **Inventory restocking signal** | No `restockingTimeline` field or logic — only raw stock count |
| **Price reason NOT shown for marketplace products** | Amazon/Flipkart products return hardcoded `priceReason: 'Standard Price'` from `products.js:94` — no engine is called |

---

## 3. Session-Aware Recommendation System

### ✅ FULLY IMPLEMENTED
| Feature | File | Notes |
|---|---|---|
| `GET /api/recommend` endpoint | `recommend.js` | Wired to `recommendService.js` |
| Redis session-viewed history | `recommendService.js:29-37` | Reads `viewed:${sessionId}` list |
| Same-category recommendations | `recommendService.js:16-26` | Sorted by `viewCount` desc |
| Trending fallback | `recommendService.js:40-50` | Top `viewCount` products |
| Random cold-start fallback | `recommendService.js:53-57` | Random shuffle as last resort |
| Frontend calls `/api/recommend` | `ProductDetail.tsx:152-158` | ✅ Properly wired, displays results |
| `RecommendationRow` component | `components/RecommendationRow.tsx` | Rendered in ProductDetail & Cart |
| Cart also shows recommendations | `Cart.tsx:31-38, 165` | "Complete Your Order" row |

### ❌ MISSING / WEAK
| Gap | Detail |
|---|---|
| **No collaborative filtering** | No co-view/co-cart/co-purchase item-item matrix. Only content-based (category) + popularity |
| **Contextual cold-start** | Falls back to pure random shuffle. Should use device type, time of day, or top anonymous category |
| **Marketplace product recommendations** | `ProductDetail.tsx:150-151` — recommendations skipped entirely for `amz_` / `fk_` prefixed products |
| **Recommendation count limit** | Only fetches local MongoDB products; no marketplace products recommended |

---

## 4. A/B Testing Framework

### ✅ FULLY IMPLEMENTED
| Feature | File | Notes |
|---|---|---|
| Deterministic control/treatment assignment | `abService.js:17-19` | Hash-based; consistent for same userId |
| Variant cached in Redis 7 days | `abService.js:22` | Per-user key `ab:${userId}` |
| Variant persisted to Session | `abService.js:26-33` | `Session.abVariant` field |
| `GET /api/ab/assign` endpoint | `ab.js` | Route works |
| Per-variant conversion rate analytics | `analyticsService.js:38-66` | MongoDB aggregation via `$lookup sessions` |
| Per-variant AOV analytics | `analyticsService.js:69-102` | Session-joined purchase aggregation |
| Revenue per session computable | `Dashboard.tsx:112` | `CR × AOV / 100` derived in frontend |
| A/B bar chart in Dashboard | `Dashboard.tsx:231-241` | Recharts `BarChart` |
| "Variant B Wins" / "Control Leads" badge | `Dashboard.tsx:214-217` | Trophy icon with dynamic copy |

### ❌ MISSING / WEAK
| Gap | Detail |
|---|---|
| **No statistical significance** | Just compares two numbers. No p-value, z-score, or chi-square computation anywhere |
| **Multi-experiment support** | Hardcoded `control`/`treatment`. No experiment name/key. No second experiment possible |
| **A/B variant not applied on frontend** | `fetchABVariant()` exists in `api/index.ts:76` but is never called anywhere in the app |

---

## 5. Fairness and Transparency

### ✅ PRESENT (PARTIAL)
| Feature | File | Notes |
|---|---|---|
| `reason` field computed by engine | `pricingEngine.js` | All decisions have a human-readable reason |
| "Why this price?" box in UI | `ProductDetail.tsx:312-323` | Visible, polished section |
| `PriceBadge` shows reason label | `components/PriceBadge.tsx` | Orange/red/blue labels |
| No explicit demographic discrimination | `pricingEngine.js` | Uses only: stock, views, product.id, abVariant |

### ❌ MISSING / WEAK
| Gap | Detail |
|---|---|
| **No fairness audit log / endpoint** | No API or dashboard panel listing which factors were used and which were excluded |
| **No "Fair Pricing Principles" note** | Dashboard has no transparency statement |
| **City data collected but not audited** | `track.js` collects `city` in events; no documentation that it is NOT used in pricing |

---

## 6. Demo Visibility Gaps (Judge-Perspective)

| Feature | Visible? | Gap |
|---|---|---|
| Live events feed | ✅ Dashboard has SSE feed | Works |
| Engagement score | ❌ Not computed, not shown | Missing |
| Category affinity | ❌ Not computed, not shown | Missing |
| Purchase intent probability | ❌ Not computed, not shown | Missing |
| Dynamic pricing reason | ✅ "Why this price?" box in ProductDetail | Works for local products only |
| Recommendations | ✅ `RecommendationRow` in ProductDetail & Cart | Missing for marketplace products |
| A/B significance | ❌ Just two numbers compared, no p-value shown | Missing |
| Fairness/transparency notes | ❌ No dashboard panel at all | Missing |

---

## 7. Recommended Priority Order

### 🔴 HIGH PRIORITY (Big visibility/score impact, moderate effort)
1. **Session features (engagement score + category affinity + purchase intent)** — Computable from existing event data; just needs logic in `track.js` + Redis + dashboard UI
2. **Statistical significance for A/B test** — Simple z-test formula, add to `analyticsService.js` + show in Dashboard
3. **User segment willingness-to-pay** — Add segment label to `pricingEngine.js`, expose in price API response
4. **Fairness audit panel in Dashboard** — Static + dynamic section showing which factors are/aren't used

### 🟡 MEDIUM PRIORITY (Visible improvement, low effort)
5. **Search event tracking** — Add `trackEvent('search', ...)` in SearchResults and Navbar
6. **Collaborative filtering (item-item co-view)** — Compute co-view matrix from existing Event collection, blend into `recommendService.js`
7. **Contextual cold-start** — Use time-of-day + device from request context for anonymous sessions

### 🟢 LOW PRIORITY (Nice-to-have)
8. **Marketplace product recommendations** — Wire recommend API for `amz_`/`fk_` products
9. **A/B variant applied on frontend** — Call `fetchABVariant()` and store variant, use for UI experiments
10. **Multi-experiment support** — Refactor `abService.js` to support experiment keys
