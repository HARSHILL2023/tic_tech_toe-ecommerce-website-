from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from recommender import recommender as content_rec
from gru_model import session_recommender
from eval import evaluate_recommendations
from database import get_db
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Training content recommender...")
    content_rec.train()
    print("Training GRU4Rec session model...")
    session_recommender.train(epochs=5)
    print("ML service ready.")
    yield

app = FastAPI(title="PriceIQ ML Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class SessionRequest(BaseModel):
    session_history: list[str]
    top_k: int = 5

@app.get("/health")
def health():
    return {"status": "ok", "content_rec_trained": content_rec.trained, "gru_trained": session_recommender.trained}

@app.get("/recommend/{product_id}")
def recommend_by_product(product_id: str, top_k: int = 5):
    recs = content_rec.recommend(product_id, top_k)
    return {"product_id": product_id, "recommendations": recs, "model": "tfidf-content"}

@app.post("/recommend/session")
def recommend_by_session(req: SessionRequest):
    recs = session_recommender.recommend(req.session_history, req.top_k)
    if not recs:
        # fallback to content-based on last viewed
        if req.session_history:
            recs = content_rec.recommend(req.session_history[-1], req.top_k)
    return {"recommendations": recs, "model": "gru4rec" if session_recommender.trained else "tfidf-fallback"}

@app.get("/price-predict")
def price_predict(product_id: str, demand_velocity: float = 0, stock: int = 100, user_segment: str = "standard"):
    uplift = 0.0
    reason = "regular_pricing"
    if demand_velocity >= 30:
        uplift += 0.15
        reason = "high_demand"
    elif demand_velocity >= 15:
        uplift += 0.08
        reason = "moderate_demand"
    if stock <= 3:
        uplift += 0.22
        reason = "critical_stock"
    elif stock <= 5:
        uplift += 0.12
        reason = "low_stock"
    if user_segment == "value_seeker":
        uplift = max(0, uplift - 0.03)
    uplift = min(uplift, 0.35)
    return {
        "product_id": product_id,
        "uplift_factor": round(uplift, 4),
        "price_reason": reason,
        "confidence": 0.85,
        "model": "rule_based_v1"
    }

@app.get("/evaluate")
def get_evaluation_metrics():
    return evaluate_recommendations()

@app.post("/train")
def train_models():
    print("MAnual training triggered via API...")
    content_rec.train()
    session_recommender.train(epochs=3)
    return {"status": "success", "message": "Models retrained successfully"}
