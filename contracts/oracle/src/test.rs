#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn setup() -> (Env, OracleClient<'static>, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(Oracle, (admin.clone(),));
    let client = OracleClient::new(&env, &id);
    (env, client, admin)
}

#[test]
fn add_reporter_then_report_and_read() {
    let (env, client, _admin) = setup();
    env.mock_all_auths();

    let reporter = Address::generate(&env);
    client.add_reporter(&reporter);
    assert!(client.is_reporter(&reporter));

    let mid = BytesN::from_array(&env, &[7u8; 32]);
    client.report_outcome(&reporter, &mid, &true);
    assert_eq!(client.get_outcome(&mid), Some(true));
}

#[test]
fn non_reporter_cannot_report() {
    let (env, client, _admin) = setup();
    env.mock_all_auths();

    let stranger = Address::generate(&env);
    let mid = BytesN::from_array(&env, &[1u8; 32]);
    let res = client.try_report_outcome(&stranger, &mid, &true);
    assert_eq!(res, Err(Ok(Error::NotReporter)));
}

#[test]
fn cannot_report_same_market_twice() {
    let (env, client, _admin) = setup();
    env.mock_all_auths();

    let reporter = Address::generate(&env);
    client.add_reporter(&reporter);

    let mid = BytesN::from_array(&env, &[2u8; 32]);
    client.report_outcome(&reporter, &mid, &false);
    let res = client.try_report_outcome(&reporter, &mid, &true);
    assert_eq!(res, Err(Ok(Error::AlreadyReported)));
}

#[test]
fn unknown_market_outcome_is_none() {
    let (env, client, _admin) = setup();
    let mid = BytesN::from_array(&env, &[9u8; 32]);
    assert_eq!(client.get_outcome(&mid), None);
}

#[test]
fn removed_reporter_loses_access() {
    let (env, client, _admin) = setup();
    env.mock_all_auths();

    let reporter = Address::generate(&env);
    client.add_reporter(&reporter);
    client.remove_reporter(&reporter);
    assert!(!client.is_reporter(&reporter));

    let mid = BytesN::from_array(&env, &[3u8; 32]);
    let res = client.try_report_outcome(&reporter, &mid, &true);
    assert_eq!(res, Err(Ok(Error::NotReporter)));
}
