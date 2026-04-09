from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
_client = None

def get_db():
    global _client
    if _client is None:
        _client = MongoClient(os.getenv("MONGO_URI"))
    return _client["priceiq"]  # use same DB name as Node.js backend
