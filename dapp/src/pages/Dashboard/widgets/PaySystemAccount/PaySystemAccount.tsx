import { useEffect, useState } from 'react';
import { Label } from 'components/Label';
import { OutputContainer } from 'components/OutputContainer';
import { FormatAmount } from 'components/sdkDappComponents';
import { useDepositFundsTransaction, useGetAccountInfo, useGetActiveTransactionsStatus, useGetNetworkConfig, useGetPendingTransactions } from 'hooks';
import { useBalance } from './hooks';
import { Button } from 'components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

export const PaySystemAccount = () => {
  const { network } = useGetNetworkConfig();
  const [depositAmount, setDepositAmount] = useState('');

  const { success } = useGetActiveTransactionsStatus();
  const { isLoading, balance, fetchBalance } = useBalance();

  const { hasPendingTransactions } = useGetPendingTransactions();
  const { depositFundsTransaction } = useDepositFundsTransaction();

  useEffect(() => {
    if (success) {
      fetchBalance();
    }
  }, [success]);

  useEffect(() => {
    fetchBalance();
  }, []);

  const onSendDepositFundsTransaction = async () => {
    if (!depositAmount) {
      alert('Please fill in all required fields.');
      return;
    }

    await depositFundsTransaction({
      amount: parseFloat(depositAmount)
    });
  };

  return (
    <OutputContainer isLoading={isLoading}>
      <div className="flex items-center justify-between text-black" data-testid="topInfo">
        {/* Balance Section */}
        <div>
          <Label>Balance: </Label>
          <FormatAmount
            value={balance.toString()}
            egldLabel={network.egldLabel}
            data-testid="balance"
          />
        </div>

        {/* Deposit Section */}
        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder={`Amount (${network.egldLabel})`}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-48 focus:outline-none focus:ring focus:ring-blue-200"
          />
          <Button
            disabled={hasPendingTransactions}
            onClick={onSendDepositFundsTransaction}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded shadow hover:bg-blue-600 transition duration-200"
          >
            <FontAwesomeIcon icon={faPlus} className='mr-2' />
            Deposit Funds
          </Button>
        </div>
      </div>
    </OutputContainer>
  );
};
