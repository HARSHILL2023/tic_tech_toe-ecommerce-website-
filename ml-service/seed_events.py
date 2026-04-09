import random, uuid
from datetime import datetime, timedelta
from database import get_db

EVENT_TYPES = ["page_view", "page_view", "page_view", "page_view",
               "add_to_cart", "add_to_cart", "wishlist_add", "purchase", "remove_from_cart"]
CATEGORIES = ["Electronics", "Fashion", "Home & Kitchen", "Sports", "Beauty", "Books"]

def seed_events(count: int = 100000):
    db = get_db()
    products = list(db.products.find({}, {"_id": 1, "category": 1, "livePrice": 1, "price": 1}))
    if not products:
        print("No products found. Run product seed first.")
        return

    users = [str(uuid.uuid4()) for _ in range(500)]
    sessions = [str(uuid.uuid4()) for _ in range(2000)]
    user_sessions = {s: random.choice(users) for s in sessions}

    now = datetime.utcnow()
    events = []
    for _ in range(count):
        product = random.choice(products)
        session_id = random.choice(sessions)
        user_id = user_sessions[session_id]
        event_type = random.choices(EVENT_TYPES, weights=[40,40,40,40,15,15,10,5,3])[0]
        
        # Determine amount (product price for purchase, 0 otherwise)
        price = product.get("livePrice") or product.get("price", 0)
        amount = price if event_type == "purchase" else 0
        
        days_ago = random.uniform(0, 30)
        timestamp = now - timedelta(days=days_ago, seconds=random.randint(0, 86400))
        
        metadata = {
            "category": product.get("category", random.choice(CATEGORIES)),
            "deviceType": random.choice(["mobile", "desktop", "tablet"]),
            "referralSource": random.choice(["google", "direct", "instagram", "whatsapp"])
        }
        
        # Add price inside metadata for purchase events
        if event_type == "purchase":
            metadata["price"] = price

        events.append({
            "eventType": event_type,
            "productId": product["_id"], # Stored as ObjectId from find()
            "sessionId": session_id,
            "userId": user_id,
            "amount": amount,
            "metadata": metadata,
            "timestamp": timestamp,
            "createdAt": timestamp
        })

    # Batch insert
    batch_size = 5000
    for i in range(0, len(events), batch_size):
        db.events.insert_many(events[i:i+batch_size])
        print(f"Inserted {min(i + batch_size, len(events))}/{count} events")

    print(f"Done. Total events seeded: {count}")

if __name__ == "__main__":
    # Clear existing events first to avoid bloat
    db = get_db()
    db.events.delete_many({})
    print("Cleared existing events.")
    seed_events(100000)
