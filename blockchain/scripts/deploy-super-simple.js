async function main() {
  console.log("🚀 Deploying SimpleQToken to Sepolia...");
  
  try {
    // Get the deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get balance
    const balance = await deployer.getBalance();
    console.log("Deployer balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Check if we have enough ETH
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
      console.error("\n❌ Insufficient ETH for deployment!");
      console.log("Please get test ETH from:");
      console.log("1. https://www.infura.io/faucet/sepolia");
      console.log("2. https://faucet.quicknode.com/ethereum/sepolia");
      console.log("\n💡 Make sure to use this address:", deployer.address);
      return;
    }
    
    console.log("\n📄 Deploying SimpleQToken contract...");
    
    // Get the contract factory
    const SimpleQToken = await ethers.getContractFactory("SimpleQToken");
    
    // Deploy the contract
    const simpleQToken = await SimpleQToken.deploy();
    
    console.log("⏳ Waiting for deployment to be confirmed...");
    await simpleQToken.deployed();
    
    console.log("\n✅ CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("📍 Contract address:", simpleQToken.address);
    console.log("📝 Transaction hash:", simpleQToken.deployTransaction.hash);
    
    // Get contract info
    console.log("\n📊 Contract details:");
    console.log("Name:", await simpleQToken.name());
    console.log("Symbol:", await simpleQToken.symbol());
    console.log("Decimals:", (await simpleQToken.decimals()).toString());
    console.log("Total Supply:", ethers.utils.formatUnits(await simpleQToken.totalSupply(), 18));
    
    console.log("\n🎉 Deployment complete!");
    console.log("\n📋 Add this to your frontend config:");
    console.log(`In src/config/blockchain.ts, update:`);
    console.log(`11155111: '${simpleQToken.address}'`);
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Get test ETH from a Sepolia faucet");
    }
    
    if (error.message.includes("network")) {
      console.log("\n💡 Check your .env file has correct SEPOLIA_RPC_URL");
    }
    
    // Show more details for debugging
    console.log("\n🔧 Error details:", error);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });