#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone, ManagedVecItem)]
pub struct PaymentSchedule<M: ManagedTypeApi> {
    pub recipient: ManagedAddress<M>,
    pub amount: BigUint<M>,
    pub frequency: u64,
    pub next_execution_time: u64,
    pub end_time: u64,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct TransactionRecord<M: ManagedTypeApi> {
    pub recipient: ManagedAddress<M>,
    pub amount: BigUint<M>,
    pub timestamp: u64,
}

#[multiversx_sc::contract]
pub trait PaySystem {
    #[storage_mapper("payment_schedules")]
    fn payment_schedules(
        &self,
    ) -> MapMapper<ManagedAddress<Self::Api>, ManagedVec<Self::Api, PaymentSchedule<Self::Api>>>;

    #[storage_mapper("transaction_history")]
    fn transaction_history(&self) -> MapMapper<ManagedAddress<Self::Api>, TransactionRecord<Self::Api>>;

    #[storage_mapper("balances")]
    fn balances(&self) -> MapMapper<ManagedAddress<Self::Api>, BigUint<Self::Api>>;

    #[init]
    fn init(&self) {}

    #[endpoint(addSchedule)]
    fn add_schedule(
        &self,
        recipient: ManagedAddress<Self::Api>,
        amount: BigUint<Self::Api>,
        frequency: u64,
        start_time: u64,
        end_time: Option<u64>,
    ) {
        let caller = self.blockchain().get_caller();
        let mut schedules = self
            .payment_schedules()
            .get(&caller)
            .unwrap_or_else(|| ManagedVec::new());

        let new_schedule = PaymentSchedule {
            recipient,
            amount,
            frequency,
            next_execution_time: start_time,
            end_time: end_time.unwrap_or(u64::MAX),
        };

        schedules.push(new_schedule);
        self.payment_schedules().insert(caller, schedules);
    }

    #[endpoint(cancelSchedule)]
    fn cancel_schedule(&self, schedule_index: usize) {
        let caller = self.blockchain().get_caller();
        let mut schedules = self
            .payment_schedules()
            .get(&caller)
            .unwrap_or_else(|| ManagedVec::new());

        if schedule_index < schedules.len() {
            schedules.remove(schedule_index);
            self.payment_schedules().insert(caller, schedules);
        }
    }

    #[endpoint(executePayments)]
    fn execute_payments(&self) {
        let current_time = self.blockchain().get_block_timestamp();

        for (user, mut schedules) in self.payment_schedules().iter() {
            let mut user_balance = self.balances().get(&user).unwrap_or_default();

            let mut i = 0;
            while i < schedules.len() {
                let schedule = schedules.get(i);

                if schedule.next_execution_time <= current_time {
                    // Check if user has enough balance
                    if user_balance < schedule.amount {
                        // Skip this schedule if balance is insufficient
                        i += 1;
                        continue;
                    }

                    // Deduct from user balance and send payment
                    user_balance -= &schedule.amount;
                    self.send().direct_egld(&schedule.recipient, &schedule.amount);

                    // Record the transaction in history
                    let transaction = TransactionRecord {
                        recipient: schedule.recipient.clone(),
                        amount: schedule.amount.clone(),
                        timestamp: current_time,
                    };
                    self.transaction_history().insert(user.clone(), transaction);

                    if schedule.next_execution_time + schedule.frequency >= schedule.end_time {
                        schedules.remove(i);
                    } else {
                        schedules.get_mut(i).next_execution_time += schedule.frequency;
                        i += 1;
                    }
                } else {
                    i += 1;
                }
            }

            // Clone `user` to use it without moving
            self.balances().insert(user.clone(), user_balance);
            self.payment_schedules().insert(user, schedules);
        }
    }
    
    #[endpoint(depositFunds)]
    #[payable("EGLD")]
    fn deposit_funds(&self) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_or_single_esdt();

        let mut current_balance = self.balances().get(&caller).unwrap_or_default();
        current_balance += payment.amount;
        self.balances().insert(caller, current_balance);
    }

    #[view(getSchedule)]
    fn get_schedule(
        &self,
        user: ManagedAddress<Self::Api>,
        index: usize,
    ) -> Option<PaymentSchedule<Self::Api>> {
        self.payment_schedules()
            .get(&user) // Get the ManagedVec for the user
            .and_then(|schedules| core::prelude::v1::Some(schedules.get(index))) // Access the specific schedule by index
    }

    #[view(getSchedules)]
    fn get_schedules(
        &self,
        user: ManagedAddress<Self::Api>,
    ) -> ManagedVec<Self::Api, PaymentSchedule<Self::Api>> {
        self.payment_schedules()
            .get(&user)
            .unwrap_or_else(|| ManagedVec::new())
    }

    #[view(getTransactionHistory)]
    fn get_transaction_history(&self, user: ManagedAddress<Self::Api>) -> Option<TransactionRecord<Self::Api>> {
        self.transaction_history().get(&user)
    }

    #[view(getBalance)]
    fn get_balance(&self, user: ManagedAddress<Self::Api>) -> BigUint<Self::Api> {
        self.balances().get(&user).unwrap_or_default()
    }
}
