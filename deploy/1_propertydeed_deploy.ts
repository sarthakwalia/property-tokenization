import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

// Deployment Script for Property Deed Contract 
dotenv.config();
const PropertyDeed = require("../artifacts/contracts/PropertyDeed.sol/PropertyDeed.json");



async function main(hre: HardhatRuntimeEnvironment) {
    console.log(
        `Running deployment script for the non-upgradeable Property Deed Contract`
    );

     // environment variables
     const base_rpc_provider_uri = process.env.BASE_RPC_PROVIDER_URI;
     if (!base_rpc_provider_uri) throw new Error("Please set Base provider url");
     const provider = new ethers.JsonRpcProvider(base_rpc_provider_uri);
 
     const contractAdminWallet = new ethers.Wallet(
         `${process.env.CONTRACT_ADMIN_WALLET_PK}`,
         provider
     );
     console.log("contractAdminWallet address: ", await contractAdminWallet.getAddress());
    
    // property deed constructor arguments  
    const propertyDeedConstArgs: any = [];
    
    // deploy property deep non-upgradeable contract
    console.log("Deploying the PropertyDeed...");
    const propertyDeedFactory = new ethers.ContractFactory(
        PropertyDeed.abi,
        PropertyDeed.bytecode,
        contractAdminWallet
    );
    const propertyDeed = await propertyDeedFactory.deploy();
    await propertyDeed.waitForDeployment();
    console.log("PropertyDeed deployed at:", await propertyDeed.getAddress());
    try {
        const verifyProxy = await hre.run("verify:verify", {
            address: await propertyDeed.getAddress(),
            constructorArguments: propertyDeedConstArgs,
        });
        console.log("Verification result: ", verifyProxy);
    } catch (error: any) {
        if (error.name === "ContractVerificationInvalidStatusCodeError") {
            console.warn("Verification warning: Contract already verified or partially verified.");
        } else {
            console.error("Unexpected error during verification:", error);
        }
    }
}

main(require("hardhat")).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});