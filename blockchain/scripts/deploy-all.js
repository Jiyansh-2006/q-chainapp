const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of all contracts...\n");
  
  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📱 Deployer Address:", deployer.address);
    
    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer Balance:", hre.ethers.formatEther(balance), "ETH");
    
    // Check network
    const network = await hre.ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "| Chain ID:", network.chainId);
    console.log("=".repeat(50) + "\n");
    
    // ================== DEPLOY QTOKEN ==================
    console.log("📄 Deploying QToken...");
    const QToken = await hre.ethers.getContractFactory("QToken");
    const qToken = await QToken.deploy();
    await qToken.waitForDeployment();
    const qTokenAddress = await qToken.getAddress();
    
    console.log("✅ QToken deployed!");
    console.log("📍 Address:", qTokenAddress);
    
    // Get QToken details
    const qTokenName = await qToken.name();
    const qTokenSymbol = await qToken.symbol();
    const qTokenDecimals = await qToken.decimals();
    const qTokenTotalSupply = await qToken.totalSupply();
    const qTokenOwner = await qToken.owner();
    const qTokenBalance = await qToken.balanceOf(deployer.address);
    
    console.log("📊 QToken Details:");
    console.log("   Name:", qTokenName);
    console.log("   Symbol:", qTokenSymbol);
    console.log("   Decimals:", qTokenDecimals);
    console.log("   Total Supply:", hre.ethers.formatUnits(qTokenTotalSupply, qTokenDecimals));
    console.log("   Owner:", qTokenOwner);
    console.log("   Your Balance:", hre.ethers.formatUnits(qTokenBalance, qTokenDecimals), qTokenSymbol);
    console.log("\n" + "=".repeat(50) + "\n");
    
    // ================== DEPLOY QUANTUMNFT ==================
    console.log("📄 Deploying QuantumNFT...");
    const QuantumNFT = await hre.ethers.getContractFactory("QuantumNFT");
    const quantumNFT = await QuantumNFT.deploy();
    await quantumNFT.waitForDeployment();
    const quantumNFTAddress = await quantumNFT.getAddress();
    
    console.log("✅ QuantumNFT deployed!");
    console.log("📍 Address:", quantumNFTAddress);
    
    // Get QuantumNFT details
    const nftName = await quantumNFT.name();
    const nftSymbol = await quantumNFT.symbol();
    const nftOwner = await quantumNFT.owner();
    const mintPrice = await quantumNFT.mintPrice();
    const maxSupply = await quantumNFT.MAX_SUPPLY();
    const mintActive = await quantumNFT.mintActive();
    const totalMinted = await quantumNFT.totalMinted();
    
    console.log("📊 QuantumNFT Details:");
    console.log("   Name:", nftName);
    console.log("   Symbol:", nftSymbol);
    console.log("   Owner:", nftOwner);
    console.log("   Mint Price:", hre.ethers.formatEther(mintPrice), "ETH");
    console.log("   Max Supply:", maxSupply.toString());
    console.log("   Mint Active:", mintActive);
    console.log("   Total Minted:", totalMinted.toString());
    console.log("\n" + "=".repeat(50) + "\n");
    
    // ================== SAVE DEPLOYMENT INFO ==================
    const deploymentInfo = {
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        qToken: {
          address: qTokenAddress,
          name: qTokenName,
          symbol: qTokenSymbol,
          decimals: qTokenDecimals.toString(),
          totalSupply: hre.ethers.formatUnits(qTokenTotalSupply, qTokenDecimals),
          owner: qTokenOwner,
          deployerBalance: hre.ethers.formatUnits(qTokenBalance, qTokenDecimals)
        },
        quantumNFT: {
          address: quantumNFTAddress,
          name: nftName,
          symbol: nftSymbol,
          owner: nftOwner,
          mintPrice: hre.ethers.formatEther(mintPrice),
          maxSupply: maxSupply.toString(),
          mintActive: mintActive
        }
      }
    };
    
    // Create deployments folder
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save to deployments folder
    const filename = `deployment-${network.name}-${Date.now()}.json`;
    const deploymentPath = path.join(deploymentsDir, filename);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    // Save to config folder for frontend
    const configDir = path.join(__dirname, "..", "src", "config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const frontendConfig = {
      qTokenAddress: qTokenAddress,
      quantumNFTAddress: quantumNFTAddress,
      network: network.name,
      chainId: network.chainId.toString()
    };
    
    fs.writeFileSync(
      path.join(configDir, "contract-addresses.json"),
      JSON.stringify(frontendConfig, null, 2)
    );
    
    // Save individual files for easy access
    fs.writeFileSync(
      path.join(__dirname, "..", "qtoken-address.txt"),
      qTokenAddress
    );
    
    fs.writeFileSync(
      path.join(__dirname, "..", "quantumnft-address.txt"),
      quantumNFTAddress
    );
    
    console.log("💾 Deployment info saved to:", deploymentPath);
    console.log("💾 Frontend config saved to: src/config/contract-addresses.json");
    console.log("\n" + "=".repeat(50));
    console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("\n📋 For your frontend, use these addresses:");
    console.log(`   QToken: ${qTokenAddress}`);
    console.log(`   QuantumNFT: ${quantumNFTAddress}`);
    console.log("\n📋 Update your frontend config with these addresses.");
    
    // Verification instructions for testnets
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("\n🔍 To verify on Etherscan, run:");
      console.log(`   npx hardhat verify --network ${network.name} ${qTokenAddress}`);
      console.log(`   npx hardhat verify --network ${network.name} ${quantumNFTAddress}`);
    }
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    console.error("\n🔧 Full error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });