import { useCallback } from 'react';
import {
  removeAllSignedTransactions,
  removeAllTransactionsToSign
} from '@multiversx/sdk-dapp/services/transactions/clearTransactions';
import { contractAddress } from 'config';
import { signAndSendTransactions } from 'helpers/signAndSendTransactions';
import {
  useGetAccountInfo,
  useGetNetworkConfig,
} from 'hooks/sdkDappHooks';
import { GAS_PRICE, VERSION } from 'localConstants';
import { newTransaction } from 'helpers/sdkDappHelpers';
import { Address } from 'utils';

export const useAddScheduleTransaction = () => {
  const { network } = useGetNetworkConfig();
  const { address, account } = useGetAccountInfo();

  const clearAllTransactions = () => {
    removeAllSignedTransactions();
    removeAllTransactionsToSign();
  };

  const addScheduleTransaction = useCallback(
    async (
      {
        recipient,
        amount,
        frequency,
        start_time,
        end_time,
      }: {
        recipient: string;
        amount: number;
        frequency: number;
        start_time: number;
        end_time: number;
      }
    ) => {
      clearAllTransactions();

      // Convert parameters
      const amountInAtomic = BigInt(amount * 1e18).toString(16).padStart(16, "0"); // Pad to ensure even length
      const frequencyInSeconds = frequency * 3600; // Convert hours to seconds

      // Convert to hexadecimal format and ensure even length
      const frequencyHex = frequencyInSeconds.toString(16).padStart(8, "0");
      const startTimeHex = start_time.toString(16).padStart(8, "0");
      const endTimeHex = end_time.toString(16).padStart(8, "0");

      // Construct the data payload
      const data = `addSchedule@${Address.newFromBech32(recipient).toHex()}@${amountInAtomic}@${frequencyHex}@${startTimeHex}@0100000000${endTimeHex}`;

      const transaction = newTransaction({
        value: "0",
        data,
        receiver: contractAddress,
        gasLimit: 60000000,
        gasPrice: GAS_PRICE,
        chainID: network.chainId,
        nonce: account.nonce,
        sender: address,
        version: VERSION,
      });

      await signAndSendTransactions({
        transactions: [transaction],
      });
    },
    [network.chainId, account.nonce, address]
  );

  return {
    addScheduleTransaction,
  };
};
