# 🏡 Property Tokenization System
This project implements an ERC721-based Real Estate Tokenization flow using the TokenizationManagerV1 smart contract. It allows users to:
1. Mint a PropertyDeed NFT
2. Fractionalize it into ERC20 tokens
3. Start a public distribution sale
4. Allow users to buy property fractions

## 📁 Project Structure
1. contracts/ – Contains all smart contracts:
    - Proxy: Implements the Transparent Proxy pattern to make contracts upgradeable.
    - PropertyDeed: ERC721-based NFT representing a property.
    - PropertyFractions: ERC20 token representing fractional ownership of a property.
    - TokenizationManager: Main orchestrator that handles the tokenization flow.

2. deploy/ – Includes deployment scripts for all contracts. These scripts can be executed in sequence, and upon deployment, relevant addresses should be updated in the .env file.

3. scripts/ – Contains blockchain interaction scripts:
    - tokenization_setup.ts: Grants TokenizationManager contract ownership of the PropertyDeed contract so it can mint property NFTs.(Later on we add Openzepplin Access Control and provide just minter role instead of ownership of contract.)
    - tokenization_interact.ts: Interacts with the core functions of the tokenization flow — including tokenizeProperty, startDistribution, and buyFractions.

4. test/ – Contains unit and integration test cases covering all contracts:
    - PropertyDeed.ts
    - PropertyFractions.ts
    - TokenizationManager.ts
5. assets/ - Contains architecture and Flow charts.

### Overall Architecture of Smart Contract 
##### Overall Smart Contract Flow : 
![Overall Smart Contract Flow](/assets/OverallSmartContractFlow.png)
##### Property Tokenisation Flow : 
![Property Tokenisation Flow](/assets/PropertyTokenizationFlow.png)
##### Property Buying Flow :
![Property Buying Flow](/assets/BuyFractionsOfPropertyFlow.png)

### Project Setup

1. Once you clone the repo, run in terminal
> yarn install
2. Add .env file, copy .env.example
```
# DEPLOYMENT AND SCRIPT SET UP 
BASE_RPC_PROVIDER_URI=      #ADD PROVIDER URL ON BASE SEPOLIA
BASE_SCAN_VERIFICATION_KEY= #ADD PROVIDER URL ON BASE VERIFICATION KEY

# CONTRACT ADDRESS 
# Proxy Admin Contract Address for Transparent Proxy
PROXY_ADMIN_CONTRACT_ADDRESS=   #ADD PROXY ADMIN CONTRACT ADDRESS AFTER RUNNING 0_proxyadmin_deploy.ts

# PROPERTY DEED CONTRACT ADDRESS
PROPERTY_DEED_CONTRACT_ADDRESS=  #ADD PROPERTY DEED CONTRACT ADDRESS AFTER RUNNING 1_propertydeed_deploy.ts

# TOKENIZATION MANAGER CONTRACT ADDRESS
TOKENIZATION_MANAGER_CONTRACT_ADDRESS=  #ADD TOKENIZATION MANAGER CONTRACT ADDRESS AFTER RUNNING 2_tokenizationmanagerv1_deploy.ts 

# PRIVATE KEYS
CONTRACT_ADMIN_WALLET_PK= 
PROXY_ADMIN_WALLET_PK=

```

### Compiling the Contracts

To compile all the contracts, run in terminal: -
> npx hardhat compile

### Deploy contracts on Base
To deploy the separate contracts, run in terminal: -
> npx hardhat run deploy/<scriptPath> --network <network_name>

Ex: npx hardhat run deploy/0_proxyadmin_deploy.ts --network base-sepolia 

### Run Interaction Scripts Cases on Base
> npx hardhat run scripts/<scriptPath> --network <network_name>

Ex: yarn hardhat run ./scripts/0_tokenization_setup.ts  --network <network_name> 

### Run Test Cases
> npx hardhat test --match-path ./test/<filePath>

Ex: npx hardhat test ./test/TokenizationManager.ts
