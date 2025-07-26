import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("PropertyFractions", function () {
  let fractions: Contract;
  let deployer: Signer;
  let alice: Signer;
  const TOTAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [deployer, alice] = await ethers.getSigners();
    const PropertyFractions = await ethers.getContractFactory("PropertyFractions");
    fractions = await PropertyFractions.deploy("Fraction #1", "F1", TOTAL_SUPPLY, await alice.getAddress(), 1);
    await fractions.waitForDeployment();

  });

  it("Should deploy with correct total supply and assign to alice", async function () {
    expect(await fractions.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await fractions.balanceOf(await alice.getAddress())).to.equal(TOTAL_SUPPLY);
    expect(await fractions.propertyId()).to.equal(1);
    expect(await fractions.tokenizationManager()).to.equal(await deployer.getAddress());
  });
});