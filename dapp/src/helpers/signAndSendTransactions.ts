import { Transaction } from 'types';

import { refreshAccount, sendTransactions } from './sdkDappHelpers';

type SignAndSendTransactionsProps = {
  transactions: Transaction[];
};

export const signAndSendTransactions = async ({
  transactions,
}: SignAndSendTransactionsProps) => {
  await refreshAccount();

  const { sessionId } = await sendTransactions({
    transactions,
    redirectAfterSign: false,
  });

  return sessionId;
};
