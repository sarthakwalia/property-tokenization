// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PropertyDeed - Master Property NFT contract
contract PropertyDeed is ERC721URIStorage, Ownable {
    uint256 public NEXT_TOKENID_ID =1;

    constructor() Ownable(msg.sender) ERC721("PropertyDeed", "PRPD") {
    }

    function mint(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId = NEXT_TOKENID_ID++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
}
