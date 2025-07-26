import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("PropertyDeed", function () {
  let propertyDeed: Contract;
  let owner: Signer, addr1: Signer;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const PropertyDeed = await ethers.getContractFactory("PropertyDeed");
    propertyDeed = await PropertyDeed.deploy();
    await propertyDeed.waitForDeployment();

  });

  it("Should allow only owner to mint NFTs", async function () {
    const addr1Address = await addr1.getAddress();
    const ownerAddress = await owner.getAddress();

    // revert with custom error
    await expect(propertyDeed.connect(addr1).mint(addr1Address, "uri://property1"))
      .to.be.revertedWithCustomError(propertyDeed, "OwnableUnauthorizedAccount")
      .withArgs(addr1Address);

    const tx = await propertyDeed.connect(owner).mint(ownerAddress, "uri://property1");
    await tx.wait();

    expect(await propertyDeed.ownerOf(1)).to.equal(ownerAddress);
    expect(await propertyDeed.tokenURI(1)).to.equal("uri://property1");
  });
});