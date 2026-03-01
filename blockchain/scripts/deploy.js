const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting QToken deployment...\n");
  
  try {
    // Get deployer account using hre.ethers
    const [deployer] = await hre.ethers.getSigners();
    console.log("📱 Deployer Address:", deployer.address);
    
    // Check balance using provider
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer Balance:", hre.ethers.formatEther(balance), "ETH");
    
    // Check network
    const network = await hre.ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "| Chain ID:", network.chainId);
    
    // If on testnet and low balance, warn user
    if (network.name !== "localhost" && network.name !== "hardhat") {
      if (balance < hre.ethers.parseEther("0.01")) {
        console.warn("⚠️  Low balance. You need test ETH for gas fees.");
        console.log("\n💡 Get test ETH from a faucet for:", network.name);
        console.log("   Your address:", deployer.address);
        return;
      }
    }
    
    console.log("\n📄 Compiling and deploying QToken contract...");
    
    // Deploy QToken
    const QToken = await hre.ethers.getContractFactory("QToken");
    const qToken = await QToken.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await qToken.waitForDeployment();
    
    const contractAddress = await qToken.getAddress();
    console.log("\n✅ DEPLOYMENT SUCCESSFUL!");
    console.log("📍 Contract Address:", contractAddress);
    
    // Get transaction details if available
    const deploymentTx = qToken.deploymentTransaction();
    if (deploymentTx) {
      console.log("📝 Transaction Hash:", deploymentTx.hash);
    }
    
    // Get contract details
    console.log("\n📊 Contract Details:");
    const name = await qToken.name();
    const symbol = await qToken.symbol();
    const decimals = await qToken.decimals();
    const totalSupply = await qToken.totalSupply();
    const owner = await qToken.owner();
    
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Decimals:", decimals.toString());
    console.log("   Total Supply:", hre.ethers.formatUnits(totalSupply, decimals));
    console.log("   Owner:", owner);
    
    // Save deployment info
    const deploymentInfo = {
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      contract: {
        name: "QToken",
        address: contractAddress,
        deployer: deployer.address,
        transactionHash: deploymentTx ? deploymentTx.hash : null,
        timestamp: new Date().toISOString()
      },
      details: {
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: hre.ethers.formatUnits(totalSupply, decimals),
        owner
      }
    };
    
    // Create deployments folder if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save to file
    const filename = `deployment-${network.name}-${Date.now()}.json`;
    const filePath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n💾 Deployment info saved to:", filePath);
    
    console.log("\n🎉 Deployment complete!");
    
    // Verification instructions for testnets
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("\n🔍 To verify on Etherscan, run:");
      console.log(`   npx hardhat verify --network ${network.name} ${contractAddress}`);
    }
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Get test ETH from a faucet first!");
    }
    
    if (error.message.includes("network")) {
      console.log("\n💡 Check your hardhat.config.js has correct network settings");
    }
    
    console.log("\n🔧 Full error for debugging:", error);
    process.exit(1);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });