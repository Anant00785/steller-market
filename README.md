# ⭐ StellarBet — Decentralized Prediction Market on Stellar

A full-stack DeFi prediction market where users create markets, place YES/NO bets with USDC, and claim proportional rewards — all governed by **Soroban smart contracts** on **Stellar Testnet**.

---

## Architecture

```
bloackchain/
├── contracts/prediction_market/   # Soroban smart contract (Rust)
├── backend/                        # Node.js/Express API + SQLite oracle
└── frontend/                       # Next.js 14 dApp with Freighter wallet
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Rust + wasm32 target | `rustup target add wasm32v1-none` |
| Stellar CLI | `cargo install stellar-cli` |
| Node.js | v22+ (built-in sqlite, v24 recommended) |
| Freighter wallet | Chrome/Firefox browser extension |

---

## 1. Smart Contract Setup (WSL2 recommended on Windows)

```bash
# Install Stellar CLI
cargo install stellar-cli --features opt

# Add wasm target
rustup target add wasm32v1-none

# Build the contract
cd contracts
cargo build --target wasm32v1-none --release

# Run unit tests
cargo test

# Deploy to Testnet (creates a keypair automatically)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/prediction_market.wasm \
  --network testnet \
  --source-account alice

# Initialize the contract (replace CONTRACT_ID, ADMIN, TOKEN)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source-account alice \
  --network testnet \
  -- initialize \
    --admin $ADMIN_ADDRESS \
    --token $USDC_TOKEN_ADDRESS
```

---

## 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in: CONTRACT_ID, ADMIN_SECRET_KEY, JWT_SECRET

npm run dev    # starts on http://localhost:4000
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/markets` | All markets with live odds |
| `GET` | `/api/markets/:id` | Single market |
| `POST` | `/api/markets` | Create market (admin JWT) |
| `POST` | `/api/markets/:id/resolve` | Resolve market (admin JWT) |
| `POST` | `/api/markets/token` | Get admin JWT |
| `GET` | `/api/bets/:address` | Portfolio for address |
| `GET` | `/api/bets/leaderboard` | Top bettors |

---

## 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_CONTRACT_ID

npm run dev    # starts on http://localhost:3000
```

### Pages

| Route | Description |
|---|---|
| `/` | Home — live market grid with odds |
| `/markets/[id]` | Market detail + bet UI |
| `/portfolio` | User bets, claimable rewards |
| `/admin` | Create markets, oracle resolution |

---

## 4. How it Works

1. **Admin creates a market** → calls `create_market` on-chain, stores metadata in SQLite
2. **User connects Freighter** → gets address from the extension
3. **User places a bet** → `place_bet` Soroban tx signed by Freighter → USDC locked in contract
4. **Market ends** → admin (or auto-oracle) calls `resolve_market` on-chain
5. **Winner claims reward** → `claim_reward` tx → proportional USDC payout, `claimed=true` prevents double-dip

---

## Security

- `bettor.require_auth()` on every bet — only the owner can bet on their behalf
- `claimed: bool` flag in persistent storage prevents double claiming
- `resolve_market` is admin-only, checked against stored admin address
- No reentrancy: state mutations happen before token transfers
- Backend admin routes are JWT-protected

---

## Contract Deployment Checklist

- [ ] `cargo test` — all unit tests pass
- [ ] `stellar contract deploy` → save `CONTRACT_ID`
- [ ] `initialize` with admin address + USDC token address
- [ ] Set `CONTRACT_ID` in `backend/.env`
- [ ] Set `NEXT_PUBLIC_CONTRACT_ID` in `frontend/.env.local`
- [ ] Backend running on port 4000
- [ ] Frontend running on port 3000
