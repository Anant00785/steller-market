#![no_std]

mod types;
mod test;

use soroban_sdk::{
    contract, contractimpl, token, Address, Env, String,
};
use types::{Bet, DataKey, Market, Outcome};

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    // ─────────────────────────────────────────────
    // Admin setup
    // ─────────────────────────────────────────────

    /// Called once at deployment. Sets the admin and the betting token.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::MarketCount, &0u64);
    }

    // ─────────────────────────────────────────────
    // Market management
    // ─────────────────────────────────────────────

    /// Admin creates a new prediction market.
    pub fn create_market(env: Env, question: String, end_time: u64) -> u64 {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let now = env.ledger().timestamp();
        if end_time <= now {
            panic!("end_time must be in the future");
        }

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::MarketCount)
            .unwrap_or(0);
        let market_id = count;

        let market = Market {
            id: market_id,
            question,
            end_time,
            resolved: false,
            outcome: Outcome::Unresolved,
            yes_total: 0,
            no_total: 0,
            total_bets: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Market(market_id), &market);
        env.storage()
            .instance()
            .set(&DataKey::MarketCount, &(count + 1));

        market_id
    }

    /// Admin resolves a market with the winning outcome.
    pub fn resolve_market(env: Env, market_id: u64, outcome: Outcome) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if matches!(outcome, Outcome::Unresolved) {
            panic!("cannot resolve with Unresolved");
        }

        let mut market: Market = env
            .storage()
            .persistent()
            .get(&DataKey::Market(market_id))
            .expect("market not found");

        if market.resolved {
            panic!("already resolved");
        }

        let now = env.ledger().timestamp();
        if now < market.end_time {
            panic!("market has not ended yet");
        }

        market.resolved = true;
        market.outcome = outcome;

        env.storage()
            .persistent()
            .set(&DataKey::Market(market_id), &market);
    }

    // ─────────────────────────────────────────────
    // Betting
    // ─────────────────────────────────────────────

    /// Place a YES or NO bet. Transfers `amount` tokens from bettor to contract.
    pub fn place_bet(env: Env, market_id: u64, bettor: Address, outcome: Outcome, amount: i128) {
        bettor.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }
        if matches!(outcome, Outcome::Unresolved) {
            panic!("must bet YES or NO");
        }

        let mut market: Market = env
            .storage()
            .persistent()
            .get(&DataKey::Market(market_id))
            .expect("market not found");

        if market.resolved {
            panic!("market already resolved");
        }
        let now = env.ledger().timestamp();
        if now >= market.end_time {
            panic!("market has ended");
        }

        // If bettor already has a bet, increase it
        let existing: Option<Bet> = env
            .storage()
            .persistent()
            .get(&DataKey::Bet(market_id, bettor.clone()));

        let bet = if let Some(mut b) = existing {
            if b.outcome != outcome {
                panic!("cannot change bet side");
            }
            b.amount += amount;
            b
        } else {
            market.total_bets += 1;
            Bet {
                amount,
                outcome: outcome.clone(),
                claimed: false,
            }
        };

        // Update pool totals
        match outcome {
            Outcome::Yes => market.yes_total += amount,
            Outcome::No => market.no_total += amount,
            Outcome::Unresolved => unreachable!(),
        }

        // Transfer tokens from bettor → contract
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&bettor, &env.current_contract_address(), &amount);

        // Persist updated state (AFTER transfer, not before, to prevent reentrancy)
        env.storage()
            .persistent()
            .set(&DataKey::Bet(market_id, bettor), &bet);
        env.storage()
            .persistent()
            .set(&DataKey::Market(market_id), &market);
    }

    // ─────────────────────────────────────────────
    // Payouts
    // ─────────────────────────────────────────────

    /// Claim proportional reward after market resolution.
    pub fn claim_reward(env: Env, market_id: u64, bettor: Address) -> i128 {
        bettor.require_auth();

        let market: Market = env
            .storage()
            .persistent()
            .get(&DataKey::Market(market_id))
            .expect("market not found");

        if !market.resolved {
            panic!("market not resolved yet");
        }

        let mut bet: Bet = env
            .storage()
            .persistent()
            .get(&DataKey::Bet(market_id, bettor.clone()))
            .expect("no bet found for this address");

        if bet.claimed {
            panic!("reward already claimed");
        }

        if bet.outcome != market.outcome {
            // Lost — mark as claimed so they can't retry
            bet.claimed = true;
            env.storage()
                .persistent()
                .set(&DataKey::Bet(market_id, bettor), &bet);
            return 0;
        }

        // Proportional payout: reward = (bet / winning_pool) * total_pool
        let winning_pool = match market.outcome {
            Outcome::Yes => market.yes_total,
            Outcome::No => market.no_total,
            Outcome::Unresolved => panic!("unresolved"),
        };
        let total_pool = market.yes_total + market.no_total;

        // Use i128 arithmetic; multiply first to avoid precision loss
        let reward = (bet.amount * total_pool) / winning_pool;

        bet.claimed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Bet(market_id, bettor.clone()), &bet);

        // Transfer tokens: contract → bettor
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&env.current_contract_address(), &bettor, &reward);

        reward
    }

    // ─────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────

    pub fn get_market(env: Env, market_id: u64) -> Market {
        env.storage()
            .persistent()
            .get(&DataKey::Market(market_id))
            .expect("market not found")
    }

    pub fn get_bet(env: Env, market_id: u64, bettor: Address) -> Bet {
        env.storage()
            .persistent()
            .get(&DataKey::Bet(market_id, bettor))
            .expect("no bet found")
    }

    pub fn get_market_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::MarketCount)
            .unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }
}
