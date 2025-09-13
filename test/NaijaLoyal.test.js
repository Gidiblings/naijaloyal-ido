// test/NaijaLoyal.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NaijaLoyal Token & IDO", function () {
  let token, ido, owner, foundersWallet, advisorsWallet, communityWallet, treasuryWallet, buyer1, buyer2;
  let tokenAddress, idoAddress;
  
  const TOTAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const IDO_TOKENS = ethers.parseEther("100000");    // 100K tokens
  const TOKEN_PRICE = ethers.parseEther("0.000066"); // 0.000066 ETH
  const MIN_PURCHASE = ethers.parseEther("100");     // 100 NLG
  const MAX_PURCHASE = ethers.parseEther("10000");   // 10,000 NLG
  const FUNDRAISING_TARGET = ethers.parseEther("6.6"); // 6.6 ETH

  beforeEach(async function () {
    [owner, foundersWallet, advisorsWallet, communityWallet, treasuryWallet, buyer1, buyer2] = await ethers.getSigners();
    
    const NaijaLoyal = await ethers.getContractFactory("NaijaLoyal");
    token = await NaijaLoyal.deploy(
      foundersWallet.address,
      advisorsWallet.address,
      communityWallet.address,
      treasuryWallet.address
    );
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    
    const NaijaLoyalIDO = await ethers.getContractFactory("NaijaLoyalIDO");
    ido = await NaijaLoyalIDO.deploy(
      tokenAddress,
      TOKEN_PRICE,
      IDO_TOKENS,
      MIN_PURCHASE,
      MAX_PURCHASE,
      FUNDRAISING_TARGET
    );
    await ido.waitForDeployment();
    idoAddress = await ido.getAddress();
    
    await token.setIdoContract(idoAddress);
    await token.setPrivateWallet(owner.address);
    await token.distributeTokens();
  });

  describe("Token Contract", function () {
    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("NaijaLoyal");
      expect(await token.symbol()).to.equal("NLG");
    });
    
    it("Should have correct total supply", async function () {
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
    
    it("Should distribute tokens correctly and emit event", async function () {
      const idoBalance = await token.balanceOf(idoAddress);
      const expectedIdoBalance = (TOTAL_SUPPLY * 1000n) / 10000n; // 10%
      expect(idoBalance).to.equal(expectedIdoBalance);
      
      const foundersBalance = await token.balanceOf(foundersWallet.address);
      const expectedFoundersBalance = (TOTAL_SUPPLY * 1500n) / 10000n; // 15%
      expect(foundersBalance).to.equal(expectedFoundersBalance);

      await expect(token.distributeTokens())
        .to.be.revertedWith("Distribution already completed")
        .and.to.emit(token, "TokensDistributed");
    });
    
    it("Should allow token transfers", async function () {
      const transferAmount = ethers.parseEther("1000");
      await token.connect(foundersWallet).transfer(buyer1.address, transferAmount);
      expect(await token.balanceOf(buyer1.address)).to.equal(transferAmount);
    });
  });

  describe("IDO Contract", function () {
    it("Should have correct initial parameters", async function () {
      expect(await ido.tokenPrice()).to.equal(TOKEN_PRICE);
      expect(await ido.tokensAvailable()).to.equal(IDO_TOKENS);
      expect(await ido.minPurchase()).to.equal(MIN_PURCHASE);
      expect(await ido.maxPurchase()).to.equal(MAX_PURCHASE);
      expect(await ido.fundraisingTarget()).to.equal(FUNDRAISING_TARGET);
    });
    
    it("Should start sale correctly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await ido.startSale(duration);
      expect(await ido.saleActive()).to.be.true;
    });
    
    it("Should calculate token amounts correctly", async function () {
      const ethAmount = ethers.parseEther("1");
      const expectedTokens = ethAmount * 10n**18n / TOKEN_PRICE; // 1 / 0.000066 ≈ 15151.515151515151515151
      const calculatedTokens = await ido.calculateTokenAmount(ethAmount);
      expect(calculatedTokens).to.equal(expectedTokens);
    });
  });

  describe("Token Purchase Flow", function () {
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await ido.startSale(duration);
    });
    
    it("Should allow valid token purchase", async function () {
      const ethAmount = ethers.parseEther("0.0066"); // 100 tokens
      const expectedTokens = ethers.parseEther("100");
      
      const initialBalance = await token.balanceOf(buyer1.address);
      const initialContractBalance = await ethers.provider.getBalance(idoAddress);
      
      await ido.connect(buyer1).buyTokens({ value: ethAmount });
      
      const finalBalance = await token.balanceOf(buyer1.address);
      const finalContractBalance = await ethers.provider.getBalance(idoAddress);
      const userPurchase = await ido.getUserPurchase(buyer1.address);
      
      expect(finalBalance - initialBalance).to.equal(expectedTokens);
      expect(finalContractBalance - initialContractBalance).to.equal(ethAmount);
      expect(userPurchase).to.equal(expectedTokens);
    });
    
    it("Should close sale when fundraising target reached", async function () {
      const ethAmount = ethers.parseEther("6.6"); // Hits fundraising target
      await ido.connect(buyer1).buyTokens({ value: ethAmount });
      expect(await ido.saleActive()).to.be.false;
      expect(await ido.totalRaised()).to.equal(FUNDRAISING_TARGET);
    });
  });

  describe("Sale Management", function () {
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await ido.startSale(duration);
    });
    
    it("Should emit EmergencyStop event", async function () {
      await expect(ido.emergencyStop())
        .to.emit(ido, "EmergencyStop")
        .withArgs(owner.address);
      expect(await ido.saleActive()).to.be.false;
    });
  });
});