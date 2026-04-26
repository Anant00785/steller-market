import express from 'express';
import { getBetsByAddress, getLeaderboard } from '../db.js';

const router = express.Router();

// GET /api/bets/:address — portfolio for a wallet
router.get('/:address', (req, res) => {
  try {
    const { address } = req.params;
    const bets = getBetsByAddress(address);

    const enriched = bets.map(b => {
      const won =
        b.resolved &&
        b.outcome === b.market_outcome &&
        b.market_outcome !== 'Unresolved';
      const lost = b.resolved && b.outcome !== b.market_outcome;
      return { ...b, won, lost, pending: !b.resolved };
    });

    const totalWagered = enriched.reduce((s, b) => s + BigInt(b.amount), 0n);

    res.json({
      address,
      bets: enriched,
      stats: {
        total_bets: enriched.length,
        wins: enriched.filter(b => b.won).length,
        losses: enriched.filter(b => b.lost).length,
        pending: enriched.filter(b => b.pending).length,
        total_wagered: totalWagered.toString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bets/leaderboard — top bettors
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const leaders = getLeaderboard(limit);
    res.json({ leaderboard: leaders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
