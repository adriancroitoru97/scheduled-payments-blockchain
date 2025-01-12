import { useState, useCallback } from 'react';
import { contractAddress } from 'config';
import { useGetAccountInfo, useGetNetworkConfig } from 'hooks/sdkDappHooks';
import { Address, BigUIntValue, ResultsParser, TypedValue } from '@multiversx/sdk-core';
import { smartContract } from 'utils/smartContract';

const decodePaymentSchedules = (hexString: string) => {
  const buffer = Buffer.from(hexString, 'hex');
  const schedules = [];
  let offset = 0;

  console.log('Buffer length:', buffer.length);

  while (offset < buffer.length) {
    // Validate remaining buffer length before decoding each field
    if (offset + 32 > buffer.length) {
      throw new Error('Insufficient data for recipient field');
    }

    // Decode `recipient` (32 bytes for an Address)
    const recipientHex = buffer.subarray(offset, offset + 32).toString('hex');
    const recipient = Address.fromHex(recipientHex).bech32();
    console.log("recipient", recipient);
    offset += 32;

    if (offset + 8 > buffer.length) {
      throw new Error('Insufficient data for amount field');
    }

    // Decode `amount` (BigUint, 16 bytes)
    const amountBuffer = buffer.subarray(offset, offset + 8);
    const amount = BigInt(`0x${amountBuffer.toString('hex')}`);
    console.log("amount", amount);
    offset += 8;

    if (offset + 8 > buffer.length) {
      throw new Error('Insufficient data for frequency field');
    }

    // Decode `frequency` (u64, 8 bytes)
    const frequency = buffer.readBigUInt64LE(offset);
    console.log("frequency", frequency);
    offset += 8;

    if (offset + 8 > buffer.length) {
      throw new Error('Insufficient data for next_execution_time field');
    }

    // Decode `next_execution_time` (u64, 8 bytes)
    const nextExecutionTime = buffer.readBigUInt64LE(offset);
    offset += 8;

    if (offset + 8 > buffer.length) {
      throw new Error('Insufficient data for end_time field');
    }

    // Decode `end_time` (u64, 8 bytes)
    const endTime = buffer.readBigUInt64LE(offset);
    offset += 8;

    // Add the schedule to the result
    schedules.push({
      recipient,
      amount: amount.toString(),
      frequency: Number(frequency),
      nextExecutionTime: new Date(Number(nextExecutionTime) * 1000),
      endTime: new Date(Number(endTime) * 1000),
    });
  }

  console.log('Decoded schedules:', schedules);
  return schedules;
};


export const useGetSubscriptions = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccountInfo();
  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
  
      const encodedAddress = Address.fromBech32(address).hex();
      const queryData = {
        scAddress: contractAddress,
        funcName: 'getSchedules',
        args: [encodedAddress],
      };
  
      const response = await fetch(`${network.apiAddress}/vm-values/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryData),
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching schedules: ${response.statusText}`);
      }
  
      const result = await response.json();
      const returnData = result.data.data.returnData;
  
      console.log('Encoded return data:', returnData);
  
      const decodedReturnData = returnData.map((base64Encoded: string) =>
        Buffer.from(base64Encoded, 'base64').toString('hex')
      );
      console.log('Decoded return data:', decodedReturnData);
  
      const schedules = decodePaymentSchedules(decodedReturnData[0]);
      console.log('Decoded schedules:', schedules);
  
      setSchedules(schedules);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, network.apiAddress]);
  
  return { isLoading, schedules, fetchSchedules };
};
