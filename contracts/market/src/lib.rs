#![no_std]
//! MARKET — a single pari-mutuel prediction market (a Factory child).
//!
//! Bettors stake the fee token on YES (`true`) or NO (`false`). A protocol fee
//! is routed to the Treasury on every bet (cross-contract), and the net stake
//! joins the winning/losing pool. After `close_ledger` the market resolves by
//! reading the Oracle (cross-contract); winners then claim a pro-rata share of
//! the entire pot:
//!
//! ```text
//! payout = winning_stake * (pool_yes + pool_no) / winning_pool
//! ```
use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, token,
    Address, BytesN, Env, String,
};

// ── Cross-contract interfaces ────────────────────────────────────────────────
// Typed clients for the sibling contracts. Calling these performs a real
// cross-contract invocation against whatever contract lives at the address.

#[contractclient(name = "OracleClient")]
pub trait OracleInterface {
    fn get_outcome(env: Env, market_id: BytesN<32>) -> Option<bool>;
}

#[contractclient(name = "TreasuryClient")]
pub trait TreasuryInterface {
    fn collect(env: Env, from: Address, amount: i128);
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    MarketClosed = 3,
    NotClosedYet = 4,
    AlreadyResolved = 5,
    NotResolved = 6,
    OutcomeNotReady = 7,
    ZeroAmount = 8,
    AlreadyClaimed = 9,
    NothingToClaim = 10,
}

#[contracttype]
#[derive(Clone)]
pub struct MarketData {
    pub factory: Address,
    pub oracle: Address,
    pub treasury: Address,
    pub token: Address,
    pub market_id: BytesN<32>,
    pub question: String,
    pub close_ledger: u32,
    pub fee_bps: u32,
    pub pool_yes: i128,
    pub pool_no: i128,
    pub resolved: bool,
    pub outcome: bool,
}

#[contracttype]
enum DataKey {
    Market,
    Stake(Address, bool),
    Claimed(Address),
}

// ── Events ───────────────────────────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketInitialized {
    #[topic]
    pub market_id: BytesN<32>,
    pub close_ledger: u32,
    pub fee_bps: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BetPlaced {
    #[topic]
    pub bettor: Address,
    pub side: bool,
    pub net: i128,
    pub pool_yes: i128,
    pub pool_no: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketResolved {
    pub outcome: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claimed {
    #[topic]
    pub bettor: Address,
    pub payout: i128,
}

#[contract]
pub struct Market;

#[contractimpl]
impl Market {
    /// One-shot initialization, called cross-contract by the Factory right after
    /// it deploys this child from the market Wasm hash.
    #[allow(clippy::too_many_arguments)]
    pub fn initialize(
        env: Env,
        factory: Address,
        oracle: Address,
        treasury: Address,
        token: Address,
        market_id: BytesN<32>,
        question: String,
        close_ledger: u32,
        fee_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Market) {
            return Err(Error::AlreadyInitialized);
        }
        let data = MarketData {
            factory,
            oracle,
            treasury,
            token,
            market_id: market_id.clone(),
            question,
            close_ledger,
            fee_bps,
            pool_yes: 0,
            pool_no: 0,
            resolved: false,
            outcome: false,
        };
        env.storage().instance().set(&DataKey::Market, &data);
        MarketInitialized {
            market_id,
            close_ledger,
            fee_bps,
        }
        .publish(&env);
        Ok(())
    }

    /// Stake `amount` on `side` (true = YES, false = NO). A `fee_bps` cut is
    /// routed to the Treasury; the net joins the chosen pool.
    pub fn bet(env: Env, bettor: Address, side: bool, amount: i128) -> Result<(), Error> {
        bettor.require_auth();
        let mut data = load(&env)?;
        if data.resolved || env.ledger().sequence() >= data.close_ledger {
            return Err(Error::MarketClosed);
        }
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        let fee = amount * i128::from(data.fee_bps) / 10_000;
        let net = amount - fee;

        // Cross-contract: route the protocol fee to the Treasury.
        if fee > 0 {
            TreasuryClient::new(&env, &data.treasury).collect(&bettor, &fee);
        }
        // Pull the net stake into this market.
        token::TokenClient::new(&env, &data.token).transfer(
            &bettor,
            &env.current_contract_address(),
            &net,
        );

        if side {
            data.pool_yes += net;
        } else {
            data.pool_no += net;
        }
        let key = DataKey::Stake(bettor.clone(), side);
        let staked: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(staked + net));
        env.storage().instance().set(&DataKey::Market, &data);

        BetPlaced {
            bettor,
            side,
            net,
            pool_yes: data.pool_yes,
            pool_no: data.pool_no,
        }
        .publish(&env);
        Ok(())
    }

    /// Resolve the market after close by reading the Oracle (cross-contract).
    pub fn resolve(env: Env) -> Result<(), Error> {
        let mut data = load(&env)?;
        if data.resolved {
            return Err(Error::AlreadyResolved);
        }
        if env.ledger().sequence() < data.close_ledger {
            return Err(Error::NotClosedYet);
        }
        // Cross-contract: pull the resolution from the shared Oracle.
        let outcome = OracleClient::new(&env, &data.oracle).get_outcome(&data.market_id);
        let outcome = outcome.ok_or(Error::OutcomeNotReady)?;

        data.resolved = true;
        data.outcome = outcome;
        env.storage().instance().set(&DataKey::Market, &data);
        MarketResolved { outcome }.publish(&env);
        Ok(())
    }

    /// Claim winnings. `payout = winning_stake * total_pool / winning_pool`.
    pub fn claim(env: Env, bettor: Address) -> Result<i128, Error> {
        bettor.require_auth();
        let data = load(&env)?;
        if !data.resolved {
            return Err(Error::NotResolved);
        }
        if env
            .storage()
            .persistent()
            .get(&DataKey::Claimed(bettor.clone()))
            .unwrap_or(false)
        {
            return Err(Error::AlreadyClaimed);
        }

        let winning_stake: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Stake(bettor.clone(), data.outcome))
            .unwrap_or(0);
        if winning_stake <= 0 {
            return Err(Error::NothingToClaim);
        }

        let total_pool = data.pool_yes + data.pool_no;
        let winning_pool = if data.outcome {
            data.pool_yes
        } else {
            data.pool_no
        };
        // winning_stake > 0 implies winning_pool >= winning_stake > 0.
        let payout = winning_stake * total_pool / winning_pool;

        env.storage()
            .persistent()
            .set(&DataKey::Claimed(bettor.clone()), &true);
        token::TokenClient::new(&env, &data.token).transfer(
            &env.current_contract_address(),
            &bettor,
            &payout,
        );

        Claimed {
            bettor,
            payout,
        }
        .publish(&env);
        Ok(payout)
    }

    pub fn get_market(env: Env) -> Result<MarketData, Error> {
        load(&env)
    }

    pub fn get_stake(env: Env, user: Address, side: bool) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Stake(user, side))
            .unwrap_or(0)
    }

    pub fn has_claimed(env: Env, user: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Claimed(user))
            .unwrap_or(false)
    }
}

fn load(env: &Env) -> Result<MarketData, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Market)
        .ok_or(Error::NotInitialized)
}

mod test;
