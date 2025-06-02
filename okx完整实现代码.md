// Token Swap using OKX Onchain gateway API on Base
// Required packages
import { Web3 } from 'web3';
import axios from 'axios';
import * as dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

// Load environment variables
dotenv.config();

// Connect to Base network
const web3 = new Web3('https://mainnet.base.org');

// Your wallet information - REPLACE WITH YOUR OWN VALUES
const WALLET_ADDRESS: string = process.env.EVM_WALLET_ADDRESS || '0xYourWalletAddress';
const PRIVATE_KEY: string = process.env.EVM_PRIVATE_KEY || 'YourPrivateKey'; // Without 0x prefix

// Token addresses for swap on Base
const ETH_ADDRESS: string = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Native ETH
const USDC_ADDRESS: string = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

// Chain ID for Base
const chainId: string = '8453';

// API URL
// const baseUrl: string = 'https://web3.okx.com/api/v5/';
const baseUrl: string = 'https://beta.okex.org/api/v5/'

// Amount to swap in smallest unit (approx $1 of ETH)
// 1 ETH = 10^18 wei, so 0.0005 ETH = 5 * 10^14 wei at ~$2000/ETH
const SWAP_AMOUNT: string = '500000000000000'; // 0.0005 ETH (approx $1)
const SLIPPAGE: string = '0.5'; // 0.5% slippage tolerance

// Define type for error handling
interface TxErrorInfo {
  error: string;
  message: string;
  action: string;
}

// ===== Get Header Function =====

export function getHeaders(timestamp: string, method: string, requestPath: string, queryString = "") {
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE;
    const projectId = process.env.OKX_PROJECT_ID;

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
        throw new Error("Missing required environment variables");
    }

    const stringToSign = timestamp + method + requestPath + queryString;
    return {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": apiKey,
        "OK-ACCESS-SIGN": CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(stringToSign, secretKey)
        ),
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": apiPassphrase,
        "OK-ACCESS-PROJECT": projectId,
    };
}

// ===== Token Approval Functions =====

/**
 * Check token allowance for DEX
 * @param tokenAddress - Token contract address
 * @param ownerAddress - Your wallet address
 * @param spenderAddress - DEX spender address
 * @returns Allowance amount
 */
