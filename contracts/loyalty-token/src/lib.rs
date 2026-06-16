#![no_std]
#![allow(unexpected_cfgs)]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, symbol_short};

// State keys
const ADMIN: Symbol = symbol_short!("ADMIN");
const BALANCE: Symbol = symbol_short!("BAL");

#[contract]
pub struct LoyaltyToken;

#[contractimpl]
impl LoyaltyToken {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let admin: Address = env.storage().instance().get(&ADMIN).expect("not initialized");
        admin.require_auth();

        let key = (BALANCE, to.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_balance = current_balance + amount;
        env.storage().persistent().set(&key, &new_balance);
    }

    pub fn balance(env: Env, address: Address) -> i128 {
        let key = (BALANCE, address);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }
        from.require_auth();

        let from_key = (BALANCE, from.clone());
        let to_key = (BALANCE, to.clone());

        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);

        env.storage().persistent().set(&from_key, &(from_balance - amount));
        env.storage().persistent().set(&to_key, &(to_balance + amount));
    }
}
