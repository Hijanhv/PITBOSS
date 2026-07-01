#![no_std]
//! ORACLE — the shared source of truth for market resolution.
//!
//! An admin curates a set of authorized reporters. Each reporter may publish a
//! one-shot binary outcome for a given `market_id`. Market contracts read that
//! outcome cross-contract via [`Oracle::get_outcome`] when they resolve.
use soroban_sdk::{
    contract, contractevent, contracterror, contractimpl, contracttype, Address, BytesN, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAdmin = 1,
    NotReporter = 2,
    AlreadyReported = 3,
    NotInitialized = 4,
}

#[contracttype]
enum DataKey {
    Admin,
    Reporter(Address),
    Outcome(BytesN<32>),
}

// ── Events ──────────────────────────────────────────────────────────────────
// Topic = struct name in snake_case; `#[topic]` fields are indexed for filtering.

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReporterAdded {
    #[topic]
    pub reporter: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReporterRemoved {
    #[topic]
    pub reporter: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OutcomeReported {
    #[topic]
    pub market_id: BytesN<32>,
    pub outcome: bool,
}

#[contract]
pub struct Oracle;

#[contractimpl]
impl Oracle {
    /// Deploy-time constructor. `admin` governs the reporter set.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Authorize `reporter` to publish outcomes. Admin only.
    pub fn add_reporter(env: Env, reporter: Address) {
        read_admin(&env).require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Reporter(reporter.clone()), &true);
        ReporterAdded { reporter }.publish(&env);
    }

    /// Revoke a reporter. Admin only.
    pub fn remove_reporter(env: Env, reporter: Address) {
        read_admin(&env).require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Reporter(reporter.clone()));
        ReporterRemoved { reporter }.publish(&env);
    }

    /// Publish the binary outcome for `market_id`. Reporter only, one-shot.
    pub fn report_outcome(
        env: Env,
        reporter: Address,
        market_id: BytesN<32>,
        outcome: bool,
    ) -> Result<(), Error> {
        reporter.require_auth();
        if !read_is_reporter(&env, &reporter) {
            return Err(Error::NotReporter);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Outcome(market_id.clone()))
        {
            return Err(Error::AlreadyReported);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Outcome(market_id.clone()), &outcome);
        OutcomeReported { market_id, outcome }.publish(&env);
        Ok(())
    }

    /// Cross-contract read used by Market on resolve. `None` until reported.
    pub fn get_outcome(env: Env, market_id: BytesN<32>) -> Option<bool> {
        env.storage()
            .persistent()
            .get(&DataKey::Outcome(market_id))
    }

    pub fn is_reporter(env: Env, reporter: Address) -> bool {
        read_is_reporter(&env, &reporter)
    }

    pub fn get_admin(env: Env) -> Address {
        read_admin(&env)
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_is_reporter(env: &Env, reporter: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Reporter(reporter.clone()))
        .unwrap_or(false)
}

mod test;
