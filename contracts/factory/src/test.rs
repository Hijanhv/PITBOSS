#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env, String,
};

fn dummy_factory(env: &Env) -> (FactoryClient<'static>, Address /* admin */) {
    let admin = Address::generate(env);
    let oracle = Address::generate(env);
    let treasury = Address::generate(env);
    let token = Address::generate(env);
    let wasm_hash = BytesN::from_array(env, &[0u8; 32]);
    let id = env.register(
        Factory,
        (
            admin.clone(),
            oracle,
            treasury,
            token,
            wasm_hash,
            100u32,
        ),
    );
    (FactoryClient::new(env, &id), admin)
}

#[test]
fn registry_starts_empty() {
    let env = Env::default();
    let (factory, _admin) = dummy_factory(&env);
    assert_eq!(factory.market_count(), 0);
    assert_eq!(factory.list_markets().len(), 0);
    let unknown = BytesN::from_array(&env, &[9u8; 32]);
    assert_eq!(factory.get_market_addr(&unknown), None);
}

#[test]
fn create_market_with_past_close_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);
    let (factory, _admin) = dummy_factory(&env);

    let creator = Address::generate(&env);
    let res = factory.try_create_market(&creator, &String::from_str(&env, "too late"), &50u32);
    assert_eq!(res, Err(Ok(Error::CloseInPast)));
}

#[test]
fn non_admin_cannot_upgrade_wasm_hash() {
    let env = Env::default();
    env.mock_all_auths();
    let (factory, _admin) = dummy_factory(&env);

    let stranger = Address::generate(&env);
    let new_hash = BytesN::from_array(&env, &[7u8; 32]);
    let res = factory.try_set_market_wasm_hash(&stranger, &new_hash);
    assert_eq!(res, Err(Ok(Error::NotAdmin)));
}

// ── Factory -> Market cross-contract DEPLOY test ─────────────────────────────
// Gated behind the `wasm-tests` feature: it imports the built market.wasm, so it
// requires `stellar contract build` to have run first. Run via:
//   cargo test -p factory --features wasm-tests
#[cfg(feature = "wasm-tests")]
mod deploy {
    use crate::*;
    use oracle::OracleClient as OracleCtl;
    use soroban_sdk::{
        testutils::{Address as _, Ledger as _},
        token, Address, Env, String,
    };
    use treasury::TreasuryClient as TreasuryCtl;

    mod market_contract {
        soroban_sdk::contractimport!(
            file = "../../target/wasm32v1-none/release/market.wasm"
        );
    }

    #[test]
    fn factory_deploys_initializes_and_child_runs_full_cycle() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        env.ledger().set_sequence_number(10);

        let admin = Address::generate(&env);
        let reporter = Address::generate(&env);
        let issuer = Address::generate(&env);
        let token_addr = env.register_stellar_asset_contract_v2(issuer).address();

        let oracle_addr = env.register(oracle::Oracle, (admin.clone(),));
        let oracle = OracleCtl::new(&env, &oracle_addr);
        oracle.add_reporter(&reporter);
        let treasury_addr =
            env.register(treasury::Treasury, (admin.clone(), token_addr.clone()));

        // Install the market Wasm and register the factory against its hash.
        let wasm_hash = env.deployer().upload_contract_wasm(market_contract::WASM);
        let factory_addr = env.register(
            Factory,
            (
                admin.clone(),
                oracle_addr.clone(),
                treasury_addr.clone(),
                token_addr.clone(),
                wasm_hash,
                100u32, // 1% fee
            ),
        );
        let factory = FactoryClient::new(&env, &factory_addr);

        // Factory -> Market: cross-contract DEPLOY + init.
        let creator = Address::generate(&env);
        let market_addr = factory.create_market(
            &creator,
            &String::from_str(&env, "Will it rain tomorrow?"),
            &50u32,
        );

        assert_eq!(factory.market_count(), 1);
        assert_eq!(factory.list_markets().get(0).unwrap().address, market_addr);

        // The child is a fully-initialized, working market.
        let market = market_contract::Client::new(&env, &market_addr);
        let data = market.get_market();
        assert_eq!(data.fee_bps, 100);
        assert_eq!(data.factory, factory_addr);

        // Drive the child through a full bet -> resolve -> claim cycle.
        let sac_admin = token::StellarAssetClient::new(&env, &token_addr);
        let alice = Address::generate(&env);
        sac_admin.mint(&alice, &1_000);
        market.bet(&alice, &true, &1_000); // fee 10 -> treasury, net 990

        env.ledger().set_sequence_number(50);
        oracle.report_outcome(&reporter, &data.market_id, &true);
        market.resolve();
        assert_eq!(market.claim(&alice), 990);

        // Cross-contract fee routing landed in the shared treasury.
        let treasury = TreasuryCtl::new(&env, &treasury_addr);
        assert_eq!(treasury.total_collected(), 10);
    }
}
