const ethers = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

async function run() {
  console.log(
    `Tokenization setup: Transfer ownership of the property deed contract to the Tokenization Manager contract to grant permission for minting the NFT`
  );

  // environment variables
  const base_rpc_provider_uri = process.env.BASE_RPC_PROVIDER_URI;
  if (!base_rpc_provider_uri) throw new Error("Please set Base provider url");
  const provider = new ethers.JsonRpcProvider(base_rpc_provider_uri);

  const propertyDeedContractAddress = process.env.PROPERTY_DEED_CONTRACT_ADDRESS;
  if (!propertyDeedContractAddress)
    throw new Error("Please set PROPERTY_DEED_CONTRACT_ADDRESS");

  const tokenizationManagerContractAddress = process.env.TOKENIZATION_MANAGER_CONTRACT_ADDRESS;
  if (!tokenizationManagerContractAddress)
    throw new Error("Please set TOKENIZATION_MANAGER_CONTRACT_ADDRESS");

  // Initialize the contract admin wallet.
  const contractAdminWallet = new ethers.Wallet(
    `${process.env.CONTRACT_ADMIN_WALLET_PK}`,
    provider
  );
  console.log(
    "contractAdminWallet address: ",
    await contractAdminWallet.getAddress()
  );

  // Property Deed Contract Abi 
  const PROPERTY_DEED_ABI =
    require("../artifacts/contracts/PropertyDeed.sol/PropertyDeed.json").abi;

  const propertyDeedContractAddressContract = new ethers.Contract(
    propertyDeedContractAddress,
    PROPERTY_DEED_ABI,
    contractAdminWallet
  );
  //transfer ownership to tokenisation manager 
console.log("Calling transferOwnership...");
const propertyDeedTx = await propertyDeedContractAddressContract.transferOwnership(tokenizationManagerContractAddress);
const propertyDeedReceipt = await propertyDeedTx.wait();
console.log("Transfer Ownership Tx Hash:", propertyDeedReceipt.hash);

}
run();
