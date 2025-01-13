import { useEffect } from 'react';
import { OutputContainer } from 'components/OutputContainer';
import { useGetActiveTransactionsStatus } from 'hooks';
import { useGetTransactions } from './hooks';
import { TransactionsPropsType } from './types';

const COLUMNS = ['Recipient', 'Amount (EGLD)', 'Date'];

export const Transactions = (props: TransactionsPropsType) => {
  const { success } = useGetActiveTransactionsStatus();
  const { isLoading, transactions, fetchTransactions } = useGetTransactions();

  useEffect(() => {
    if (success) {
      fetchTransactions();
    }
  }, [success]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (!isLoading && transactions.length === 0) {
    return (
      <OutputContainer>
        <p className="text-gray-400">No transactions found</p>
      </OutputContainer>
    );
  }

  return (
    <div className="flex flex-col">
      <OutputContainer isLoading={isLoading} className="p-0">
        <div className="w-full h-full overflow-x-auto bg-white shadow rounded-lg">
          <table className="w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-gray-50">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="relative group">
                      <span className="inline-block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap group-hover:hidden">
                        {transaction.recipient}
                      </span>
                      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 top-full mt-1 shadow-lg">
                        {transaction.recipient}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {transaction.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {transaction.timestamp.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OutputContainer>
    </div>
  );
};
