#!/bin/bash

# Path to the mxpy command and required pem file
MXPY_COMMAND="mxpy --verbose contract call erd1qqqqqqqqqqqqqpgqwjp236rchkw2w8k4s7qlh6u46045g6k67mtq950023 \
  --recall-nonce \
  --pem=new_wallet.pem \
  --gas-limit=5000000 \
  --function=\"executePayments\" \
  --send \
  --proxy=https://devnet-gateway.multiversx.com \
  --chain=D"

# Run the command in an infinite loop
while true; do
  echo "Executing contract function at $(date)"
  eval $MXPY_COMMAND

  # Wait for 1 minute before the next execution
  sleep 60
done
