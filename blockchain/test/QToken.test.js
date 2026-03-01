const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QToken", function () {
  let QToken;
  let qToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    QToken = await ethers.getContractFactory("QToken");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy contract
    qToken = await QToken.deploy(owner.address);
    await qToken.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await qToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await qToken.balanceOf(owner.address);
      expect(await qToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      expect(await qToken.name()).to.equal("Quantum Token");
      expect(await qToken.symbol()).to.equal("QTOK");
    });

    it("Should have 18 decimals", async function () {
      expect(await qToken.decimals()).to.equal(18);
    });

    it("Should have PQC enabled by default", async function () {
      expect(await qToken.pqcEnabled()).to.equal(true);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await qToken.transfer(addr1.address, 50);
      const addr1Balance = await qToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      await qToken.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await qToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await qToken.balanceOf(owner.address);
      
      // Try to send 1 token from addr1 (0 tokens) to owner
      await expect(
        qToken.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed
      expect(await qToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await qToken.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1
      await qToken.transfer(addr1.address, 100);

      // Transfer another 50 tokens from owner to addr2
      await qToken.transfer(addr2.address, 50);

      // Check balances
      const finalOwnerBalance = await qToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));

      const addr1Balance = await qToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await qToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe("PQC Transactions", function () {
    it("Should allow PQC transactions when enabled", async function () {
      const amount = 100;
      const pqcSignature = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test-signature")
      );

      await expect(
        qToken.transferWithPQC(addr1.address, amount, pqcSignature)
      ).to.not.be.reverted;
    });

    it("Should fail PQC transactions when disabled", async function () {
      // Disable PQC
      await qToken.setPQCStatus(false);
      
      const amount = 100;
      const pqcSignature = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test-signature")
      );

      await expect(
        qToken.transferWithPQC(addr1.address, amount, pqcSignature)
      ).to.be.revertedWith("PQC transactions are disabled");
    });
  });
});