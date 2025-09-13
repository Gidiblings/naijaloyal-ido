// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @title NaijaLoyal IDO Contract
/// @notice Manages the Initial DEX Offering for NaijaLoyal tokens
contract NaijaLoyalIDO is Ownable, ReentrancyGuard {
    using Address for address payable;
    
    IERC20 public immutable token;
    
    // Sale parameters
    uint256 public tokenPrice; // Price in wei per token (18 decimals)
    uint256 public tokensAvailable;
    uint256 public tokensSold;
    uint256 public minPurchase;
    uint256 public maxPurchase;
    
    // Sale timing
    uint256 public saleStart;
    uint256 public saleEnd;
    bool public saleActive;
    
    // Fundraising target in wei
    uint256 public fundraisingTarget;
    uint256 public totalRaised;
    
    // Events
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event SaleStarted(uint256 startTime, uint256 endTime);
    event SaleEnded(uint256 totalRaised, uint256 tokensSold);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event EmergencyStop(address indexed owner);
    
    mapping(address => uint256) public purchasedTokens;

    /// @notice Constructor to initialize IDO parameters
    /// @param _token Address of the NaijaLoyal token contract
    /// @param _tokenPrice Price per token in wei
    /// @param _tokensAvailable Total tokens available for sale
    /// @param _minPurchase Minimum token purchase amount
    /// @param _maxPurchase Maximum token purchase amount per user
    /// @param _fundraisingTarget Target funds to raise in wei
    constructor(
        address _token,
        uint256 _tokenPrice,
        uint256 _tokensAvailable,
        uint256 _minPurchase,
        uint256 _maxPurchase,
        uint256 _fundraisingTarget
    ) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        require(_tokenPrice > 0, "Token price must be greater than 0");
        require(_tokensAvailable > 0, "Tokens available must be greater than 0");
        require(_minPurchase > 0, "Min purchase must be greater than 0");
        require(_maxPurchase >= _minPurchase, "Max purchase must be >= min purchase");
        
        token = IERC20(_token);
        tokenPrice = _tokenPrice;
        tokensAvailable = _tokensAvailable;
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
        fundraisingTarget = _fundraisingTarget;

        saleActive = false;
    }
    
    /// @notice Start the IDO sale
    /// @param _duration Duration of the sale in seconds
    function startSale(uint256 _duration) external onlyOwner {
        require(!saleActive, "Sale is already active");
        require(token.balanceOf(address(this)) >= tokensAvailable, "Insufficient tokens in contract");
        
        saleStart = block.timestamp;
        saleEnd = block.timestamp + _duration;
        saleActive = true;
        
        emit SaleStarted(saleStart, saleEnd);
    }
    
    /// @notice End the sale manually
    function endSale() external onlyOwner {
        require(saleActive, "Sale is not active");
        saleActive = false;
        emit SaleEnded(totalRaised, tokensSold);
    }

    /// @notice Emergency stop function
    function emergencyStop() external onlyOwner {
        saleActive = false;
        emit EmergencyStop(msg.sender);
    }

    /// @notice Buy tokens by sending ETH
    function buyTokens() external payable nonReentrant {
        require(saleActive, "Sale is not active");
        require(block.timestamp >= saleStart, "Sale has not started");
        require(block.timestamp <= saleEnd, "Sale has ended");
        
        // Fix: Use proper decimal handling
        uint256 tokensToBuy = (msg.value * 10**18) / tokenPrice;
        
        require(tokensToBuy >= minPurchase, "Below minimum purchase amount");
        require(tokensSold + tokensToBuy <= tokensAvailable, "Exceeds available tokens");
        
        uint256 userCurrentPurchase = purchasedTokens[msg.sender];
        require(userCurrentPurchase + tokensToBuy <= maxPurchase, "Exceeds maximum purchase limit");

        // Update state
        purchasedTokens[msg.sender] = userCurrentPurchase + tokensToBuy;
        tokensSold = tokensSold + tokensToBuy;
        totalRaised = totalRaised + msg.value;
        
        // Transfer tokens to the buyer
        require(token.transfer(msg.sender, tokensToBuy), "Token transfer failed");
        
        emit TokensPurchased(msg.sender, tokensToBuy, msg.value);

        // Check if fundraising target is reached and end the sale
        if (totalRaised >= fundraisingTarget) {
            saleActive = false;
            emit SaleEnded(totalRaised, tokensSold);
        }
    }
    
    /// @notice Withdraw raised funds
    function withdrawFunds() external onlyOwner {
        uint256 amountToWithdraw = address(this).balance;
        require(amountToWithdraw > 0, "No funds to withdraw");
        
        address payable ownerAddress = payable(owner());
        ownerAddress.sendValue(amountToWithdraw);
        
        emit FundsWithdrawn(ownerAddress, amountToWithdraw);
    }

    /// @notice Withdraw unsold tokens back to owner
    function withdrawUnsoldTokens() external onlyOwner {
        require(!saleActive, "Sale is still active");
        
        uint256 remainingTokens = tokensAvailable - tokensSold;
        require(remainingTokens > 0, "No unsold tokens to withdraw");
        
        token.transfer(owner(), remainingTokens);
    }

    /// @notice Get remaining tokens available
    function getRemainingTokens() external view returns (uint256) {
        return tokensAvailable - tokensSold;
    }
    
    /// @notice Get sale information
    /// @return _tokenPrice The price of the token in wei.
    /// @return _tokensAvailable The number of tokens available for sale.
    /// @return _tokensSold The number of tokens that have been sold.
    /// @return _totalRaised The total amount of ETH raised in wei.
    /// @return _saleStart The timestamp when the sale started.
    /// @return _saleEnd The timestamp when the sale will end.
    /// @return _saleActive The current status of the sale (active or inactive).
    function getSaleInfo() external view returns (
        uint256 _tokenPrice,
        uint256 _tokensAvailable,
        uint256 _tokensSold,
        uint256 _totalRaised,
        uint256 _saleStart,
        uint256 _saleEnd,
        bool _saleActive
    ) {
        return (
            tokenPrice,
            tokensAvailable,
            tokensSold,
            totalRaised,
            saleStart,
            saleEnd,
            saleActive
        );
    }
    
    /// @notice Get tokens purchased by a user
    /// @param user Address of the user
    /// @return Number of tokens purchased
    function getUserPurchase(address user) external view returns (uint256) {
        return purchasedTokens[user];
    }
    
    /// @notice Calculate token amount for given ETH
    /// @param ethAmount Amount of ETH in wei
    /// @return Token amount
    function calculateTokenAmount(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * 10**18) / tokenPrice;
    }
    
    /// @notice Calculate ETH needed for token amount
    /// @param tokenAmount Amount of tokens
    /// @return ETH amount in wei
    function calculateEthAmount(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * tokenPrice) / 10**18;
    }
}