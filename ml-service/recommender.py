from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from database import get_db

class ContentRecommender:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.tfidf_matrix = None
        self.product_ids = []
        self.trained = False

    def train(self):
        db = get_db()
        products = list(db.products.find({}, {"_id": 1, "name": 1, "category": 1, "description": 1}))
        if len(products) < 2:
            return
        self.product_ids = [str(p["_id"]) for p in products]
        corpus = [f"{p.get('name','')} {p.get('category','')} {p.get('description','')}" for p in products]
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        self.trained = True

    def recommend(self, product_id: str, top_k: int = 5) -> list[str]:
        if not self.trained:
            self.train()
        if product_id not in self.product_ids:
            return []
        idx = self.product_ids.index(product_id)
        scores = cosine_similarity(self.tfidf_matrix[idx], self.tfidf_matrix).flatten()
        scores[idx] = -1  # exclude self
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [self.product_ids[i] for i in top_indices]

recommender = ContentRecommender()
