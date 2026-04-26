import cron from 'node-cron';
import { getAllMarkets, updateMarketResolution } from './db.js';
import { getOnChainMarket } from './stellar.js';

/**
 * Sync oracle: every 30 seconds, pull on-chain state for all active markets
 * and update the local SQLite cache. This ensures the frontend always has
 * fresh odds even between user interactions.
 */
export function startOracle() {
  console.log('[oracle] Starting market sync cron (every 30s)...');

  cron.schedule('*/30 * * * * *', async () => {
    try {
      const markets = getAllMarkets().filter(m => !m.resolved);
      if (markets.length === 0) return;

      console.log(`[oracle] Syncing ${markets.length} active market(s)...`);

      for (const market of markets) {
        const chain = await getOnChainMarket(market.id);
        if (!chain) continue;

        if (chain.resolved && market.outcome === 'Unresolved') {
          const outcomeStr =
            typeof chain.outcome === 'object'
              ? Object.keys(chain.outcome)[0]
              : String(chain.outcome);
          updateMarketResolution(
            market.id,
            outcomeStr,
            chain.yes_total,
            chain.no_total
          );
          console.log(`[oracle] Market ${market.id} resolved on-chain → ${outcomeStr}`);
        }
      }
    } catch (err) {
      console.error('[oracle] Sync error:', err.message);
    }
  });
}
