import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import priceRouter from './routes/price.js';
import trackRouter from './routes/track.js';
import recommendRouter from './routes/recommend.js';
import abRouter from './routes/ab.js';
import dashboardRouter from './routes/dashboard.js';
import productsRouter from './routes/products.js';
import chatRouter from './routes/chat.js';
import imagesRouter from './routes/images.js';
import searchRouter from './routes/search.js';
import homeFeedRouter from './routes/homeFeed.js';
import passport from 'passport';
import flipkartRouter from './routes/flipkart.js';
import marketplaceRouter from './routes/marketplace.js';
import authRouter from './routes/auth.js';

const app = express();

// Trust reverse proxy for HTTPS via X-Forwarded-Proto (Required for Render & Google OAuth)
app.set('trust proxy', 1);

// ── CORS ────────────────────────────────────────────────────────────────────
// Parse comma-separated origins from env (supports both CORS_ORIGIN and FRONTEND_URL)
const allowedOrigins = [
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
].map((o) => o.trim()).filter(Boolean);

const uniqueOrigins = [...new Set(allowedOrigins)];


app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl, mobile, health checks
      // Allow all localhost (any port) + Vercel/Render production
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        uniqueOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ── Request Logger ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'PriceIQ API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/price', priceRouter);
app.use('/api/track', trackRouter);
app.use('/api/recommend', recommendRouter);
app.use('/api/ab', abRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/images', imagesRouter);
app.use('/api/search', searchRouter);
app.use('/api/home-feed', homeFeedRouter);
app.use('/api/flipkart', flipkartRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/auth', authRouter);

// Alias for price-history chart (mounted on products router)
// GET /api/price-history → products router handles it
app.get('/api/price-history', (req, res, next) => {
  req.url = '/price-history/chart?' + new URLSearchParams(req.query).toString();
  productsRouter(req, res, next);
});

// SSE live events is under /api/events/live in products router
// Re-export via top-level alias
app.get('/api/events/live', (req, res, next) => {
  req.url = '/events/live';
  productsRouter(req, res, next);
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
