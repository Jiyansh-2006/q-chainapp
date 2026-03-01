const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking all balances...\n");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Account:", signer.address);
  
  // Check ETH balance
  const ethBalance = await hre.ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", hre.ethers.formatEther(ethBalance), "ETH\n");
  
  // Read contract addresses from config
  const fs = require("fs");
  const path = require("path");
  const configPath = path.join(__dirname, "..", "src", "config", "contract-addresses.json");
  
  if (!fs.existsSync(configPath)) {
    console.log("❌ No contract addresses found. Run 'npm run deploy' first.");
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath));
  console.log("🌐 Network:", config.network, "| Chain ID:", config.chainId);
  console.log("\n" + "=".repeat(50));
  
  // Check QToken balance
  try {
    const QToken = await hre.ethers.getContractFactory("QToken");
    const qToken = QToken.attach(config.qTokenAddress);
    
    const qTokenBalance = await qToken.balanceOf(signer.address);
    const qTokenSymbol = await qToken.symbol();
    const qTokenDecimals = await qToken.decimals();
    
    console.log("💰 QToken Balance:", hre.ethers.formatUnits(qTokenBalance, qTokenDecimals), qTokenSymbol);
    console.log("📍 QToken Address:", config.qTokenAddress);
  } catch (error) {
    console.log("❌ Could not connect to QToken:", error.message);
  }
  
  console.log("\n" + "=".repeat(50));
  
  // Check QuantumNFT info
  try {
    const QuantumNFT = await hre.ethers.getContractFactory("QuantumNFT");
    const quantumNFT = QuantumNFT.attach(config.quantumNFTAddress);
    
    const nftName = await quantumNFT.name();
    const nftSymbol = await quantumNFT.symbol();
    const totalMinted = await quantumNFT.totalMinted();
    
    console.log("🖼️  QuantumNFT Info:");
    console.log("   Name:", nftName);
    console.log("   Symbol:", nftSymbol);
    console.log("   Total NFTs Minted:", totalMinted.toString());
    console.log("📍 QuantumNFT Address:", config.quantumNFTAddress);
    
    // Check if user owns any NFTs
    const nftBalance = await quantumNFT.balanceOf(signer.address);
    console.log("   Your NFT Balance:", nftBalance.toString());
    
    if (nftBalance > 0) {
      console.log("   🎉 You own", nftBalance.toString(), "Quantum NFTs!");
    }
  } catch (error) {
    console.log("❌ Could not connect to QuantumNFT:", error.message);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ Balance check complete!");
}

main().catch(console.error);