#!/usr/bin/env bash
#
# PITBOSS — one-shot testnet deployment.
#
# Flow: build → upload market wasm → deploy oracle/treasury/factory →
#       add_reporter → create a sample market → place two opposing bets.
# Captures every address + key tx hash into deployments/testnet.json and writes
# apps/web/.env.local so the frontend points at the fresh deployment.
#
# Usage: DEPLOYER=pariah-deployer BETTOR=pariah-bettor ./scripts/deploy.sh
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
NETWORK="${NETWORK:-testnet}"
RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
HORIZON="${HORIZON:-https://horizon-testnet.stellar.org}"
PASSPHRASE="Test SDF Network ; September 2015"
DEPLOYER="${DEPLOYER:-pariah-deployer}"
BETTOR="${BETTOR:-pariah-bettor}"
# Native XLM Stellar Asset Contract on testnet.
TOKEN="${TOKEN:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
FEE_BPS="${FEE_BPS:-200}" # 2%

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ADMIN="$(stellar keys address "$DEPLOYER")"
BETTOR_ADDR="$(stellar keys address "$BETTOR")"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
latest_tx() {
  sleep 2
  curl -s "$HORIZON/accounts/$1/transactions?order=desc&limit=1" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['_embedded']['records'][0]['hash'])"
}

step "Building contracts"
stellar contract build >/dev/null
echo "  ✓ wasm ready"

step "Uploading market wasm → hash"
MARKET_WASM_HASH="$(stellar contract upload \
  --wasm target/wasm32v1-none/release/market.wasm \
  --source-account "$DEPLOYER" --network "$NETWORK" 2>/dev/null | tail -n1)"
echo "  ✓ $MARKET_WASM_HASH"

step "Deploying ORACLE"
ORACLE_ID="$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/oracle.wasm \
  --source-account "$DEPLOYER" --network "$NETWORK" \
  -- --admin "$ADMIN" 2>/dev/null | tail -n1)"
echo "  ✓ $ORACLE_ID"

step "Deploying TREASURY"
TREASURY_ID="$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/treasury.wasm \
  --source-account "$DEPLOYER" --network "$NETWORK" \
  -- --admin "$ADMIN" --token "$TOKEN" 2>/dev/null | tail -n1)"
echo "  ✓ $TREASURY_ID"

step "Deploying FACTORY (the boss)"
FACTORY_ID="$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/factory.wasm \
  --source-account "$DEPLOYER" --network "$NETWORK" \
  -- --admin "$ADMIN" --oracle "$ORACLE_ID" --treasury "$TREASURY_ID" \
     --token "$TOKEN" --market_wasm_hash "$MARKET_WASM_HASH" \
     --default_fee_bps "$FEE_BPS" 2>/dev/null | tail -n1)"
echo "  ✓ $FACTORY_ID"

step "Authorizing admin as an oracle reporter"
stellar contract invoke --id "$ORACLE_ID" --source-account "$DEPLOYER" \
  --network "$NETWORK" -- add_reporter --reporter "$ADMIN" >/dev/null 2>&1
echo "  ✓ reporter added"

step "Creating a sample market via the factory (Factory→Market deploy)"
LATEST_LEDGER="$(curl -s -X POST "$RPC_URL" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['sequence'])")"
CLOSE_LEDGER=$(( LATEST_LEDGER + 500000 )) # stays open ~4 weeks
QUESTION="Will BTC close above 100k USD in 2026?"
MARKET_ID="$(stellar contract invoke --id "$FACTORY_ID" --source-account "$DEPLOYER" \
  --network "$NETWORK" -- create_market \
  --creator "$ADMIN" --question "$QUESTION" --close_ledger "$CLOSE_LEDGER" \
  2>/dev/null | tr -d '"' | tail -n1)"
CREATE_TX="$(latest_tx "$ADMIN")"
echo "  ✓ market $MARKET_ID"
echo "  ✓ tx    $CREATE_TX"

step "Placing sample bets (YES from bettor, NO from deployer)"
# 100 XLM YES (native SAC uses 7 decimals: 100 XLM = 1_000_000_000 stroops)
stellar contract invoke --id "$MARKET_ID" --source-account "$BETTOR" \
  --network "$NETWORK" -- bet --bettor "$BETTOR_ADDR" --side true --amount 1000000000 \
  >/dev/null 2>&1
BET_TX="$(latest_tx "$BETTOR_ADDR")"
echo "  ✓ YES bet tx $BET_TX"
# 60 XLM NO from the deployer, for a two-sided tote board
stellar contract invoke --id "$MARKET_ID" --source-account "$DEPLOYER" \
  --network "$NETWORK" -- bet --bettor "$ADMIN" --side false --amount 600000000 \
  >/dev/null 2>&1
echo "  ✓ NO bet placed"

# ── Persist ──────────────────────────────────────────────────────────────────
step "Writing deployments/testnet.json + apps/web/.env.local"
mkdir -p deployments apps/web
cat > deployments/testnet.json <<JSON
{
  "network": "$NETWORK",
  "rpcUrl": "$RPC_URL",
  "networkPassphrase": "$PASSPHRASE",
  "admin": "$ADMIN",
  "token": "$TOKEN",
  "marketWasmHash": "$MARKET_WASM_HASH",
  "contracts": {
    "oracle": "$ORACLE_ID",
    "treasury": "$TREASURY_ID",
    "factory": "$FACTORY_ID"
  },
  "sampleMarket": {
    "id": "$MARKET_ID",
    "question": "$QUESTION",
    "closeLedger": $CLOSE_LEDGER,
    "createTx": "$CREATE_TX",
    "sampleBetTx": "$BET_TX"
  }
}
JSON

cat > apps/web/.env.local <<ENV
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_NETWORK_PASSPHRASE=$PASSPHRASE
NEXT_PUBLIC_FACTORY_ID=$FACTORY_ID
NEXT_PUBLIC_ORACLE_ID=$ORACLE_ID
NEXT_PUBLIC_TREASURY_ID=$TREASURY_ID
NEXT_PUBLIC_TOKEN_ID=$TOKEN
ENV

step "DONE — summary"
cat deployments/testnet.json
