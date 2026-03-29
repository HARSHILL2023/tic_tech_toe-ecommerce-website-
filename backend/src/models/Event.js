import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  userId: { type: String },
  eventType: {
    type: String,
    enum: ['page_view', 'search', 'add_to_cart', 'wishlist_add', 'purchase', 'remove_from_cart'],
    required: true,
  },
  // productId supports both numeric local IDs and string amz_ Amazon IDs
  productId: { type: mongoose.Schema.Types.Mixed, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
  device: { type: String },
  city: { type: String },
});

const Event = mongoose.model('Event', eventSchema);
export default Event;
