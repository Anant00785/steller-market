import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import marketsRouter from './routes/markets.js';
import betsRouter from './routes/bets.js';
import { startOracle } from './oracle.js';
import { getRpcHealth } from './stellar.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json());

// ─── Request logging ──────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const rpc = await getRpcHealth();
  res.json({ status: 'ok', rpc, ts: new Date().toISOString() });
});

app.use('/api/markets', marketsRouter);
app.use('/api/bets', betsRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 StellarBet backend running at http://localhost:${PORT}`);
  console.log(`   Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
  console.log(`   Contract: ${process.env.CONTRACT_ID || '(not set)'}\n`);
  startOracle();
});
