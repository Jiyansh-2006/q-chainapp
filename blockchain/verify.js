const { ethers } = require("hardhat");

async function verify() {
  console.log("🔍 Verifying installation...\n");
  
  try {
    // Check Hardhat version
    console.log("1. Checking Hardhat...");
    const hardhat = require("hardhat");
    console.log("   ✅ Hardhat loaded");
    
    // Check ethers
    console.log("\n2. Checking ethers...");
    console.log("   ✅ Ethers version:", ethers.version);
    
    // Check network
    console.log("\n3. Checking network...");
    const [deployer] = await ethers.getSigners();
    console.log("   ✅ Deployer address:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("   ✅ Deployer balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Check contract compilation
    console.log("\n4. Checking contract compilation...");
    const QToken = await ethers.getContractFactory("QToken");
    console.log("   ✅ QToken contract factory created");
    
    console.log("\n🎉 All checks passed! Installation is successful.");
    console.log("\n📋 Next:");
    console.log("   Run: npm run node");
    console.log("   Then: npm run deploy");
    
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error("1. Make sure you're in the blockchain folder");
    console.error("2. Run: npm install --legacy-peer-deps");
    console.error("3. Run: npm run compile");
  }
}

verify().catch(console.error);