import {
  Address,
  AbiRegistry,
  SmartContract,
  Interaction,
  ProxyNetworkProvider,
  ResultsParser,
  AddressValue,
  ContractFunction,
} from '@multiversx/sdk-core';
import { contractAddress } from 'config';
import { useGetNetworkConfig, useGetAccountInfo } from 'hooks';
import { useState, useCallback } from 'react';
import json from 'contracts/paysystem.abi.json';

export const useBalance = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccountInfo();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
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
      const interaction = new Interaction(contract, new ContractFunction('getBalance'), [
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
      if (!firstValue) {
        throw new Error('Invalid response format: Expected a number');
      }

      const balance = firstValue.valueOf();

      setBalance(balance);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, network.apiAddress]);

  return { isLoading, balance, fetchBalance };
};
