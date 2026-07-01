#![no_std]
//! TREASURY — protocol fee sink.
//!
//! Market contracts route their protocol fee here via a cross-contract call to
//! [`Treasury::collect`], which pulls the fee token from the bettor into this
//! contract. The admin can later [`Treasury::withdraw`] accumulated fees.
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAdmin = 1,
    ZeroAmount = 2,
}

#[contracttype]
enum DataKey {
    Admin,
    Token,
    TotalCollected,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Collected {
    #[topic]
    pub from: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Withdrawn {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contract]
pub struct Treasury;

#[contractimpl]
impl Treasury {
    /// Deploy-time constructor. `token` is the fee asset (native XLM SAC).
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::TotalCollected, &0i128);
    }

    /// Pull `amount` of the fee token from `from` into the treasury.
    ///
    /// Called cross-contract by Market during `bet`. `from`'s authorization is
    /// enforced by the token transfer itself, carried in the bettor's auth tree.
    pub fn collect(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        let token = read_token(&env);
        token::TokenClient::new(&env, &token).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        let total = read_total(&env);
        env.storage()
            .instance()
            .set(&DataKey::TotalCollected, &(total + amount));
        Collected { from, amount }.publish(&env);
        Ok(())
    }

    /// Withdraw accumulated fees to `to`. Admin only.
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        read_admin(&env).require_auth();
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        let token = read_token(&env);
        token::TokenClient::new(&env, &token).transfer(
            &env.current_contract_address(),
            &to,
            &amount,
        );
        Withdrawn { to, amount }.publish(&env);
        Ok(())
    }

    pub fn total_collected(env: Env) -> i128 {
        read_total(&env)
    }

    pub fn get_token(env: Env) -> Address {
        read_token(&env)
    }

    pub fn get_admin(env: Env) -> Address {
        read_admin(&env)
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

fn read_total(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalCollected)
        .unwrap_or(0)
}

mod test;
