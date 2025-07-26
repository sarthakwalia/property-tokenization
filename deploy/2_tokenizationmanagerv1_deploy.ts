import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();
const TransparentUpgradeableProxy = require("../artifacts/contracts/proxy/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json");
const TokenizationManagerV1 = require("../artifacts/contracts/TokenizationManager.sol/TokenizationManagerV1.json");

// An example of a deploy script that will deploy and call a simple contract.
async function main(hre: HardhatRuntimeEnvironment) {
    console.log(
        `Running deploy script for the upgradable TokenizationManager contract with transparent proxy...`
    );

    // environment variables
    const base_rpc_provider_uri = process.env.BASE_RPC_PROVIDER_URI;
    if (!base_rpc_provider_uri) throw new Error("Please set Base provider url");
    const provider = new ethers.JsonRpcProvider(base_rpc_provider_uri);

    const proxyAdminContractAddress = process.env.PROXY_ADMIN_CONTRACT_ADDRESS;
    if (!proxyAdminContractAddress)
        throw new Error("Please set proxyAdminContractAddress");

    const propertyDeed = process.env.PROPERTY_DEED_CONTRACT_ADDRESS;
    if (!propertyDeed)
        throw new Error("Please set PROPERTY_DEED_CONTRACT_ADDRESS");

    // Initialize the proxy and contract admin wallet.
    const proxyAdminWallet = new ethers.Wallet(
        `${process.env.PROXY_ADMIN_WALLET_PK}`,
        provider
    );
    console.log(
        "proxyAdminWallet address: ",
        await proxyAdminWallet.getAddress()
    );

    const contractAdminWallet = new ethers.Wallet(
        `${process.env.CONTRACT_ADMIN_WALLET_PK}`,
        provider
    );
    console.log(
        "contractAdminWallet address: ",
        await contractAdminWallet.getAddress()
    );

    // Deploy the Tokenization Manager V1 contract
    const tokenizationManagerArtifact = new ethers.ContractFactory(
        TokenizationManagerV1.abi,
        TokenizationManagerV1.bytecode,
        contractAdminWallet
    );
    const tokenizationManagerConstArgs: any = [];
    const tokenizationManagerContract = await tokenizationManagerArtifact.deploy();
    await tokenizationManagerContract.waitForDeployment();

    console.log(
        "args: " +
        tokenizationManagerContract.interface.encodeDeploy(tokenizationManagerConstArgs)
    );
    console.log(
        `tokenizationManager was deployed to ${await tokenizationManagerContract.getAddress()}`
    );

    try {
        await hre.run("verify:verify", {
            address: await tokenizationManagerContract.getAddress(),
            constructorArguments: tokenizationManagerConstArgs,
        });
    } catch (error: any) {
        if (error.name === "ContractVerificationInvalidStatusCodeError") {
            console.warn("Verification warning: Contract already verified or partially verified.");
        } else {
            console.error("Unexpected error during verification:", error);
        }
    }

    // Deploy the transparent proxy
    const transparentProxyConstArgs = [
        await tokenizationManagerContract.getAddress(),
        proxyAdminContractAddress,
        "0x",
    ];
    const transparentUpgradeableProxy = new ethers.ContractFactory(
        TransparentUpgradeableProxy.abi,
        TransparentUpgradeableProxy.bytecode,
        proxyAdminWallet
    );
    const transparentProxyContract =
        await transparentUpgradeableProxy.deploy(
            await tokenizationManagerContract.getAddress(),
            proxyAdminContractAddress,
            "0x"
        );
    await transparentProxyContract.waitForDeployment();
    console.log(
        "transparentUpgradeableProxy deployed at:",
        await transparentProxyContract.getAddress()
    );

    try {
        await hre.run("verify:verify", {
            address: await transparentProxyContract.getAddress(),
            constructorArguments: transparentProxyConstArgs,
        });
    } catch (error: any) {
        if (error.name === "ContractVerificationInvalidStatusCodeError") {
            console.warn("Verification warning: Contract already verified or partially verified.");
        } else {
            console.error("Unexpected error during verification:", error);
        }
    }

    // Initializing tokenizationManager contract through proxy
    const nyContract = new ethers.Contract(
        await transparentProxyContract.getAddress(),
        TokenizationManagerV1.abi,
        contractAdminWallet
    );

    const initializeTokenizationManagerTx = await nyContract.initialize(
        propertyDeed
    );
    await initializeTokenizationManagerTx.wait();
    console.log(
        "tokenizationManager initialization response: ",
        initializeTokenizationManagerTx
    );
}
main(require("hardhat")).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
