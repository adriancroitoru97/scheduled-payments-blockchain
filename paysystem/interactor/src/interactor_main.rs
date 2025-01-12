#![allow(non_snake_case)]

mod proxy;

use multiversx_sc_snippets::imports::*;
use multiversx_sc_snippets::sdk;
use serde::{Deserialize, Serialize};
use std::{
    io::{Read, Write},
    path::Path,
};


const GATEWAY: &str = sdk::gateway::DEVNET_GATEWAY;
const STATE_FILE: &str = "state.toml";

const PEM_FILE_PATH: &str = "new_wallet.pem";


#[tokio::main]
async fn main() {
    env_logger::init();

    let mut args: Vec<String> = std::env::args().collect();
    args.remove(0); // Remove program name
    
    let cmd = args.remove(0);
    let mut interact = ContractInteract::new().await;
    
    match cmd.as_str() {
        "deploy" => interact.deploy().await,
        "addSchedule" => {
            if args.len() != 5 {
                println!("Usage: addSchedule <recipient_address> <amount_egld> <frequency_hours> <start_time_hours_from_now> <duration_days>");
                std::process::exit(1);
            }
            let recipient = bech32::decode(&args[0]);
            let amount_egld: f64 = args[1].parse().expect("Amount must be a number");
            let frequency_hours: u64 = args[2].parse().expect("Frequency must be a number");
            let start_hours_from_now: u64 = args[3].parse().expect("Start time must be a number");
            let duration_days: u64 = args[4].parse().expect("Duration must be a number");
            
            interact.add_schedule(
                recipient,
                amount_egld,
                frequency_hours,
                start_hours_from_now,
                duration_days
            ).await;
        },
        "cancelSchedule" => {
            if args.len() != 1 {
                println!("Usage: cancel_schedule <schedule_index>");
                std::process::exit(1);
            }
            let schedule_index: u32 = args[0].parse().expect("Schedule index must be a number");
            interact.cancel_schedule(schedule_index).await;
        },
        "executePayments" => interact.execute_payments().await,
        "depositFunds" => {
            if args.is_empty() {
                println!("Usage: depositFunds <egld_amount>");
                std::process::exit(1);
            }
            let egld_amount: f64 = args[0].parse().expect("Amount must be a number");
            interact.deposit_funds(egld_amount).await;
        },
        "getSchedule" => {
            if args.len() != 2 {
                println!("Usage: get_schedule <address> <schedule_index>");
                std::process::exit(1);
            }
            let address = bech32::decode(&args[0]);
            let schedule_index: u32 = args[1].parse().expect("Schedule index must be a number");
            interact
                .get_schedule(Address::from(address), schedule_index)
                .await;
        },
        "getSchedules" => {
            if args.is_empty() {
                println!("Usage: get_schedule <address>");
                std::process::exit(1);
            }
            let address = bech32::decode(&args[0]);
            interact.get_schedules(address).await;
        },
        "getTransactionHistory" => {
            if args.is_empty() {
                println!("Usage: get_transaction_history <address>");
                std::process::exit(1);
            }
            let address = bech32::decode(&args[0]);
            interact.get_transaction_history(address).await;
        },
        "getBalance" => {
            if args.is_empty() {
                println!("Usage: getBalance <address>");
                std::process::exit(1);
            }
            let address = bech32::decode(&args[0]);
            interact.get_balance(address).await;
        },
        _ => {
            println!("Unknown command: {}", cmd);
            println!("Available commands:");
            println!("  deploy");
            println!("  addSchedule <recipient_address> <amount_egld> <frequency_hours> <start_time_hours_from_now> <duration_days>");
            println!("  cancelSchedule");
            println!("  executePayments");
            println!("  getSchedules <address>");
            println!("  getTransactionHistory <address>");
            println!("  getBalance <address>");
            std::process::exit(1);
        }
    }
}


#[derive(Debug, Default, Serialize, Deserialize)]
struct State {
    contract_address: Option<Bech32Address>
}

impl State {
        // Deserializes state from file
        pub fn load_state() -> Self {
            if Path::new(STATE_FILE).exists() {
                let mut file = std::fs::File::open(STATE_FILE).unwrap();
                let mut content = String::new();
                file.read_to_string(&mut content).unwrap();
                toml::from_str(&content).unwrap()
            } else {
                Self::default()
            }
        }
    
        /// Sets the contract address
        pub fn set_address(&mut self, address: Bech32Address) {
            self.contract_address = Some(address);
        }
    
        /// Returns the contract address
        pub fn current_address(&self) -> &Bech32Address {
            self.contract_address
                .as_ref()
                .expect("no known contract, deploy first")
        }
    }
    
    impl Drop for State {
        // Serializes state to file
        fn drop(&mut self) {
            let mut file = std::fs::File::create(STATE_FILE).unwrap();
            file.write_all(toml::to_string(self).unwrap().as_bytes())
                .unwrap();
        }
    }

struct ContractInteract {
    interactor: Interactor,
    wallet_address: Address,
    contract_code: BytesValue,
    state: State
}

impl ContractInteract {
    async fn new() -> Self {
        let mut interactor = Interactor::new(GATEWAY).await;
        let wallet = Wallet::from_pem_file(PEM_FILE_PATH);
        let wallet_address = interactor.register_wallet(
            wallet
            .expect("Failed to load PEM file. Ensure the file exists and the path is correct.")
        );
        
        let contract_code = BytesValue::interpret_from(
            "mxsc:../output/paysystem.mxsc.json",
            &InterpreterContext::default(),
        );

        ContractInteract {
            interactor,
            wallet_address,
            contract_code,
            state: State::load_state()
        }
    }

