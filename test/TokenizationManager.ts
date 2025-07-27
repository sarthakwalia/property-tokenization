import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("TokenizationManager", function () {
  let deed: Contract, manager: Contract;
  let owner: Signer, buyer: Signer, attacker: Signer;
  const TOTAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, buyer, attacker] = await ethers.getSigners();
  
    const PropertyDeed = await ethers.getContractFactory("PropertyDeed");
    deed = await PropertyDeed.deploy();
    await deed.waitForDeployment();

    const TokenizationManager = await ethers.getContractFactory("TokenizationManagerV1");
    manager = await TokenizationManager.deploy();
    await manager.waitForDeployment();
    await manager.initialize(deed.target);

    await deed.transferOwnership(manager.target);
  });
  

  it("Should tokenize a new property and deploy fractions", async function () {
    await expect(manager.connect(owner).tokenizeProperty("uri://property1"))
      .to.emit(manager, "PropertyTokenized")
      .withArgs(1, anyValue);

    const ownerOfDeed = await deed.ownerOf(1);
    expect(ownerOfDeed).to.equal(manager.target);
  });

  it("Should not allow starting distribution if property deed NFT is not locked or not minted", async function () {
    await expect(
      manager.connect(attacker).startDistribution(1, ethers.parseEther("0.001"))
    ).to.be.revertedWithCustomError(deed, "ERC721NonexistentToken")
    .withArgs(1);
  });

  it("Should not allow start distribution when it is already started", async function () {
    await manager.tokenizeProperty("uri://property1");

    await manager.connect(owner).startDistribution(1, ethers.parseEther("0.001"));

    await expect(
      manager.connect(owner).startDistribution(1, ethers.parseEther("0.001"))
    ).to.be.revertedWith("Already started");
  });

  it("Should not allow starting distribution if not full owner of fractions", async function () {
    await manager.tokenizeProperty("uri://property1");
    const data = await manager.properties(1);
    const fractions = await ethers.getContractAt("PropertyFractions", data.fractionsContract);

    await expect(
      manager.connect(attacker).startDistribution(1, ethers.parseEther("0.001"))
    ).to.be.revertedWith("Only full owner can start");
  });

  it("Should fail buying fractions before distribution started", async function () {
    await manager.tokenizeProperty("uri://property1");

    await expect(
      manager.connect(buyer).buyFractions(1, 10, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Sale not started");
  });

  it("Should fail buying fractions when fraction invalid amount", async function () {
    await manager.tokenizeProperty("uri://property1");

    await manager.connect(owner).startDistribution(1, ethers.parseEther("0.001"))

    await expect(
      manager.connect(buyer).buyFractions(1, 0, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Invalid fraction amount");
  });

  it("Should fail buying with insufficient ETH", async function () {
    await manager.tokenizeProperty("uri://property1");
    const data = await manager.properties(1);
    const fractions = await ethers.getContractAt("PropertyFractions", data.fractionsContract);
    
    // approval of property fraction token to manager
    await fractions.connect(owner).approve(manager.target, TOTAL_SUPPLY);
    await manager.startDistribution(1, ethers.parseEther("0.001"));

    await expect(
      manager.connect(buyer).buyFractions(1, 10, { value: ethers.parseEther("0.005") })
    ).to.be.revertedWith("Insufficient ETH sent");
  });

  it("Should refund excess ETH sent", async function () {
    await manager.tokenizeProperty("uri://property1");
    const data = await manager.properties(1);
    const fractions = await ethers.getContractAt("PropertyFractions", data.fractionsContract);
    
    // approval of property fraction token to manager
    await fractions.connect(owner).approve(manager.target, TOTAL_SUPPLY);
    await manager.startDistribution(1, ethers.parseEther("0.001"));
  
    const balanceBefore = await ethers.provider.getBalance(await buyer.getAddress());
  
    const tx = await manager.connect(buyer).buyFractions(1, 10, {
      value: ethers.parseEther("0.02"),
    });
    const receipt = await tx.wait();
  
    const gasUsed = receipt.gasUsed * (tx.gasPrice ?? 0n);
  
    const balanceAfter = await ethers.provider.getBalance(await buyer.getAddress());
  
    const expectedSpent = ethers.parseEther("0.01"); // no .toBigInt()
    const tolerance = ethers.parseEther("0.001");
  
    expect(balanceAfter).to.be.closeTo(
      balanceBefore - expectedSpent - gasUsed,
      tolerance
    );
  });

  it("Should fail buying more fractions than available", async function () {
    // Tokenize a property
    await manager.tokenizeProperty("uri://property1");
    const data = await manager.properties(1);
    const fractions = await ethers.getContractAt("PropertyFractions", data.fractionsContract);

    // approval of property fraction token to manager
    await fractions.connect(owner).approve(manager.target, TOTAL_SUPPLY);
    await manager.startDistribution(1, ethers.parseEther("0.00000000000000001"));

    await expect(
      manager.connect(buyer).buyFractions(1, TOTAL_SUPPLY + 1n, {
        value: ethers.parseEther("1000"),
      })
    ).to.be.reverted;
  });

  it("Should succeed buying fractions", async function () {
    // Tokenize a property
    await manager.connect(owner).tokenizeProperty("uri://property1");
  
    // Get the PropertyData
    const data = await manager.properties(1);
    const fractions = await ethers.getContractAt("PropertyFractions", data.fractionsContract);
  
    // Approve Property Token to manager
    await fractions.connect(owner).approve(manager.target, TOTAL_SUPPLY);
  
    // Start distribution (price = 0.001 ETH per token)
    const pricePerFraction = ethers.parseEther("0.001");
    await manager.connect(owner).startDistribution(1, pricePerFraction);
  
    // Capture buyer balance before purchase
    const balanceBefore = await ethers.provider.getBalance(await buyer.getAddress());
  
    // Buyer buys 10 fractions
    const numFractions = 10n;
    const totalCost = pricePerFraction * numFractions;
    const tx = await manager.connect(buyer).buyFractions(1, numFractions, {
      value: totalCost,
    });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * (tx.gasPrice ?? 0n);
  
    // Check buyer received the fractions
    const buyerBalance = await fractions.balanceOf(await buyer.getAddress());
    expect(buyerBalance).to.equal(numFractions);
  
    // Check ETH deduction is accurate
    const balanceAfter = await ethers.provider.getBalance(await buyer.getAddress());
    expect(balanceAfter).to.be.closeTo(balanceBefore - totalCost - gasUsed, ethers.parseEther("0.001"));
  
    // Check event emitted
    await expect(tx)
      .to.emit(manager, "FractionsPurchased")
      .withArgs(await buyer.getAddress(), 1, numFractions);
  });

  it("Should succeed buying fractions and transfer ETH to property creator", async function () {
    // Tokenize a property
    await manager.connect(owner).tokenizeProperty("uri://property1");
  
    // Get PropertyData
    const data = await manager.properties(1);
    const fractions = await ethers.getContractAt("PropertyFractions", data.fractionsContract);
  
    // Approve Property Token to manager
    await fractions.connect(owner).approve(manager.target, TOTAL_SUPPLY);
  
    // Start distribution (price = 0.001 ETH per token)
    const pricePerFraction = ethers.parseEther("0.001");
    await manager.connect(owner).startDistribution(1, pricePerFraction);
  
    const numFractions = 10n;
    const totalCost = pricePerFraction * numFractions;
  
    // Capture balances before
    const buyerAddress = await buyer.getAddress();
    const creatorAddress = await owner.getAddress();
  
    const buyerBalanceBefore = await ethers.provider.getBalance(buyerAddress);
    const creatorBalanceBefore = await ethers.provider.getBalance(creatorAddress);
  
    // Buyer buys fractions
    const tx = await manager.connect(buyer).buyFractions(1, numFractions, {
      value: totalCost,
    });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * (tx.gasPrice ?? 0n);
  
    // Check buyer received the fractions
    const buyerTokenBalance = await fractions.balanceOf(buyerAddress);
    expect(buyerTokenBalance).to.equal(numFractions);
  
    // Check buyer ETH balance reduced appropriately
    const buyerBalanceAfter = await ethers.provider.getBalance(buyerAddress);
    expect(buyerBalanceAfter).to.be.closeTo(
      buyerBalanceBefore - totalCost - gasUsed,
      ethers.parseEther("0.001")
    );
  
    // Check creator ETH balance increased by totalCost
    const creatorBalanceAfter = await ethers.provider.getBalance(creatorAddress);
    expect(creatorBalanceAfter).to.be.closeTo(
      creatorBalanceBefore + totalCost,
      ethers.parseEther("0.001")
    );
  
    // Check event
    await expect(tx)
      .to.emit(manager, "FractionsPurchased")
      .withArgs(buyerAddress, 1, numFractions);
  });
  
  
});
