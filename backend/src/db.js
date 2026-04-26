/**
 * SQLite database layer using Node.js built-in 'node:sqlite'
 * (available since Node.js 22.5.0 — stable in v24).
 * Zero external dependencies, no native compilation required.
 */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'stellarbet.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    initSchema();
  }
  return db;
}

function initSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS markets (
      id          INTEGER PRIMARY KEY,
      question    TEXT    NOT NULL,
      category    TEXT    NOT NULL DEFAULT 'General',
      end_time    INTEGER NOT NULL,
      created_by  TEXT    NOT NULL DEFAULT 'admin',
      resolved    INTEGER NOT NULL DEFAULT 0,
      outcome     TEXT    NOT NULL DEFAULT 'Unresolved',
      yes_total   TEXT    NOT NULL DEFAULT '0',
      no_total    TEXT    NOT NULL DEFAULT '0',
      total_bets  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS bets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash     TEXT    NOT NULL UNIQUE,
      market_id   INTEGER NOT NULL REFERENCES markets(id),
      bettor      TEXT    NOT NULL,
      outcome     TEXT    NOT NULL,
      amount      TEXT    NOT NULL,
      timestamp   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
    CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
  `);
}

// ─── Market helpers ───────────────────────────────────────────────────────────

export function upsertMarket(market) {
  getDb().prepare(`
    INSERT INTO markets (id, question, category, end_time, created_by, resolved, outcome, yes_total, no_total, total_bets)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      resolved   = excluded.resolved,
      outcome    = excluded.outcome,
      yes_total  = excluded.yes_total,
      no_total   = excluded.no_total,
      total_bets = excluded.total_bets
  `).run(
    market.id, market.question, market.category, market.end_time,
    market.created_by, market.resolved, market.outcome,
    market.yes_total, market.no_total, market.total_bets
  );
}

export function getAllMarkets() {
  return getDb().prepare('SELECT * FROM markets ORDER BY created_at DESC').all();
}

export function getMarketById(id) {
  return getDb().prepare('SELECT * FROM markets WHERE id = ?').get(id);
}

export function updateMarketResolution(id, outcome, yes_total, no_total) {
  getDb().prepare(
    'UPDATE markets SET resolved=1, outcome=?, yes_total=?, no_total=? WHERE id=?'
  ).run(outcome, String(yes_total), String(no_total), id);
}

// ─── Bet helpers ──────────────────────────────────────────────────────────────

export function insertBet(bet) {
  getDb().prepare(`
    INSERT OR IGNORE INTO bets (tx_hash, market_id, bettor, outcome, amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(bet.tx_hash, bet.market_id, bet.bettor, bet.outcome, bet.amount);
}

export function getBetsByAddress(address) {
  return getDb().prepare(`
    SELECT b.*, m.question, m.resolved, m.outcome as market_outcome
    FROM bets b
    JOIN markets m ON b.market_id = m.id
    WHERE b.bettor = ?
    ORDER BY b.timestamp DESC
  `).all(address);
}

export function getLeaderboard(limit = 20) {
  return getDb().prepare(`
    SELECT
      b.bettor,
      COUNT(*) as total_bets,
      SUM(CAST(b.amount AS INTEGER)) as total_wagered
    FROM bets b
    JOIN markets m ON b.market_id = m.id
    WHERE m.resolved = 1
    GROUP BY b.bettor
    ORDER BY total_wagered DESC
    LIMIT ?
  `).all(limit);
}
