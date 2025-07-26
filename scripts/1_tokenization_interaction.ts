const ethers = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

async function run() {
  console.log(
    `Interaction Script for Tokenisation Property Deed, Write calls for tokenizeProperty, startDistribution, buyFractions`
  );

  // environment variables
  const base_rpc_provider_uri = process.env.BASE_RPC_PROVIDER_URI;
  if (!base_rpc_provider_uri) throw new Error("Please set Base provider url");
  const provider = new ethers.JsonRpcProvider(base_rpc_provider_uri);


  const tokenizationManagerContractAddress = process.env.TOKENIZATION_MANAGER_CONTRACT_ADDRESS;
  if (!tokenizationManagerContractAddress)
    throw new Error("Please set TOKENIZATION_MANAGER_CONTRACT_ADDRESS");

  const propertyDeedContractAddress = process.env.PROPERTY_DEED_CONTRACT_ADDRESS;
  if (!propertyDeedContractAddress)
    throw new Error("Please set PROPERTY_DEED_CONTRACT_ADDRESS");

  // Initialize the contract admin wallet.
  const contractAdminWallet = new ethers.Wallet(
    `${process.env.CONTRACT_ADMIN_WALLET_PK}`,
    provider
  );
  console.log(
    "contractAdminWallet address: ",
    await contractAdminWallet.getAddress()
  );

  // TokenizationManager ABI 
  const TOKENIZATION_MANAGER_ABI =
    require("../artifacts/contracts/TokenizationManager.sol/TokenizationManagerV1.json").abi;

  // IERC20 ABI 
  const IERC20_ABI =
    require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json").abi;

  // Tokenisation Manager Contract Interface
  const tokenizationManagerContract = new ethers.Contract(
    tokenizationManagerContractAddress,
    TOKENIZATION_MANAGER_ABI,
    contractAdminWallet
  );
  //call for tokenizeProperty
  console.log("Calling tokenizeProperty...");
  const tokenizeTx = await tokenizationManagerContract.tokenizeProperty("ipfs://your-property-uri");
  const tokenizeReceipt = await tokenizeTx.wait();
  console.log("Tokenize Tx Hash:", tokenizeReceipt.hash);

  // Extract propertyId from emitted event PropertyTokenized

  // setting timeout for block confirmation
  setTimeout(() => {
  }, 5000);

  // Filter the 'PropertyTokenized' event from the confirmed transaction
  const currentBlockLc = await provider.getBlockNumber();
  const filter = tokenizationManagerContract.filters.PropertyTokenized;
  const events = await tokenizationManagerContract.queryFilter(filter, currentBlockLc - 10, currentBlockLc);
  let propertyId;
  let fractionsContract;
  if (events.length > 0) {
    ({ propertyId, fractionsContract, } = events[events.length - 1].args);
    console.log("PropertyTokenized Event Fetched Successfully!");
  } else {
    console.error("PropertyTokenized event not found in transaction logs.");
  }
  console.log("PropertyId:", propertyId);
  console.log("Fractions Contract Address:", fractionsContract);

  //function call for startDistribution
  console.log("Calling startDistribution...");
  const pricePerFractionInWei = ethers.parseEther("0.000000000000000001"); // 1 wei per fraction

  const startDistTx = await tokenizationManagerContract.startDistribution(propertyId, pricePerFractionInWei);
  await startDistTx.wait();
  console.log("startDistribution Tx Hash:", startDistTx.hash);

  // provide approval of Property Franction Token to Tokenization Manager
  // contract interface IERC20
  const ierc20Contract = new ethers.Contract(
    fractionsContract,
    IERC20_ABI,
    contractAdminWallet
  );
  const approvalAmout = ethers.parseEther("1000000");
  const approveTx = await ierc20Contract.approve(tokenizationManagerContractAddress, approvalAmout);
  await approveTx.wait();
  console.log("approveTx Hash:", approveTx.hash);

  //function call for buyFractions
  console.log("Calling buyFractions...");
  const numFractionsToBuy = 10n;
  const totalCost = pricePerFractionInWei * numFractionsToBuy;

  const buyTx = await tokenizationManagerContract.buyFractions(
    propertyId,
    numFractionsToBuy,
    { value: totalCost + ethers.parseEther("0.00000000000000001") } // added buffer amount, get refund, would let to test refund case
  );
  await buyTx.wait();
  console.log("buyFractions Tx Hash:", buyTx.hash);

}
run();
