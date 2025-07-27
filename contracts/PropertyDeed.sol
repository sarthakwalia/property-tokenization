// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PropertyDeed - Master Property NFT contract
/// @author 
/// @notice This contract is used to mint unique NFTs representing real estate deeds
/// @dev Inherits ERC721URIStorage for metadata handling and Ownable for access control
contract PropertyDeed is ERC721URIStorage, Ownable {
    
    /// @dev Counter for the next token ID to be minted
    uint256 public NEXT_TOKENID_ID =1;

    constructor() Ownable(msg.sender) ERC721("PropertyDeed", "PRPD") {
    }

    /// @notice Mints a new property deed NFT to a specified address
    /// @dev Only the owner (admin) of the contract can mint new tokens
    /// @param to The address that will receive the minted NFT
    /// @param tokenURI The metadata URI pointing to the deed information
    /// @return tokenId The ID of the newly minted token
    function mint(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId = NEXT_TOKENID_ID++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
}
