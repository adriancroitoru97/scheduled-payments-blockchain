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

export const useDepositFundsTransaction = () => {
  const { network } = useGetNetworkConfig();
  const { address, account } = useGetAccountInfo();

  const clearAllTransactions = () => {
    removeAllSignedTransactions();
    removeAllTransactionsToSign();
  };

  const depositFundsTransaction = useCallback(
    async (
      {
        amount,
      }: {
        amount: number;
      }
    ) => {
      clearAllTransactions();

      // Construct the data payload
      const data = `depositFunds`;

      const transaction = newTransaction({
        value: (amount * 1e18).toString(),
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
    depositFundsTransaction,
  };
};
