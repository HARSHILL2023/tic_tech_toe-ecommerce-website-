import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema({
  productId: { type: Number, required: true, index: true },
  price: { type: Number, required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);
export default PriceHistory;