    async fn deploy(&mut self) {
        let new_address = self
            .interactor
            .tx()
            .from(&self.wallet_address)
            .gas(100_000_000u64)
            .typed(proxy::PaySystemProxy)
            .init()
            .code(&self.contract_code)
            .returns(ReturnsNewAddress)
            .prepare_async()
            .run()
            .await;
        let new_address_bech32 = bech32::encode(&new_address);
        self.state
            .set_address(Bech32Address::from_bech32_string(new_address_bech32.clone()));

        println!("new address: {new_address_bech32}");
    }

    async fn add_schedule(
        &mut self,
        recipient: Address,
        amount_egld: f64,
        frequency_hours: u64,
        start_hours_from_now: u64,
        duration_days: u64,
    ) {
        // Convert EGLD to atomic units (1 EGLD = 10^18)
        let amount = BigUint::<StaticApi>::from((amount_egld * 1e18) as u64);
        
        // Convert hours to seconds
        let frequency = frequency_hours * 3600;
        
        // Get current block timestamp
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        let start_time = current_time + (start_hours_from_now * 3600);
        let end_time = if duration_days > 0 {
            Some(start_time + (duration_days * 86400))
        } else {
            None
        };

        let response = self
            .interactor
            .tx()
            .from(&self.wallet_address)
            .to(self.state.current_address())
            .gas(30_000_000u64)
            .typed(proxy::PaySystemProxy)
            .add_schedule(recipient, amount, frequency, start_time, end_time)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        println!("Result: {response:?}");
    }

    async fn cancel_schedule(&mut self, schedule_index: u32) {
        let response = self
            .interactor
            .tx()
            .from(&self.wallet_address)
            .to(self.state.current_address())
            .gas(30_000_000u64)
            .typed(proxy::PaySystemProxy)
            .cancel_schedule(schedule_index)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        println!("Result: {response:?}");
    }

    async fn execute_payments(&mut self) {
        let response = self
            .interactor
            .tx()
            .from(&self.wallet_address)
            .to(self.state.current_address())
            .gas(30_000_000u64)
            .typed(proxy::PaySystemProxy)
            .execute_payments()
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        println!("Result: {response:?}");
    }

    async fn deposit_funds(&mut self, egld_amount: f64) {
        let amount = BigUint::<StaticApi>::from((egld_amount * 1e18) as u64);
        let response = self
            .interactor
            .tx()
            .from(&self.wallet_address)
            .to(self.state.current_address())
            .gas(30_000_000u64)
            .typed(proxy::PaySystemProxy)
            .deposit_funds()
            .egld(amount)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;
        println!("Result: {response:?}");
    }

    async fn get_schedule(&mut self, address: Address, schedule_index: u32) {
        let result_value = self
            .interactor
            .query()
            .to(self.state.current_address())
            .typed(proxy::PaySystemProxy)
            .get_schedule(address, schedule_index)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        println!("Result: {result_value:?}");
    }

    async fn get_schedules(&mut self, address: Address) {
        let result_value = self
            .interactor
            .query()
            .to(self.state.current_address())
            .typed(proxy::PaySystemProxy)
            .get_schedules(address)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        for schedule in result_value.iter() {
             // Convert amount to EGLD (divide by 10^18)
            let raw_amount = schedule.amount.clone();
            let amount_egld = raw_amount.to_u64().unwrap_or(0) as f64 / 1e18;

            println!(
                "Recipient: {:?}, Amount: {:?}, Frequency: {:?}, Next Execution Time: {:?}, End Time: {:?}",
                Bech32Address::from(schedule.recipient.to_address()).to_bech32_str(),
                amount_egld,
                schedule.frequency,
                schedule.next_execution_time,
                schedule.end_time
            );
        }
    }

    async fn get_transaction_history(&mut self, address: Address) {
        let result_value = self
            .interactor
            .query()
            .to(self.state.current_address())
            .typed(proxy::PaySystemProxy)
            .get_transaction_history(address)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        println!("Result: {result_value:?}");
    }

    async fn get_balance(&mut self, address: Address) {
        let result_value = self
            .interactor
            .query()
            .to(self.state.current_address())
            .typed(proxy::PaySystemProxy)
            .get_balance(address)
            .returns(ReturnsResultUnmanaged)
            .prepare_async()
            .run()
            .await;

        println!("Result: {result_value:?}");
    }
}

// cargo run -- addSchedule erd1utky5v3jhqr9x8lcyytz28deplr2lpn7w8nr5hgc6h84m5ca7n7qet8a58 0.01 1 0 1

// mxpy --verbose contract call erd1qqqqqqqqqqqqqpgqhvtcgwh6u8ycdn9t7wq2v84xuwux6snv7mtqggl46z \
//   --recall-nonce \
//   --pem=new_wallet.pem \
//   --gas-limit=5000000 \
//   --function="getSchedules" \
//   --arguments 0x6572643136776763347539366B703376657378617061616A3579706B727866756D7A386A6A6B3433613970743635783865747737376D7471386175667136 \
//   --send \
//   --proxy=https://devnet-gateway.multiversx.com \
//   --chain=D

// mxpy contract deploy --bytecode output/paysystem.wasm --recall-nonce --pem new_wallet.pem --gas-limit=60000000 --chain=devnet --metadata-not-upgradeable
