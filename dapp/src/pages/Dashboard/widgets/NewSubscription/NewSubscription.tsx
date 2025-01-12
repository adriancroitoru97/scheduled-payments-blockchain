import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'components/Button';
import { useAddScheduleTransaction, useGetPendingTransactions } from 'hooks';
import { useState } from 'react';

export const NewSubscription = () => {
  const { hasPendingTransactions } = useGetPendingTransactions();
  const { addScheduleTransaction } = useAddScheduleTransaction();

  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    frequency: '',
    start_time: '',
    end_time: ''
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const onSendAddScheduleTransaction = async () => {
    if (!formData.recipient || !formData.amount || !formData.frequency || !formData.start_time || !formData.end_time) {
      alert('Please fill in all required fields.');
      return;
    }

    await addScheduleTransaction({
      recipient: formData.recipient,
      amount: parseFloat(formData.amount),
      frequency: parseInt(formData.frequency, 10),
      start_time: new Date(formData.start_time).getTime() / 1000,
      end_time: new Date(formData.end_time).getTime() / 1000
    });
  };

  return (
    <div>
      <form className='flex flex-col gap-4'>
        <div className='flex flex-col gap-1'>
          <label htmlFor='recipient' className='text-sm font-medium'>Recipient Address</label>
          <input
            type='text'
            id='recipient'
            name='recipient'
            value={formData.recipient}
            onChange={handleChange}
            placeholder='Enter recipient address'
            className='w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300'
            required
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='amount' className='text-sm font-medium'>Amount (EGLD)</label>
          <input
            type='number'
            id='amount'
            name='amount'
            value={formData.amount}
            onChange={handleChange}
            placeholder='Enter amount in EGLD'
            className='w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300'
            required
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='frequency' className='text-sm font-medium'>Frequency (in hours)</label>
          <input
            type='number'
            id='frequency'
            name='frequency'
            value={formData.frequency}
            onChange={handleChange}
            placeholder='Enter frequency in hours'
            className='w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300'
            required
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='start_time' className='text-sm font-medium'>Start Time</label>
          <input
            type='datetime-local'
            id='start_time'
            name='start_time'
            value={formData.start_time}
            onChange={handleChange}
            className='w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300'
            required
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='end_time' className='text-sm font-medium'>End Time</label>
          <input
            type='datetime-local'
            id='end_time'
            name='end_time'
            value={formData.end_time}
            onChange={handleChange}
            className='w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300'
            required
          />
        </div>

        <Button
          disabled={hasPendingTransactions}
          onClick={onSendAddScheduleTransaction}
          data-testid='btnPingRaw'
          data-cy='transactionBtn'
          type='button'
          className='w-full py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300'
        >
          <FontAwesomeIcon icon={faPlus} className='mr-2' />
          Create Subscription
        </Button>
      </form>
    </div>
  );
};
