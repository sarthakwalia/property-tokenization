// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./PropertyDeed.sol";
import "./PropertyFractions.sol";

/// @title TokenizationManagerV1 - Orchestrates tokenization of property NFTs into ERC20 fractional tokens
/// @notice This upgradeable contract manages minting of PropertyDeed NFTs, creation of ERC20 fractions, and their sale/distribution
/// @dev Must be initialized with the address of a deployed PropertyDeed contract
contract TokenizationManagerV1 is OwnableUpgradeable {
    
    /// @dev Reference to the PropertyDeed (ERC721) contract
    PropertyDeed public propertyDeed;
    
    /// @dev Total supply of fractional tokens per property (with 18 decimals)
    uint256 public constant FRACTION_SUPPLY = 1_000_000 ether;
    
    /// @dev Stores information about each tokenized property
    struct PropertyData {
        address fractionsContract;  // ERC20 contract representing fractions
        address propertyCreator;    // Creator/owner who initiated tokenization
        uint256 pricePerFraction;   // Price per fraction in wei
        bool isDistributionStarted; // Whether public sale has started
    }

    /// @dev Mapping from propertyId to its tokenization data
    mapping(uint256 => PropertyData) public properties;

    /// @notice Emitted when a property is tokenized into fractions
    event PropertyTokenized(uint256 indexed propertyId, address fractionsContract);

    /// @notice Emitted when distribution starts for a property
    event DistributionStarted(uint256 indexed propertyId, uint256 pricePerFraction);

    /// @notice Emitted when someone buys fractions of a property
    event FractionsPurchased(address indexed buyer, uint256 indexed propertyId, uint256 amount);

    /// @notice Initializes the contract with the address of the PropertyDeed contract
    /// @param _propertyDeed The address of the PropertyDeed NFT contract
    function initialize(address _propertyDeed) public initializer {
        __Ownable_init(msg.sender);
        propertyDeed = PropertyDeed(_propertyDeed);
    }

    /// @notice Tokenizes a property by minting an NFT and deploying a new ERC20 fractions contract
    /// @param tokenURI Metadata URI for the newly minted property NFT
    function tokenizeProperty(string memory tokenURI) external {
        uint256 propertyId = propertyDeed.mint(address(this), tokenURI);

        string memory name = string(abi.encodePacked("Fraction #", Strings.toString(propertyId)));
        string memory symbol = string(abi.encodePacked("F", Strings.toString(propertyId)));

        PropertyFractions fractions = new PropertyFractions(
            name,
            symbol,
            FRACTION_SUPPLY,
            msg.sender,
            propertyId
        );

        PropertyData storage data = properties[propertyId];
        data.fractionsContract = address(fractions);
        data.propertyCreator = msg.sender;

        emit PropertyTokenized(propertyId, address(fractions));
    }

    /// @notice Starts public sale/distribution of fractional tokens for a given property
    /// @param propertyId ID of the tokenized property
    /// @param pricePerFractionInWei Price of each fraction in wei
    function startDistribution(uint256 propertyId, uint256 pricePerFractionInWei) external {
        require(IERC721(address(propertyDeed)).ownerOf(propertyId) == address(this), "Deed not locked");
        PropertyData storage data = properties[propertyId];
        require(data.fractionsContract != address(0), "Not tokenized yet");
        require(!data.isDistributionStarted, "Already started");
        require(ERC20(data.fractionsContract).balanceOf(msg.sender) == FRACTION_SUPPLY, "Only full owner can start");

        data.pricePerFraction = pricePerFractionInWei;
        data.isDistributionStarted = true;

        emit DistributionStarted(propertyId, pricePerFractionInWei);
    }

    /// @notice Allows users to buy fractional tokens of a tokenized property
    /// @param propertyId ID of the tokenized property
    /// @param numberOfFractions Number of fractions the buyer wants to purchase
    // TODO: ADD a platform fees deduct logic 
    function buyFractions(uint256 propertyId, uint256 numberOfFractions) external payable {
        PropertyData storage data = properties[propertyId];
        require(data.isDistributionStarted, "Sale not started");
        require(numberOfFractions > 0, "Invalid fraction amount");

        uint256 totalCost = numberOfFractions * data.pricePerFraction;
        require(msg.value >= totalCost, "Insufficient ETH sent");

        ERC20 fractions = ERC20(data.fractionsContract);
        require(fractions.balanceOf(data.propertyCreator) >= numberOfFractions, "Not enough fractions left");

        // Transfer ETH directly to the property creator
        (bool success, ) = payable(data.propertyCreator).call{value: totalCost}("");
        require(success, "ETH transfer to property creator failed");

        // Transfer from property creator to buyer
        fractions.transferFrom(data.propertyCreator, msg.sender, numberOfFractions);

        // Refund excess
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refundSuccess, "Refund failed");
        }

        emit FractionsPurchased(msg.sender, propertyId, numberOfFractions);
    }

}