async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<bigint> {
  const tokenABI = [
    {
      "constant": true,
      "inputs": [
        { "name": "_owner", "type": "address" },
        { "name": "_spender", "type": "address" }
      ],
      "name": "allowance",
      "outputs": [{ "name": "", "type": "uint256" }],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
  try {
    const allowance = await tokenContract.methods.allowance(ownerAddress, spenderAddress).call();
    return BigInt(String(allowance));
  } catch (error) {
    console.error('Failed to query allowance:', error);
    throw error;
  }
}

/**
 * Get approve transaction data from OKX DEX API
 * @param tokenAddress - Token contract address
 * @param amount - Amount to approve
 * @returns Approval transaction data
 */
async function getApproveTransaction(
  tokenAddress: string,
  amount: string
): Promise<any> {
  try {
    const path = 'dex/aggregator/approve-transaction';
    const url = `${baseUrl}${path}`;
    const params = {
      chainId: chainId,
      tokenContractAddress: tokenAddress,
      approveAmount: amount
    };

    // Prepare authentication
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

    const response = await axios.get(url, { params, headers });

    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`API Error: ${response.data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to get approval transaction data:', (error as Error).message);
    throw error;
  }
}

/**
 * Get transaction gas limit from Onchain gateway API
 * @param fromAddress - Sender address
 * @param toAddress - Target contract address
 * @param txAmount - Transaction amount (0 for approvals)
 * @param inputData - Transaction calldata
 * @returns Estimated gas limit
 */
async function getGasLimit(
  fromAddress: string,
  toAddress: string,
  txAmount: string = '0',
  inputData: string = ''
): Promise<string> {
  try {
    const path = 'dex/pre-transaction/gas-limit';
    const url = `https://web3.okx.com/api/v5/${path}`;
    console.log({path: path, url:url})

    const body = {
      chainIndex: chainId,
      fromAddress: fromAddress,
      toAddress: toAddress,
      txAmount: txAmount,
      extJson: {
        inputData: inputData
      }
    };

    // Prepare authentication with body included in signature
    const bodyString = JSON.stringify(body);
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const headers = getHeaders(timestamp, 'POST', requestPath, bodyString);

    const response = await axios.post(url, body, { headers });

    if (response.data.code === '0') {
      return response.data.data[0].gasLimit;
    } else {
      throw new Error(`API Error: ${response.data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to get gas limit:', (error as Error).message);
    throw error;
  }
}

/**
 * Sign and send approve transaction
 * @param tokenAddress - Token to approve
 * @param amount - Amount to approve
 * @returns Order ID of the approval transaction
 */
async function approveToken(tokenAddress: string, amount: string): Promise<string | null> {
  const spenderAddress = '0x6b2C0c7be2048Daa9b5527982C29f48062B34D58'; // Base DEX spender
  const currentAllowance = await checkAllowance(tokenAddress, WALLET_ADDRESS, spenderAddress);

  if (currentAllowance >= BigInt(amount)) {
    console.log('Sufficient allowance already exists');
    return null;
  }

  console.log('Insufficient allowance, approving tokens...');

  // Get approve transaction data from OKX DEX API
  const approveData = await getApproveTransaction(tokenAddress, amount);

  // Get accurate gas limit using Onchain gateway API
  const gasLimit = await getGasLimit(WALLET_ADDRESS, tokenAddress, '0', approveData.data);

  // Get current gas price (can also use Onchain gateway API)
  const gasPrice = await web3.eth.getGasPrice();
  const adjustedGasPrice = BigInt(gasPrice) * BigInt(15) / BigInt(10); // 1.5x for faster confirmation

  // Get current nonce
  const nonce = await web3.eth.getTransactionCount(WALLET_ADDRESS, 'latest');

  // Create transaction object
  const txObject = {
    from: WALLET_ADDRESS,
    to: tokenAddress,
    data: approveData.data,
    value: '0',
    gas: gasLimit,
    gasPrice: adjustedGasPrice.toString(),
    nonce: nonce
  };

  // Sign transaction
  const signedTx = await web3.eth.accounts.signTransaction(txObject, PRIVATE_KEY);

  // Broadcast transaction using Onchain gateway API
  try {
    const path = 'dex/pre-transaction/broadcast-transaction';
    const url = `${baseUrl}${path}`;

    const broadcastData = {
      signedTx: signedTx.rawTransaction,
      chainIndex: chainId,
      address: WALLET_ADDRESS
    };

    // Prepare authentication with body included in signature
    const bodyString = JSON.stringify(broadcastData);
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const headers = getHeaders(timestamp, 'POST', requestPath, bodyString);

    const response = await axios.post(url, broadcastData, { headers });

    if (response.data.code === '0') {
      const orderId = response.data.data[0].orderId;
      console.log(`Approval transaction broadcast successfully, Order ID: ${orderId}`);

      // Monitor transaction status
      await trackTransaction(orderId);

      return orderId;
    } else {
      throw new Error(`API Error: ${response.data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to broadcast approval transaction:', error);
    throw error;
  }
}

// ===== Swap Functions =====

/**
 * Get swap quote from DEX API
 * @param fromTokenAddress - Source token address
 * @param toTokenAddress - Destination token address
 * @param amount - Amount to swap
 * @param userAddress - User wallet address
 * @param slippage - Maximum slippage (e.g., "0.5" for 0.5%)
 * @returns Swap quote
 */
async function getSwapQuote(
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  userAddress: string,
  slippage: string = '0.5'
): Promise<any> {
  try {
    const path = 'dex/aggregator/swap';
    const url = `${baseUrl}${path}`;

    const params = {
      chainId: chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress: userAddress,
      slippage
    };

    // Prepare authentication
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

    const response = await axios.get(url, { params, headers });

    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`API Error: ${response.data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to get swap quote:', (error as Error).message);
    throw error;
  }
}

/**
 * Get swap transaction data from DEX API
 * @param fromTokenAddress - Source token address
 * @param toTokenAddress - Destination token address
 * @param amount - Amount to swap
 * @param userAddress - User wallet address
 * @param slippage - Maximum slippage
 * @returns Swap transaction data
 */
async function getSwapTransaction(
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  userAddress: string,
  slippage: string = '0.5'
): Promise<any> {
  try {
    const path = 'dex/aggregator/swap';
    const url = `${baseUrl}${path}`;

    const params = {
      chainId: chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress: userAddress,
      slippage
    };

    // Prepare authentication
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

    const response = await axios.get(url, { params, headers });

    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`API Error: ${response.data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to get swap transaction data:', (error as Error).message);
    throw error;
  }
}

/**
 * Execute token swap
 * @param fromTokenAddress - Source token address
 * @param toTokenAddress - Destination token address
 * @param amount - Amount to swap
 * @param slippage - Maximum slippage
 * @returns Order ID of the swap transaction
 */
async function executeSwap(
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  slippage: string = '0.5'
): Promise<string> {
  // 1. Check allowance and approve if necessary (skip for native token)
  if (fromTokenAddress !== ETH_ADDRESS) {
    await approveToken(fromTokenAddress, amount);
  }

  // 2. Get swap transaction data
  const swapData = await getSwapTransaction(fromTokenAddress, toTokenAddress, amount, WALLET_ADDRESS, slippage);
  const txData = swapData.tx;
  console.log("Swap TX data received");

  // 3. Get accurate gas limit using Onchain gateway API
  const gasLimit = await getGasLimit(
    WALLET_ADDRESS,
    txData.to,
    txData.value || '0',
    txData.data
  );
  console.log("Gas limit received");

  // 4. Get current nonce
  const nonce = await web3.eth.getTransactionCount(WALLET_ADDRESS, 'latest');
  console.log("Nonce received");

  // 5. Get current gas price and adjust for faster confirmation
  const gasPrice = await web3.eth.getGasPrice();
  const adjustedGasPrice = BigInt(gasPrice) * BigInt(15) / BigInt(10); // 1.5x for faster confirmation
  console.log("Gas price received");

  // 6. Create transaction object
  const txObject = {
    from: WALLET_ADDRESS,
    to: txData.to,
    data: txData.data,
    value: txData.value || '0',
    gas: gasLimit,
    gasPrice: adjustedGasPrice.toString(),
    nonce: nonce
  };
  console.log("TX build complete");

  // 7. Sign transaction
  const signedTx = await web3.eth.accounts.signTransaction(txObject, PRIVATE_KEY);
  console.log("TX signed");

  // 8. Broadcast transaction using Onchain gateway API
  try {
    const path = 'dex/pre-transaction/broadcast-transaction';
    const url = `https://web3.okx.com/api/v5/${path}`;

    const broadcastData = {
      signedTx: signedTx.rawTransaction,
      chainIndex: chainId,
      address: WALLET_ADDRESS
    };

    // Prepare authentication with body included in signature
    const bodyString = JSON.stringify(broadcastData);
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const headers = getHeaders(timestamp, 'POST', requestPath, bodyString);

    const response = await axios.post(url, broadcastData, { headers });

    if (response.data.code === '0') {
      const orderId = response.data.data[0].orderId;
      console.log(`Swap transaction broadcast successfully, Order ID: ${orderId}`);

      // 9. Monitor transaction status
      await trackTransaction(orderId);

      return orderId;
    } else {
      throw new Error(`API Error: ${response.data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to broadcast swap transaction:', error);
    throw error;
  }
}

// ===== Transaction Monitoring =====

/**
 * Monitor transaction status
 * @param orderId - Order ID from broadcast response
 * @param intervalMs - Polling interval in milliseconds
 * @param timeoutMs - Maximum time to wait
 * @returns Final transaction status
 */
async function trackTransaction(
  orderId: string,
  intervalMs: number = 5000,
  timeoutMs: number = 300000
): Promise<any> {
  console.log(`Monitoring transaction with Order ID: ${orderId}`);

  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < timeoutMs) {
    // Get transaction status
    try {
      const path = 'dex/post-transaction/orders';
      const url = `https://web3.okx.com/api/v5/${path}`;

      const params = {
        orderId: orderId,
        chainIndex: chainId,
        address: WALLET_ADDRESS,
        limit: '1'
      };

      // Prepare authentication
      const timestamp = new Date().toISOString();
      const requestPath = `/api/v5/${path}`;
      const queryString = "?" + new URLSearchParams(params).toString();
      const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

      const response = await axios.get(url, { params, headers });
      
      if (response.data.code === '0' && response.data.data && response.data.data.length > 0) {
        if (response.data.data[0].orders && response.data.data[0].orders.length > 0) {
          const txData = response.data.data[0].orders[0];
          
          // Use txStatus to match the API response
          const status = txData.txStatus;

          // Only log when status changes
          if (status !== lastStatus) {
            lastStatus = status;

            if (status === '1') {
              console.log(`Transaction pending: ${txData.txHash || 'Hash not available yet'}`);
            } else if (status === '2') {
              console.log(`Transaction successful: https://web3.okx.com/explorer/base/tx/${txData.txHash}`);
              return txData;
            } else if (status === '3') {
              const failReason = txData.failReason || 'Unknown reason';
              const errorMessage = `Transaction failed: ${failReason}`;

              console.error(errorMessage);

              const errorInfo = handleTransactionError(txData);
              console.log(`Error type: ${errorInfo.error}`);
              console.log(`Suggested action: ${errorInfo.action}`);

              throw new Error(errorMessage);
            }
          }
        } else {
          console.log(`No orders found for Order ID: ${orderId}`);
        }
      }
    } catch (error) {
      console.warn('Error checking transaction status:', (error as Error).message);
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Transaction monitoring timed out');
}

/**
 * Comprehensive error handling with failReason
 * @param txData - Transaction data from post-transaction/orders
 * @returns Structured error information
 */
function handleTransactionError(txData: any): TxErrorInfo {
  const failReason = txData.failReason || 'Unknown reason';

  // Log the detailed error
  console.error(`Transaction failed with reason: ${failReason}`);

  // Default error handling
  return {
    error: 'TRANSACTION_FAILED',
    message: failReason,
    action: 'Try again or contact support'
  };
}

// ===== Main Function =====

/**
 * Main function to execute ETH to USDC swap on Base
 */
async function main(): Promise<void> {
  try {
    console.log('Starting ETH to USDC swap on Base using Onchain gateway API');

    // Execute swap from ETH to USDC on Base
    const orderId = await executeSwap(
      ETH_ADDRESS,    // From ETH on Base
      USDC_ADDRESS,   // To USDC on Base
      SWAP_AMOUNT,    // Amount in ETH's smallest unit (0.0005 ETH ≈ $1)
      SLIPPAGE        // 0.5% slippage
    );

    // Get final transaction details
    try {
      const path = 'dex/post-transaction/orders';
      const url = `https://web3.okx.com/api/v5/${path}`;

      const params = {
        orderId: orderId,
        chainIndex: chainId
      };

      // Prepare authentication
      const timestamp = new Date().toISOString();
      const requestPath = `/api/v5/${path}`;
      const queryString = "?" + new URLSearchParams(params).toString();
      const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

      const response = await axios.get(url, { params, headers });

      if (response.data.code === '0' && response.data.data && response.data.data.length > 0) {
        console.log('Transaction Hash:', response.data.data[0].txHash);
      }
    } catch (error) {
      console.error('Failed to get final transaction details:', (error as Error).message);
    }
  } catch (error) {
    console.error('Swap failed:', (error as Error).message);
  }
}

// Execute the main function
main();
