import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Beauty', 'Books',
      'Gaming', 'Toys', 'Automotive', 'Appliances', 'Furniture', 'Food & Grocery'
    ],
    required: true,
  },
  mrp: { type: Number, required: true },
  livePrice: { type: Number, required: true },
  basePrice: { type: Number, required: true }, // never changes — pricing engine reference
  stock: { type: Number, required: true },
  restockDays: { type: Number, default: 7 },
  rating: { type: Number, required: true },
  reviewCount: { type: Number, required: true },
  discount: { type: Number, required: true },
  priceReason: {
    type: String,
    enum: ['High Demand', 'Limited Stock', 'Competitor Match', 'Standard Price'],
    default: 'Standard Price',
  },
  demandBadge: { type: String, default: null },
  images: [{ type: String }],
  description: { type: String },
  specs: { type: Map, of: String },
  viewCount: { type: Number, default: 0 },
  cartAddCount: { type: Number, default: 0 },
  purchaseCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

const Product = mongoose.model('Product', productSchema);
export default Product;
