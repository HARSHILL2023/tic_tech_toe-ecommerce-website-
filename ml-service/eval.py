import numpy as np
from database import get_db
from recommender import recommender as content_rec

def dcg(relevances):
    return sum(rel / np.log2(i + 2) for i, rel in enumerate(relevances))

def ndcg_at_k(recommended: list, relevant: set, k: int = 10) -> float:
    relevances = [1 if item in relevant else 0 for item in recommended[:k]]
    ideal = sorted(relevances, reverse=True)
    dcg_val = dcg(relevances)
    idcg_val = dcg(ideal)
    return dcg_val / idcg_val if idcg_val > 0 else 0.0

def evaluate_recommendations() -> dict:
    db = get_db()
    if not content_rec.trained:
        content_rec.train()

    # Build test set: for each product, what did users buy after viewing it?
    purchase_events = list(db.events.find(
        {"eventType": "purchase"},
        {"sessionId": 1, "productId": 1}
    ).limit(5000))

    view_events = list(db.events.find(
        {"eventType": "page_view"},
        {"sessionId": 1, "productId": 1}
    ).limit(10000))

    # Group: sessionId -> viewed products
    session_views = {}
    for e in view_events:
        sid = str(e.get("sessionId", ""))
        pid = str(e.get("productId", "")) if e.get("productId") else None
        if sid and pid:
            session_views.setdefault(sid, []).append(pid)

    # Group: sessionId -> purchased products
    session_purchases = {}
    for e in purchase_events:
        sid = str(e.get("sessionId", ""))
        pid = str(e.get("productId", "")) if e.get("productId") else None
        if sid and pid:
            session_purchases.setdefault(sid, set()).add(pid)

    ndcg_scores = []
    hit_count = 0
    total = 0

    for sid, viewed in session_views.items():
        purchased = session_purchases.get(sid, set())
        if not purchased or not viewed:
            continue
        seed_product = viewed[0]
        recs = content_rec.recommend(seed_product, top_k=10)
        if not recs:
            continue
        score = ndcg_at_k(recs, purchased, k=10)
        ndcg_scores.append(score)
        if any(r in purchased for r in recs):
            hit_count += 1
        total += 1

    return {
        "ndcg_at_10": round(float(np.mean(ndcg_scores)) if ndcg_scores else 0.0, 4),
        "hit_rate": round(hit_count / total if total > 0 else 0.0, 4),
        "total_sessions_evaluated": total
    }
