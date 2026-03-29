import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const router = Router();
const JWT_SECRET  = process.env.JWT_SECRET || 'priceiq_dev_secret_change_in_production';
const JWT_EXPIRES = '7d';

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://tic-tech-toe-ecommerce-website.vercel.app' 
  : 'http://localhost:8080';

const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://tic-tech-toe-ecommerce-website.onrender.com/api/auth/google/callback'
  : '/api/auth/google/callback';

function signToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
}

// ── Google Strategy ─────────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id_for_dev_boot',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret_for_dev_boot',
    callbackURL: CALLBACK_URL,
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value.toLowerCase() : null;
      if (!email) return done(new Error('No email found from Google profile'), null);

      let user = await User.findOne({ 
        $or: [{ googleId: profile.id }, { email }]
      });

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          avatarUrl: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
          provider: 'google'
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        user.provider = 'google';
        if (!user.avatarUrl && profile.photos && profile.photos.length > 0) {
          user.avatarUrl = profile.photos[0].value;
        }
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// ── GET /api/auth/google ──────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=GoogleAuthFailed`, session: false }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || name.trim().length < 2)
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Unique check
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });

    // Hash + create
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email, passwordHash });

    const token = signToken(user);
    return res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'User not found' });

    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('Me error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
