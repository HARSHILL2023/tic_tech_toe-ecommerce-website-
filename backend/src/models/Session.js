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
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
