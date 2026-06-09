require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

const { connectDB }     = require('./src/config/database');
const { errorHandler }  = require('./src/middleware/errorHandler');
const routes            = require('./src/routes/index');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true }));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok', app: 'FitCore Pro API v1.0',
  mode: process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'In-Memory (testing)',
  timestamp: new Date().toISOString(),
}));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 FitCore API running → http://localhost:${PORT}`);
    console.log(`📋 Health check      → http://localhost:${PORT}/health`);
    console.log(`🔐 Mode: ${process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'In-Memory (no DB needed!)'}\n`);
  });
}

start();
process.on('unhandledRejection', (r) => { console.error('Unhandled:', r); process.exit(1); });
