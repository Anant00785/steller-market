import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getAllMarkets,
  getMarketById,
  upsertMarket,
  updateMarketResolution,
} from '../db.js';
import { getOnChainMarket, computeOdds, invokeContract } from '../stellar.js';
import { nativeToScVal } from '@stellar/stellar-sdk';

const router = express.Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── GET /api/markets ─────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const markets = getAllMarkets();

    // Merge live on-chain odds for each market
    const enriched = await Promise.all(
      markets.map(async m => {
        const chain = await getOnChainMarket(m.id);
        const yes = chain?.yes_total ?? m.yes_total;
        const no = chain?.no_total ?? m.no_total;
        return {
          ...m,
          yes_total: String(yes),
          no_total: String(no),
          total_bets: chain?.total_bets ?? m.total_bets,
          odds: computeOdds(yes, no),
          time_remaining: Math.max(0, m.end_time - Math.floor(Date.now() / 1000)),
        };
      })
    );

    res.json({ markets: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/markets/:id ─────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const market = getMarketById(id);
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const chain = await getOnChainMarket(id);
    const yes = chain?.yes_total ?? market.yes_total;
    const no = chain?.no_total ?? market.no_total;

    res.json({
      ...market,
      yes_total: String(yes),
      no_total: String(no),
      total_bets: chain?.total_bets ?? market.total_bets,
      odds: computeOdds(yes, no),
      time_remaining: Math.max(0, market.end_time - Math.floor(Date.now() / 1000)),
      resolved: chain?.resolved ?? Boolean(market.resolved),
      outcome: chain?.outcome ?? market.outcome,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/markets (admin only) ──────────────────────────────────────────

router.post('/', adminAuth, async (req, res) => {
  try {
    const { question, category = 'General', end_time } = req.body;
    if (!question || !end_time) {
      return res.status(400).json({ error: 'question and end_time are required' });
    }
    const endTimeSec = Math.floor(new Date(end_time).getTime() / 1000);

    // Invoke on-chain create_market
    const result = await invokeContract('create_market', [
      nativeToScVal(question, { type: 'string' }),
      nativeToScVal(BigInt(endTimeSec), { type: 'u64' }),
    ]);

    // The return value from Soroban is the new market_id (u64)
    const marketId = Number(result?.returnValue ? result.returnValue : 0);

    // Persist metadata in SQLite
    upsertMarket({
      id: marketId,
      question,
      category,
      end_time: endTimeSec,
      created_by: req.admin.sub || 'admin',
      resolved: 0,
      outcome: 'Unresolved',
      yes_total: '0',
      no_total: '0',
      total_bets: 0,
    });

    res.status(201).json({ market_id: marketId, question, end_time: endTimeSec });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/markets/:id/resolve (admin only) ───────────────────────────────

router.post('/:id/resolve', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { outcome } = req.body; // 'Yes' | 'No'

    if (!['Yes', 'No'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be "Yes" or "No"' });
    }

    // Invoke on-chain resolve_market
    const outcomeScVal =
      outcome === 'Yes'
        ? nativeToScVal({ Yes: null }, { type: 'enum' })
        : nativeToScVal({ No: null }, { type: 'enum' });

    await invokeContract('resolve_market', [
      nativeToScVal(BigInt(id), { type: 'u64' }),
      outcomeScVal,
    ]);

    // Sync SQLite
    const chain = await getOnChainMarket(id);
    updateMarketResolution(
      id,
      outcome,
      chain?.yes_total ?? 0,
      chain?.no_total ?? 0
    );

    res.json({ success: true, market_id: id, outcome });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/markets/token (get admin JWT) ─────────────────────────────────

router.post('/token', (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Wrong secret' });
  }
  const token = jwt.sign({ sub: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

export default router;
