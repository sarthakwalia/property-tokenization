// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title PropertyFractions - ERC20 representing fractional ownership of a Property NFT
/// @author 
/// @notice This contract mints a fixed total supply of ERC20 tokens representing fractional ownership of a single property
/// @dev Used in conjunction with a Property NFT; only the tokenization manager (factory or controller) should deploy this
contract PropertyFractions is ERC20 {
    /// @dev ID of the property (linked to the corresponding PropertyDeed NFT)
    uint256 public immutable propertyId;
    
    /// @dev Address of the contract (e.g., TokenizationManager) that deployed this fractional token
    address public immutable tokenizationManager;

    /// @notice Constructor initializes ERC20 token with a total supply and assigns it to the recipient
    /// @param name Name of the ERC20 token (e.g., "Property #1 Fractions")
    /// @param symbol Symbol of the token (e.g., "P1F")
    /// @param totalSupply Total number of fractional tokens minted
    /// @param to Address receiving the total supply of tokens
    /// @param _propertyId The ID of the associated property from the PropertyDeed contract
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address to,
        uint256 _propertyId
    ) ERC20(name, symbol) {
        propertyId = _propertyId;
        tokenizationManager = msg.sender;
        _mint(to, totalSupply);
    }
}