#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};
use types::Outcome;

// ─── Helper: deploy a mock SEP-41 token and mint to address ──────────────────

fn create_token<'a>(env: &Env, admin: &Address) -> (Address, token::Client<'a>) {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = token::Client::new(env, &token_id.address());
    (token_id.address(), token_client)
}

// ─── Helper: deploy prediction market contract ────────────────────────────────

fn setup() -> (Env, PredictionMarketClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (token_id, token_client) = create_token(&env, &admin);

    // Mint 10_000 USDC (in stroops) to user
    token_client.mint(&user, &10_000_i128);

    // Deploy contract
    let contract_id = env.register(PredictionMarket, ());
    let client = PredictionMarketClient::new(&env, &contract_id);

    // Initialize
    client.initialize(&admin, &token_id);

    (env, client, admin, user, token_id)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    let (_env, client, admin, _user, token_id) = setup();
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_token(), token_id);
    assert_eq!(client.get_market_count(), 0);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize() {
    let (env, client, admin, _user, token_id) = setup();
    // Second init should panic
    client.initialize(&admin, &token_id);
    let _ = env; // suppress unused warning
}

#[test]
fn test_create_market() {
    let (env, client, _admin, _user, _token) = setup();
    env.ledger().set_timestamp(1000);

    let question = String::from_str(&env, "Will BTC hit $100k?");
    let id = client.create_market(&question, &2000u64);

    assert_eq!(id, 0u64);
    assert_eq!(client.get_market_count(), 1u64);

    let market = client.get_market(&id);
    assert_eq!(market.id, 0u64);
    assert!(!market.resolved);
    assert_eq!(market.yes_total, 0i128);
    assert_eq!(market.no_total, 0i128);
}

#[test]
#[should_panic(expected = "end_time must be in the future")]
fn test_create_market_past_end_time() {
    let (env, client, _admin, _user, _token) = setup();
    env.ledger().set_timestamp(5000);
    let question = String::from_str(&env, "Old market?");
    client.create_market(&question, &1000u64); // end_time < now
}

#[test]
fn test_place_bet_yes() {
    let (env, client, _admin, user, _token) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "Will ETH flip BTC?");
    let market_id = client.create_market(&question, &1000u64);

    client.place_bet(&market_id, &user, &Outcome::Yes, &500i128);

    let market = client.get_market(&market_id);
    assert_eq!(market.yes_total, 500i128);
    assert_eq!(market.no_total, 0i128);
    assert_eq!(market.total_bets, 1u32);

    let bet = client.get_bet(&market_id, &user);
    assert_eq!(bet.amount, 500i128);
    assert!(!bet.claimed);
}

#[test]
fn test_place_bet_adds_to_existing() {
    let (env, client, _admin, user, _token) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "ETH > BTC?");
    let market_id = client.create_market(&question, &1000u64);

    client.place_bet(&market_id, &user, &Outcome::Yes, &200i128);
    client.place_bet(&market_id, &user, &Outcome::Yes, &300i128);

    let bet = client.get_bet(&market_id, &user);
    assert_eq!(bet.amount, 500i128);
    let market = client.get_market(&market_id);
    assert_eq!(market.total_bets, 1u32); // still 1 unique bettor
}

#[test]
#[should_panic(expected = "cannot change bet side")]
fn test_cannot_change_bet_side() {
    let (env, client, _admin, user, _token) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "Can you switch?");
    let market_id = client.create_market(&question, &1000u64);

    client.place_bet(&market_id, &user, &Outcome::Yes, &100i128);
    client.place_bet(&market_id, &user, &Outcome::No, &100i128); // must panic
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_zero_bet_rejected() {
    let (env, client, _admin, user, _token) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "Zero test?");
    let market_id = client.create_market(&question, &1000u64);
    client.place_bet(&market_id, &user, &Outcome::Yes, &0i128);
}

