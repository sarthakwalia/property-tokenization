// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./PropertyDeed.sol";
import "./PropertyFractions.sol";

/// @title TokenizationManager - Orchestrates tokenization process 
// Upgradeable
contract TokenizationManagerV1 is OwnableUpgradeable {
    PropertyDeed public propertyDeed;
    uint256 public constant FRACTION_SUPPLY = 1_000_000 ether;

    struct PropertyData {
        address fractionsContract;
        address propertyCreator;
        uint256 pricePerFraction;
        bool isDistributionStarted;
    }

    mapping(uint256 => PropertyData) public properties;

    event PropertyTokenized(uint256 indexed propertyId, address fractionsContract);
    event DistributionStarted(uint256 indexed propertyId, uint256 pricePerFraction);
    event FractionsPurchased(address indexed buyer, uint256 indexed propertyId, uint256 amount);

    function initialize(address _propertyDeed) public initializer {
        __Ownable_init(msg.sender);
        propertyDeed = PropertyDeed(_propertyDeed);
    }

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
