# PriceIQ ML Service

## Setup
```bash
cd ml-service
pip install -r requirements.txt
cp .env.example .env  # add MONGO_URI
python seed_events.py  # seed 100K events first
uvicorn main:app --reload --port 8000
```

## Endpoints
- GET /health — model status
- GET /recommend/{product_id} — content-based recs
- POST /recommend/session — GRU4Rec session recs
- GET /price-predict?product_id=&demand_velocity=&stock=&user_segment= — price uplift
- GET /evaluate — NDCG@10 + hit rate metrics
