#![no_std]
//! FACTORY — "the boss". Permissionless market creation + on-chain registry.
//!
//! `create_market` performs two cross-contract operations against a freshly
//! minted child:
//!   1. a cross-contract DEPLOY of a Market from the installed `market_wasm_hash`
//!   2. a cross-contract CALL to the child's `initialize`
//!
//! Every market shares the same Oracle and Treasury, so the whole protocol is a
//! mesh that answers to one boss.
use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype,
    xdr::ToXdr, Address, BytesN, Env, String, Vec,
};

/// Cross-contract interface for initializing a freshly deployed Market child.
#[contractclient(name = "MarketClient")]
pub trait MarketInterface {
    #[allow(clippy::too_many_arguments)]
    fn initialize(
        env: Env,
        factory: Address,
        oracle: Address,
        treasury: Address,
        token: Address,
        market_id: BytesN<32>,
        question: String,
        close_ledger: u32,
        fee_bps: u32,
    );
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAdmin = 1,
    CloseInPast = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    pub oracle: Address,
    pub treasury: Address,
    pub token: Address,
    pub market_wasm_hash: BytesN<32>,
    pub default_fee_bps: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct MarketRef {
    pub market_id: BytesN<32>,
    pub address: Address,
}

#[contracttype]
enum DataKey {
    Config,
    Counter,
    Markets,
    MarketAddr(BytesN<32>),
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketCreated {
    #[topic]
    pub market_id: BytesN<32>,
    #[topic]
    pub creator: Address,
    pub market: Address,
    pub question: String,
}

#[contract]
pub struct Factory;

#[contractimpl]
impl Factory {
    /// Deploy-time constructor wiring the shared protocol contracts and the
    /// Market Wasm template that children are cloned from.
    #[allow(clippy::too_many_arguments)]
    pub fn __constructor(
        env: Env,
        admin: Address,
        oracle: Address,
        treasury: Address,
        token: Address,
        market_wasm_hash: BytesN<32>,
        default_fee_bps: u32,
    ) {
        let config = Config {
            admin,
            oracle,
            treasury,
            token,
            market_wasm_hash,
            default_fee_bps,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::Counter, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::Markets, &Vec::<BytesN<32>>::new(&env));
    }

    /// Permissionlessly spin up a new market. Deploys + initializes a Market
    /// child, registers it, and returns its address.
    pub fn create_market(
        env: Env,
        creator: Address,
        question: String,
        close_ledger: u32,
    ) -> Result<Address, Error> {
        creator.require_auth();
        if close_ledger <= env.ledger().sequence() {
            return Err(Error::CloseInPast);
        }
        let config = read_config(&env);

        let counter: u32 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::Counter, &counter);

        // Derive a unique market id (also used as the deploy salt) from the
        // creator, a monotonic counter, and the question.
        let mut seed = creator.clone().to_xdr(&env);
        seed.extend_from_array(&counter.to_be_bytes());
        seed.append(&question.clone().to_xdr(&env));
        let market_id: BytesN<32> = env.crypto().sha256(&seed).to_bytes();

        // (1) Cross-contract DEPLOY: clone a Market from the installed Wasm hash.
        let market_addr = env
            .deployer()
            .with_current_contract(market_id.clone())
            .deploy_v2(config.market_wasm_hash.clone(), ());

        // (2) Cross-contract CALL: initialize the freshly deployed child.
        MarketClient::new(&env, &market_addr).initialize(
            &env.current_contract_address(),
            &config.oracle,
            &config.treasury,
            &config.token,
            &market_id,
            &question,
            &close_ledger,
            &config.default_fee_bps,
        );

        // Register in the on-chain registry.
        let mut markets: Vec<BytesN<32>> =
            env.storage().instance().get(&DataKey::Markets).unwrap();
        markets.push_back(market_id.clone());
        env.storage().instance().set(&DataKey::Markets, &markets);
        env.storage()
            .instance()
            .set(&DataKey::MarketAddr(market_id.clone()), &market_addr);

        MarketCreated {
            market_id,
            creator,
            market: market_addr.clone(),
            question,
        }
        .publish(&env);
        Ok(market_addr)
    }

    /// Full registry: every `(market_id, address)` this factory has created.
    pub fn list_markets(env: Env) -> Vec<MarketRef> {
        let ids: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::Markets)
            .unwrap_or(Vec::new(&env));
        let mut out = Vec::new(&env);
        for id in ids.iter() {
            let address: Address = env
                .storage()
                .instance()
                .get(&DataKey::MarketAddr(id.clone()))
                .unwrap();
            out.push_back(MarketRef {
                market_id: id,
                address,
            });
        }
        out
    }

    pub fn get_market_addr(env: Env, market_id: BytesN<32>) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::MarketAddr(market_id))
    }

    pub fn market_count(env: Env) -> u32 {
        let markets: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::Markets)
            .unwrap_or(Vec::new(&env));
        markets.len()
    }

    /// Upgrade the Market Wasm template new markets are cloned from. Admin only.
    pub fn set_market_wasm_hash(
        env: Env,
        caller: Address,
        new_hash: BytesN<32>,
    ) -> Result<(), Error> {
        caller.require_auth();
        let mut config = read_config(&env);
        if caller != config.admin {
            return Err(Error::NotAdmin);
        }
        config.market_wasm_hash = new_hash;
        env.storage().instance().set(&DataKey::Config, &config);
        Ok(())
    }

    pub fn get_config(env: Env) -> Config {
        read_config(&env)
    }
}

fn read_config(env: &Env) -> Config {
    env.storage().instance().get(&DataKey::Config).unwrap()
}

mod test;
