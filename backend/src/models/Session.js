import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String },
  abVariant: { type: String, enum: ['control', 'treatment'], default: 'control' },
  device: { type: String },
  city: { type: String },
  startedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now, index: true },
  isActive: { type: Boolean, default: true, index: true },
  // ── Real-time session analytics ─────────────────────────────────────────────
  engagementScore: { type: Number, default: 0 },        // weighted behavioral score
  categoryAffinity: { type: Map, of: Number, default: {} }, // e.g. { electronics: 5, fashion: 2 }
  purchaseIntentScore: { type: Number, default: 0 },    // 0–1 probability estimate
  userSegment: { type: String, default: 'standard' },   // value_seeker | standard | premium_intent
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
