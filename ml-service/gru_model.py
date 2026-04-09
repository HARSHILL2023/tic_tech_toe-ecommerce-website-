import torch
import torch.nn as nn
import numpy as np
from database import get_db

class GRU4Rec(nn.Module):
    def __init__(self, num_items: int, embedding_dim: int = 64, hidden_size: int = 128, num_layers: int = 1):
        super().__init__()
        self.embedding = nn.Embedding(num_items + 1, embedding_dim, padding_idx=0)
        self.gru = nn.GRU(embedding_dim, hidden_size, num_layers, batch_first=True)
        self.output_layer = nn.Linear(hidden_size, num_items)

    def forward(self, x):
        emb = self.embedding(x)
        out, _ = self.gru(emb)
        return self.output_layer(out[:, -1, :])

class SessionRecommender:
    def __init__(self):
        self.model = None
        self.product_index = {}   # product_id (str) -> int index
        self.index_product = {}   # int index -> product_id (str)
        self.trained = False

    def build_index(self):
        db = get_db()
        self.product_index = {}
        self.index_product = {}
        products = list(db.products.find({}, {"_id": 1}))
        for i, p in enumerate(products, 1):
            pid = str(p["_id"])
            self.product_index[pid] = i
            self.index_product[i] = pid

    def train(self, epochs: int = 5):
        self.build_index()
        num_items = len(self.product_index)
        if num_items < 2:
            return

        db = get_db()
        # Build training sequences from events
        sessions = {}
        events = list(db.events.find(
            {"eventType": "page_view", "productId": {"$ne": None}},
            {"sessionId": 1, "productId": 1, "timestamp": 1}
        ).sort("timestamp", 1).limit(50000))

        for e in events:
            sid = str(e.get("sessionId", ""))
            pid = str(e.get("productId", ""))
            if pid in self.product_index and sid:
                sessions.setdefault(sid, []).append(self.product_index[pid])

        sequences = [s for s in sessions.values() if len(s) >= 2]
        if len(sequences) < 10:
            self.trained = False
            return

        self.model = GRU4Rec(num_items)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        criterion = nn.CrossEntropyLoss()

        for epoch in range(epochs):
            total_loss = 0
            for seq in sequences:
                if len(seq) < 2:
                    continue
                x = torch.tensor([seq[:-1]], dtype=torch.long)
                y = torch.tensor([seq[-1] - 1], dtype=torch.long)
                optimizer.zero_grad()
                output = self.model(x)
                loss = criterion(output, y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

        self.trained = True

    def recommend(self, session_history: list[str], top_k: int = 5) -> list[str]:
        if not self.trained or self.model is None:
            return []
        indexed = [self.product_index[p] for p in session_history if p in self.product_index]
        if not indexed:
            return []
        x = torch.tensor([indexed[-10:]], dtype=torch.long)
        with torch.no_grad():
            scores = self.model(x).squeeze().numpy()
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [self.index_product[i + 1] for i in top_indices if (i + 1) in self.index_product]

session_recommender = SessionRecommender()
