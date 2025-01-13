import {
  Address,
  AbiRegistry,
  SmartContract,
  Interaction,
  ProxyNetworkProvider,
  TypedValue,
  ResultsParser,
  AddressValue,
  ContractFunction,
} from '@multiversx/sdk-core';
import { contractAddress } from 'config';
import { useGetNetworkConfig, useGetAccountInfo } from 'hooks';
import { useState, useCallback } from 'react';
import json from 'contracts/paysystem.abi.json';

interface PaymentSchedule {
  recipient: string;
  amount: string;
  frequency: string;
  nextExecutionTime: string;
  endTime: string;
}

export const useGetSubscriptions = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccountInfo();
  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initialize network provider
      const provider = new ProxyNetworkProvider(network.apiAddress);

      // Load ABI registry and smart contract
      const abi = AbiRegistry.create(json);
      const contract = new SmartContract({
        address: new Address(contractAddress),
        abi: abi,
      });

      // Create interaction
      const interaction = new Interaction(contract, new ContractFunction('getSchedules'), [
        new AddressValue(new Address(address)),
      ]);

      // Query the smart contract
      const query = interaction.buildQuery();
      const queryResponse = await provider.queryContract(query);

      // Parse the response
      const resultsParser = new ResultsParser();
      const { firstValue } = resultsParser.parseQueryResponse(
        queryResponse,
        interaction.getEndpoint()
      );

      // Ensure response is a List
      if (!firstValue) {
        throw new Error('Invalid response format: Expected a List');
      }

      // Extract items from the List
      const items = firstValue.valueOf();

      // Map items to PaymentSchedule objects
      const schedules = items.map((item: TypedValue) => {
        const fields = item.valueOf(); // Extract individual fields

        return {
          recipient: fields.recipient.valueOf().bech32(), // Convert address to bech32 format
          amount: parseInt((BigInt(fields.amount.valueOf().toString()) * BigInt(10 ** 6) / BigInt(10 ** 18)).toString()) / 1000000, // Convert amount to human-readable format by dividing by 10^18
          frequency: (BigInt(fields.frequency.valueOf().toString()) / BigInt(3600)).toString(), // Convert frequency from seconds to hours
          nextExecutionTime: new Date(Number(fields.next_execution_time.valueOf().toString()) * 1000), // Convert UNIX timestamp (seconds) to Date
          endTime: new Date(Number(fields.end_time.valueOf().toString()) * 1000), // Convert UNIX timestamp (seconds) to Date
        };        
      });

      setSchedules(schedules);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, network.apiAddress]);

  return { isLoading, schedules, fetchSchedules };
};

