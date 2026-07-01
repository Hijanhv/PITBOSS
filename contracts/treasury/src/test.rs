#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env};

struct Fixture {
    env: Env,
    treasury: TreasuryClient<'static>,
    treasury_addr: Address,
    sac_admin: token::StellarAssetClient<'static>,
    token: token::TokenClient<'static>,
}

fn setup() -> (Fixture, Address /* admin */) {
    let env = Env::default();
    // `collect` pulls the fee via a token transfer whose `from`-auth is provided
    // by the caller (Market) rather than rooted in `collect` itself, so a direct
    // unit test must permit non-root authorization.
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token_addr = sac.address();

    let treasury_addr = env.register(Treasury, (admin.clone(), token_addr.clone()));
    let fx = Fixture {
        sac_admin: token::StellarAssetClient::new(&env, &token_addr),
        token: token::TokenClient::new(&env, &token_addr),
        treasury: TreasuryClient::new(&env, &treasury_addr),
        treasury_addr,
        env,
    };
    (fx, admin)
}

#[test]
fn collect_pulls_fee_and_tracks_total() {
    let (fx, _admin) = setup();
    let payer = Address::generate(&fx.env);
    fx.sac_admin.mint(&payer, &1_000);

    fx.treasury.collect(&payer, &250);

    assert_eq!(fx.treasury.total_collected(), 250);
    assert_eq!(fx.token.balance(&fx.treasury_addr), 250);
    assert_eq!(fx.token.balance(&payer), 750);
}

#[test]
fn collect_accumulates_across_calls() {
    let (fx, _admin) = setup();
    let a = Address::generate(&fx.env);
    let b = Address::generate(&fx.env);
    fx.sac_admin.mint(&a, &500);
    fx.sac_admin.mint(&b, &500);

    fx.treasury.collect(&a, &100);
    fx.treasury.collect(&b, &75);

    assert_eq!(fx.treasury.total_collected(), 175);
    assert_eq!(fx.token.balance(&fx.treasury_addr), 175);
}

#[test]
fn collect_zero_amount_rejected() {
    let (fx, _admin) = setup();
    let payer = Address::generate(&fx.env);
    fx.sac_admin.mint(&payer, &1_000);

    let res = fx.treasury.try_collect(&payer, &0);
    assert_eq!(res, Err(Ok(Error::ZeroAmount)));
}

#[test]
fn admin_can_withdraw_collected_fees() {
    let (fx, _admin) = setup();
    let payer = Address::generate(&fx.env);
    let dest = Address::generate(&fx.env);
    fx.sac_admin.mint(&payer, &1_000);

    fx.treasury.collect(&payer, &400);
    fx.treasury.withdraw(&dest, &300);

    assert_eq!(fx.token.balance(&dest), 300);
    assert_eq!(fx.token.balance(&fx.treasury_addr), 100);
}
