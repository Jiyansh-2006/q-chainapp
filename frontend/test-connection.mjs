// test-connection.mjs (ES Module)
import { ethers } from 'ethers';

async function test() {
  console.log("Testing connection to localhost...");
  
  // Connect to localhost
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  
  // Hardhat test account
  const testAddress = '0xf39Fd6e51aad8F8F6c6e88f2b2727fc1ffb92266';
  
  try {
    // Test 1: Get ETH balance
    const ethBalance = await provider.getBalance(testAddress);
    console.log('✅ ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
    
    // Test 2: Get block number
    const block = await provider.getBlockNumber();
    console.log('✅ Current block:', block);
    
    // Test 3: Get network
    const network = await provider.getNetwork();
    console.log('✅ Network chain ID:', network.chainId);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

test();