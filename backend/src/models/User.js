import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: false }, // optional now since Google users won't have it
  googleId:     { type: String, unique: true, sparse: true },
  avatarUrl:    { type: String, default: null },
  provider:     { type: String, default: 'email' },
  role:         { type: String, default: 'user' },
  createdAt:    { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
