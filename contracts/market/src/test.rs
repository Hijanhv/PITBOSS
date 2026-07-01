#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, Address, BytesN, Env, String,
};
// Full generated clients for the sibling contracts (distinct from the local
// cross-contract trait clients of the same base name).
use oracle::OracleClient as OracleCtl;
use treasury::TreasuryClient as TreasuryCtl;

const OPEN_SEQ: u32 = 10;
const CLOSE_SEQ: u32 = 100;

struct World {
    env: Env,
    reporter: Address,
    token: token::TokenClient<'static>,
    sac_admin: token::StellarAssetClient<'static>,
    oracle: OracleCtl<'static>,
    treasury: TreasuryCtl<'static>,
    market: MarketClient<'static>,
    market_addr: Address,
    market_id: BytesN<32>,
}

impl World {
    fn fund(&self, amount: i128) -> Address {
        let a = Address::generate(&self.env);
        self.sac_admin.mint(&a, &amount);
        a
    }
}

fn world(fee_bps: u32) -> World {
    let env = Env::default();
    // Markets pull the fee token on the bettor's behalf via nested calls.
    env.mock_all_auths_allowing_non_root_auth();
    env.ledger().set_sequence_number(OPEN_SEQ);

    let admin = Address::generate(&env);
    let reporter = Address::generate(&env);
    let issuer = Address::generate(&env);
    let token_addr = env.register_stellar_asset_contract_v2(issuer).address();

    let oracle_addr = env.register(oracle::Oracle, (admin.clone(),));
    let oracle = OracleCtl::new(&env, &oracle_addr);
    oracle.add_reporter(&reporter);

    let treasury_addr = env.register(treasury::Treasury, (admin.clone(), token_addr.clone()));
    let treasury = TreasuryCtl::new(&env, &treasury_addr);

    let market_id = BytesN::from_array(&env, &[42u8; 32]);
    let factory = Address::generate(&env); // stand-in factory for unit tests
    let market_addr = env.register(Market, ());
    let market = MarketClient::new(&env, &market_addr);
    market.initialize(
        &factory,
        &oracle_addr,
        &treasury_addr,
        &token_addr,
        &market_id,
        &String::from_str(&env, "Will BTC close above 100k?"),
        &CLOSE_SEQ,
        &fee_bps,
    );

    World {
        token: token::TokenClient::new(&env, &token_addr),
        sac_admin: token::StellarAssetClient::new(&env, &token_addr),
        oracle,
        treasury,
        market,
        market_addr,
        market_id,
        reporter,
        env,
    }
}

fn close(w: &World) {
    w.env.ledger().set_sequence_number(CLOSE_SEQ);
}

#[test]
fn bet_routes_fee_to_treasury_and_updates_pools() {
    let w = world(200); // 2%
    let alice = w.fund(1_000);
    let bob = w.fund(500);

    w.market.bet(&alice, &true, &1_000); // fee 20, net 980
    w.market.bet(&bob, &false, &500); // fee 10, net 490

    // Cross-contract: fees landed in the Treasury.
    assert_eq!(w.treasury.total_collected(), 30);
    assert_eq!(w.token.balance(&w.market_addr), 1_470);

    let m = w.market.get_market();
    assert_eq!(m.pool_yes, 980);
    assert_eq!(m.pool_no, 490);
    assert_eq!(w.market.get_stake(&alice, &true), 980);
    assert_eq!(w.market.get_stake(&bob, &false), 490);
}

#[test]
fn winner_claims_entire_pot() {
    let w = world(0);
    let alice = w.fund(1_000);
    let bob = w.fund(1_000);
    w.market.bet(&alice, &true, &1_000);
    w.market.bet(&bob, &false, &1_000);

    close(&w);
    w.oracle.report_outcome(&w.reporter, &w.market_id, &true); // YES wins
    w.market.resolve();

    let payout = w.market.claim(&alice);
    assert_eq!(payout, 2_000);
    assert_eq!(w.token.balance(&alice), 2_000);
    assert_eq!(w.token.balance(&w.market_addr), 0);

    // Loser has nothing on the winning side.
    let res = w.market.try_claim(&bob);
    assert_eq!(res, Err(Ok(Error::NothingToClaim)));
}

#[test]
fn payout_is_proportional_across_multiple_winners() {
    let w = world(0);
    let alice = w.fund(300);
    let bob = w.fund(100);
    let carol = w.fund(600);
    w.market.bet(&alice, &true, &300);
    w.market.bet(&bob, &true, &100);
    w.market.bet(&carol, &false, &600); // total pot 1000, YES pool 400

    close(&w);
    w.oracle.report_outcome(&w.reporter, &w.market_id, &true);
    w.market.resolve();

    assert_eq!(w.market.claim(&alice), 750); // 300 * 1000 / 400
    assert_eq!(w.market.claim(&bob), 250); //  100 * 1000 / 400
}

#[test]
fn cannot_bet_after_close() {
    let w = world(0);
    let alice = w.fund(1_000);
    close(&w);
    let res = w.market.try_bet(&alice, &true, &100);
    assert_eq!(res, Err(Ok(Error::MarketClosed)));
}

#[test]
fn cannot_resolve_before_close() {
    let w = world(0);
    let res = w.market.try_resolve();
    assert_eq!(res, Err(Ok(Error::NotClosedYet)));
}

#[test]
fn resolve_fails_until_oracle_reports() {
    let w = world(0);
    close(&w);
    let res = w.market.try_resolve();
    assert_eq!(res, Err(Ok(Error::OutcomeNotReady)));
}

#[test]
fn double_claim_is_rejected() {
    let w = world(0);
    let alice = w.fund(1_000);
    w.market.bet(&alice, &true, &1_000);

    close(&w);
    w.oracle.report_outcome(&w.reporter, &w.market_id, &true);
    w.market.resolve();

    w.market.claim(&alice);
    let res = w.market.try_claim(&alice);
    assert_eq!(res, Err(Ok(Error::AlreadyClaimed)));
}

#[test]
fn zero_amount_bet_rejected() {
    let w = world(0);
    let alice = w.fund(1_000);
    let res = w.market.try_bet(&alice, &true, &0);
    assert_eq!(res, Err(Ok(Error::ZeroAmount)));
}
