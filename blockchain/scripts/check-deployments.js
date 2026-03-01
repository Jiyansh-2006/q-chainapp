const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking deployments...");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Your address:", signer.address);
  
  // Check ETH balance
  const ethBalance = await hre.ethers.provider.getBalance(signer.address);
  console.log("ETH Balance:", hre.ethers.formatEther(ethBalance), "ETH");
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name, "| Chain ID:", network.chainId);
  
  // Look for QToken deployment files
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (fs.existsSync(deploymentsDir)) {
    console.log("\n📁 Found deployments:");
    const files = fs.readdirSync(deploymentsDir);
    files.forEach(file => {
      console.log("  -", file);
    });
  } else {
    console.log("\n❌ No deployments folder found");
  }
}

main().catch(console.error);