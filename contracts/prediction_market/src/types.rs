use soroban_sdk::{contracttype, Address, String};

/// Outcome of a market
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Outcome {
    Yes,
    No,
    Unresolved,
}

/// A prediction market
#[contracttype]
#[derive(Clone, Debug)]
pub struct Market {
    pub id: u64,
    pub question: String,
    pub end_time: u64,       // Unix timestamp (seconds)
    pub resolved: bool,
    pub outcome: Outcome,
    pub yes_total: i128,     // Total USDC bet on YES (in stroops)
    pub no_total: i128,      // Total USDC bet on NO  (in stroops)
    pub total_bets: u32,     // Number of unique bettors
}

/// A single bet placed by a user
#[contracttype]
#[derive(Clone, Debug)]
pub struct Bet {
    pub amount: i128,
    pub outcome: Outcome,
    pub claimed: bool,
}

/// Contract storage keys
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    MarketCount,
    Market(u64),
    Bet(u64, Address),
}