#[test]
fn test_resolve_and_claim_winner() {
    let (env, client, admin, user, token_id) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "Will Stellar moon?");
    let market_id = client.create_market(&question, &1000u64);

    // User bets YES: 1000 stroops
    client.place_bet(&market_id, &user, &Outcome::Yes, &1000i128);

    // Fast-forward past end_time
    env.ledger().set_timestamp(1001);

    // Admin resolves YES
    client.resolve_market(&market_id, &Outcome::Yes);

    let market = client.get_market(&market_id);
    assert!(market.resolved);

    // User claims reward — only YES pool = 1000, total = 1000 → reward = 1000
    let reward = client.claim_reward(&market_id, &user);
    assert_eq!(reward, 1000i128);

    // Verify token balance restored
    let token_client = token::Client::new(&env, &token_id);
    // User started with 10_000, bet 1000, got 1000 back → still 10_000 net
    // (They lost nothing because they were the only bettor)
    assert_eq!(token_client.balance(&user), 10_000i128);
}

#[test]
fn test_claim_loser_returns_zero() {
    let (env, client, _admin, user, _token) = setup();
    let user2 = Address::generate(&env);
    // Mint tokens to user2
    let token_client = token::Client::new(&env, &_token);
    token_client.mint(&user2, &5000i128);

    env.ledger().set_timestamp(100);
    let question = String::from_str(&env, "YES vs NO battle");
    let market_id = client.create_market(&question, &1000u64);

    client.place_bet(&market_id, &user, &Outcome::Yes, &500i128);
    client.place_bet(&market_id, &user2, &Outcome::No, &500i128);

    env.ledger().set_timestamp(1001);
    client.resolve_market(&market_id, &Outcome::Yes);

    // Loser claims
    let reward = client.claim_reward(&market_id, &user2);
    assert_eq!(reward, 0i128);
}

#[test]
fn test_proportional_payout() {
    let (env, client, _admin, user, _token) = setup();
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let token_client = token::Client::new(&env, &_token);
    token_client.mint(&user2, &5000i128);
    token_client.mint(&user3, &5000i128);

    env.ledger().set_timestamp(100);
    let question = String::from_str(&env, "Proportional test");
    let market_id = client.create_market(&question, &1000u64);

    // YES pool: 3000 (user1: 1000, user2: 2000), NO pool: 1000 (user3)
    client.place_bet(&market_id, &user, &Outcome::Yes, &1000i128);
    client.place_bet(&market_id, &user2, &Outcome::Yes, &2000i128);
    client.place_bet(&market_id, &user3, &Outcome::No, &1000i128);

    env.ledger().set_timestamp(1001);
    client.resolve_market(&market_id, &Outcome::Yes);

    // Total = 4000, YES pool = 3000
    // user1: (1000/3000)*4000 = 1333
    let r1 = client.claim_reward(&market_id, &user);
    assert_eq!(r1, 1333i128);

    // user2: (2000/3000)*4000 = 2666
    let r2 = client.claim_reward(&market_id, &user2);
    assert_eq!(r2, 2666i128);
}

#[test]
#[should_panic(expected = "reward already claimed")]
fn test_double_claim_prevented() {
    let (env, client, _admin, user, _token) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "Double claim test");
    let market_id = client.create_market(&question, &1000u64);
    client.place_bet(&market_id, &user, &Outcome::Yes, &1000i128);

    env.ledger().set_timestamp(1001);
    client.resolve_market(&market_id, &Outcome::Yes);

    client.claim_reward(&market_id, &user);
    client.claim_reward(&market_id, &user); // must panic
}

#[test]
#[should_panic(expected = "market has ended")]
fn test_bet_after_end_rejected() {
    let (env, client, _admin, user, _token) = setup();
    env.ledger().set_timestamp(100);

    let question = String::from_str(&env, "Late bet test");
    let market_id = client.create_market(&question, &500u64);

    env.ledger().set_timestamp(501); // past end
    client.place_bet(&market_id, &user, &Outcome::Yes, &100i128);
}
