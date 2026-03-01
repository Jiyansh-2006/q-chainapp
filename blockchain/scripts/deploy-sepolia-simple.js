const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying QToken to Sepolia...\n");
  
  // Get the deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Get balance
  const balance = await deployer.getBalance();
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "ETH\n");
  
  if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
    console.error("❌ Insufficient ETH! Get test ETH from:");
    console.error("   https://www.infura.io/faucet/sepolia");
    process.exit(1);
  }
  
  console.log("Deploying QToken...");
  const QToken = await hre.ethers.getContractFactory("QToken");
  const qToken = await QToken.deploy();
  
  console.log("Waiting for deployment...");
  await qToken.deployed();
  
  console.log("\n✅ Success!");
  console.log("Contract address:", qToken.address);
  console.log("Transaction hash:", qToken.deployTransaction.hash);
  
  // Save address to file
  const fs = require("fs");
  const addressFile = "deployed-address.txt";
  fs.writeFileSync(addressFile, qToken.address);
  console.log(`\n📝 Address saved to ${addressFile}`);
  
  console.log("\n📋 Update your frontend:");
  console.log(`In src/config/blockchain.ts, set:`);
  console.log(`11155111: '${qToken.address}'`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });