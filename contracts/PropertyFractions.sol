// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title PropertyFractions - ERC20 representing fractional ownership of a Property NFT
contract PropertyFractions is ERC20 {
    uint256 public immutable propertyId;
    address public immutable tokenizationManager;

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