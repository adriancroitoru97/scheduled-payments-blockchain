import { useEffect } from 'react';
import { OutputContainer } from 'components/OutputContainer';
import { useCancelSubscriptionTransaction, useGetActiveTransactionsStatus, useGetPendingTransactions } from 'hooks';
import { useGetSubscriptions } from './hooks';
import { TransactionsPropsType } from './types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const COLUMNS = [
  'Recipient',
  'Amount (EGLD)',
  'Frequency (hours)',
  'Next Execution Time',
  'End Time',
  'Actions',
];

export const Subscriptions = (props: TransactionsPropsType) => {
  const { success } = useGetActiveTransactionsStatus();
  const { isLoading, schedules, fetchSchedules } = useGetSubscriptions();

  const { hasPendingTransactions } = useGetPendingTransactions();
  const { cancelSubscriptionTransaction } = useCancelSubscriptionTransaction();

  useEffect(() => {
    if (success) {
      fetchSchedules();
    }
  }, [success]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDelete = async (index: number) => {
    await cancelSubscriptionTransaction({
      index: index
    });
  };

  if (!isLoading && schedules.length === 0) {
    return (
      <OutputContainer>
        <p className="text-gray-400">No subscriptions found</p>
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
              {schedules.map((schedule, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="relative group">
                      <span className="inline-block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap group-hover:hidden">
                        {schedule.recipient}
                      </span>
                      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 top-full mt-1 shadow-lg">
                        {schedule.recipient}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {schedule.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {schedule.frequency}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {schedule.nextExecutionTime.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {schedule.endTime.toLocaleString()}
                  </td>
                  <td className="px-4 py-6 text-sm text-gray-700 flex justify-center items-center">
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Delete Subscription"
                      disabled={hasPendingTransactions}
                    >
                      <FontAwesomeIcon icon={faTrash} size='lg'/>
                    </button>
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
