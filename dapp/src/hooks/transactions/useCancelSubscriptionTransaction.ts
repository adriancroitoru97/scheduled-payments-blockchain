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

export const useCancelSubscriptionTransaction = () => {
  const { network } = useGetNetworkConfig();
  const { address, account } = useGetAccountInfo();

  const clearAllTransactions = () => {
    removeAllSignedTransactions();
    removeAllTransactionsToSign();
  };

  const cancelSubscriptionTransaction = useCallback(
    async (
      {
        index,
      }: {
        index: number;
      }
    ) => {
      clearAllTransactions();

      const indexHex = index.toString(16).padStart(8, "0");

      // Construct the data payload
      const data = `cancelSchedule@${indexHex}`;

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
    cancelSubscriptionTransaction,
  };
};
