#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contractclient, Address, Env, Symbol, symbol_short};

// State keys
const ADMIN: Symbol = symbol_short!("ADMIN");
const LOYALTY_TOKEN: Symbol = symbol_short!("LOYAL_TO");
const EVENT_KEY: Symbol = symbol_short!("EVENT");
const TICKET_KEY: Symbol = symbol_short!("TICKET");

#[contractclient(name = "LoyaltyTokenClient")]
pub trait LoyaltyTokenInterface {
    fn initialize(env: Env, admin: Address);
    fn mint(env: Env, to: Address, amount: i128);
    fn balance(env: Env, address: Address) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventInfo {
    pub id: u32,
    pub organizer: Address,
    pub ticket_price: i128,
    pub max_tickets: u32,
    pub sold_tickets: u32,
}

#[contract]
pub struct EventManager;

#[contractimpl]
impl EventManager {
    pub fn initialize(env: Env, admin: Address, loyalty_token: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&LOYALTY_TOKEN, &loyalty_token);
    }

    pub fn create_event(env: Env, organizer: Address, event_id: u32, ticket_price: i128, max_tickets: u32) {
        organizer.require_auth();

        let event_key = (EVENT_KEY, event_id);
        if env.storage().persistent().has(&event_key) {
            panic!("event already exists");
        }

        let event_info = EventInfo {
            id: event_id,
            organizer,
            ticket_price,
            max_tickets,
            sold_tickets: 0,
        };

        env.storage().persistent().set(&event_key, &event_info);

        env.events().publish(
            (symbol_short!("event"), symbol_short!("created")),
            (event_id, ticket_price, max_tickets)
        );
    }

    pub fn buy_ticket(env: Env, buyer: Address, event_id: u32) {
        buyer.require_auth();

        let event_key = (EVENT_KEY, event_id);
        let mut event_info: EventInfo = env
            .storage()
            .persistent()
            .get(&event_key)
            .expect("event not found");

        if event_info.sold_tickets >= event_info.max_tickets {
            panic!("event is sold out");
        }

        event_info.sold_tickets += 1;
        env.storage().persistent().set(&event_key, &event_info);

        // Record ticket ownership
        let ticket_key = (TICKET_KEY, buyer.clone(), event_id);
        let current_tickets: u32 = env.storage().persistent().get(&ticket_key).unwrap_or(0);
        env.storage().persistent().set(&ticket_key, &(current_tickets + 1));

        // Call loyalty token client to mint points
        let loyalty_token_id: Address = env.storage().instance().get(&LOYALTY_TOKEN).unwrap();
        let loyalty_client = LoyaltyTokenClient::new(&env, &loyalty_token_id);
        
        // Reward 10 loyalty points per ticket
        loyalty_client.mint(&buyer, &10);

        // Emit purchase event
        env.events().publish(
            (symbol_short!("ticket"), symbol_short!("purchased")),
            (buyer, event_id, event_info.sold_tickets)
        );
    }

    pub fn get_event(env: Env, event_id: u32) -> EventInfo {
        let event_key = (EVENT_KEY, event_id);
        env.storage()
            .persistent()
            .get(&event_key)
            .expect("event not found")
    }

    pub fn get_ticket_count(env: Env, buyer: Address, event_id: u32) -> u32 {
        let ticket_key = (TICKET_KEY, buyer, event_id);
        env.storage().persistent().get(&ticket_key).unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address, testutils::Address as _};
    use loyalty_token::LoyaltyToken;

    #[test]
    fn test_event_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        // Register contracts
        let loyalty_id = env.register_contract(None, LoyaltyToken);
        let loyalty_client = LoyaltyTokenClient::new(&env, &loyalty_id);

        let event_manager_id = env.register_contract(None, EventManager);
        let event_manager_client = EventManagerClient::new(&env, &event_manager_id);

        // Initialize loyalty token with event_manager_id as admin
        loyalty_client.initialize(&event_manager_id);

        // Initialize event manager with loyalty token contract address
        let admin = Address::generate(&env);
        event_manager_client.initialize(&admin, &loyalty_id);

        // Create organizer and buyer
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        // Test Create Event
        let event_id = 101;
        let ticket_price = 1000;
        let max_tickets = 5;

        event_manager_client.create_event(&organizer, &event_id, &ticket_price, &max_tickets);

        // Fetch and check event info
        let event_info = event_manager_client.get_event(&event_id);
        assert_eq!(event_info.id, event_id);
        assert_eq!(event_info.organizer, organizer);
        assert_eq!(event_info.ticket_price, ticket_price);
        assert_eq!(event_info.max_tickets, max_tickets);
        assert_eq!(event_info.sold_tickets, 0);

        // Test Buy Ticket
        event_manager_client.buy_ticket(&buyer, &event_id);

        // Verify ticket count and loyalty points
        let ticket_count = event_manager_client.get_ticket_count(&buyer, &event_id);
        assert_eq!(ticket_count, 1);

        let loyalty_balance = loyalty_client.balance(&buyer);
        assert_eq!(loyalty_balance, 10); // Buyer should receive 10 points

        // Check updated event ticket details
        let updated_info = event_manager_client.get_event(&event_id);
        assert_eq!(updated_info.sold_tickets, 1);
    }

    #[test]
    #[should_panic(expected = "event is sold out")]
    fn test_sold_out() {
        let env = Env::default();
        env.mock_all_auths();

        let loyalty_id = env.register_contract(None, LoyaltyToken);
        let loyalty_client = LoyaltyTokenClient::new(&env, &loyalty_id);

        let event_manager_id = env.register_contract(None, EventManager);
        let event_manager_client = EventManagerClient::new(&env, &event_manager_id);

        loyalty_client.initialize(&event_manager_id);
        let admin = Address::generate(&env);
        event_manager_client.initialize(&admin, &loyalty_id);

        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        event_manager_client.create_event(&organizer, &102, &500, &1);

        // First ticket buy
        event_manager_client.buy_ticket(&buyer, &102);

        // Second ticket buy - should panic with sold out
        event_manager_client.buy_ticket(&buyer, &102);
    }

    #[test]
    fn test_loyalty_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        let loyalty_id = env.register_contract(None, LoyaltyToken);
        let loyalty_client = LoyaltyTokenClient::new(&env, &loyalty_id);

        let event_manager_id = env.register_contract(None, EventManager);
        let event_manager_client = EventManagerClient::new(&env, &event_manager_id);

        loyalty_client.initialize(&event_manager_id);
        let admin = Address::generate(&env);
        event_manager_client.initialize(&admin, &loyalty_id);

        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);
        let receiver = Address::generate(&env);

        event_manager_client.create_event(&organizer, &103, &100, &10);

        // Buy ticket to earn points
        event_manager_client.buy_ticket(&buyer, &103);
        assert_eq!(loyalty_client.balance(&buyer), 10);

        // Transfer points
        loyalty_client.transfer(&buyer, &receiver, &4);
        assert_eq!(loyalty_client.balance(&buyer), 6);
        assert_eq!(loyalty_client.balance(&receiver), 4);
    }

    #[test]
    #[should_panic(expected = "not initialized")]
    fn test_uninitialized_mint_panic() {
        let env = Env::default();
        env.mock_all_auths();

        let loyalty_id = env.register_contract(None, LoyaltyToken);
        let loyalty_client = LoyaltyTokenClient::new(&env, &loyalty_id);

        let attacker = Address::generate(&env);
        loyalty_client.mint(&attacker, &100);
    }
}
