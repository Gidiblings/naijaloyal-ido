// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NaijaLoyal ERC20 Token
/// @notice ERC20 token for NaijaLoyal with distribution logic
contract NaijaLoyal is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens with 18 decimals
    
    // Token distribution percentages (in basis points, 10000 = 100%)
    uint256 public constant FOUNDERS_ALLOCATION = 1500; // 15%
    uint256 public constant ADVISORS_ALLOCATION = 500;  // 5%
    uint256 public constant COMMUNITY_ALLOCATION = 3000; // 30%
    uint256 public constant TREASURY_ALLOCATION = 2500;  // 25%
    uint256 public constant IDO_ALLOCATION = 1000;       // 10%
    uint256 public constant PRIVATE_ALLOCATION = 1000;   // 10%
    uint256 public constant RESERVE_ALLOCATION = 500;    // 5%
    
    // Addresses for different allocations
    address public foundersWallet;
    address public advisorsWallet;
    address public communityWallet;
    address public treasuryWallet;
    address public idoContract;
    address public privateWallet;
    
    bool public distributionComplete = false;
    
    // Events
    event TokensDistributed(address indexed operator, uint256 totalDistributed);

    /// @notice Constructor to initialize token and allocation wallets
    /// @param _foundersWallet Address for founders' allocation
    /// @param _advisorsWallet Address for advisors' allocation
    /// @param _communityWallet Address for community allocation
    /// @param _treasuryWallet Address for treasury allocation
    constructor(
        address _foundersWallet,
        address _advisorsWallet,
        address _communityWallet,
        address _treasuryWallet
    ) ERC20("NaijaLoyal", "NLG") Ownable(msg.sender) {
        require(_foundersWallet != address(0), "Invalid founders wallet");
        require(_advisorsWallet != address(0), "Invalid advisors wallet");
        require(_communityWallet != address(0), "Invalid community wallet");
        require(_treasuryWallet != address(0), "Invalid treasury wallet");
        
        foundersWallet = _foundersWallet;
        advisorsWallet = _advisorsWallet;
        communityWallet = _communityWallet;
        treasuryWallet = _treasuryWallet;

        // Mint total supply to contract owner initially
        _mint(msg.sender, TOTAL_SUPPLY);
    }
    
    function setIdoContract(address _idoContract) external onlyOwner {
        require(_idoContract != address(0), "Invalid IDO contract address");
        idoContract = _idoContract;
    }
    
    function setPrivateWallet(address _privateWallet) external onlyOwner {
        require(_privateWallet != address(0), "Invalid private wallet address");
        privateWallet = _privateWallet;
    }
    
    /// @notice Distributes the initial token supply to all allocation wallets
    function distributeTokens() external onlyOwner {
        require(!distributionComplete, "Distribution already completed");
        require(idoContract != address(0), "IDO contract not set");
        require(privateWallet != address(0), "Private wallet not set");
        
        uint256 foundersTokens = (TOTAL_SUPPLY * FOUNDERS_ALLOCATION) / 10000;
        uint256 advisorsTokens = (TOTAL_SUPPLY * ADVISORS_ALLOCATION) / 10000;
        uint256 communityTokens = (TOTAL_SUPPLY * COMMUNITY_ALLOCATION) / 10000;
        uint256 treasuryTokens = (TOTAL_SUPPLY * TREASURY_ALLOCATION) / 10000;
        uint256 idoTokens = (TOTAL_SUPPLY * IDO_ALLOCATION) / 10000;
        uint256 privateTokens = (TOTAL_SUPPLY * PRIVATE_ALLOCATION) / 10000;
        uint256 reserveTokens = (TOTAL_SUPPLY * RESERVE_ALLOCATION) / 10000;
        
        // Transfer tokens to respective wallets
        _transfer(msg.sender, foundersWallet, foundersTokens);
        _transfer(msg.sender, advisorsWallet, advisorsTokens);
        _transfer(msg.sender, communityWallet, communityTokens);
        _transfer(msg.sender, treasuryWallet, treasuryTokens);
        _transfer(msg.sender, idoContract, idoTokens);
        _transfer(msg.sender, privateWallet, privateTokens);
        // Reserve tokens remain with owner
        
        distributionComplete = true;
        emit TokensDistributed(msg.sender, TOTAL_SUPPLY - reserveTokens);
    }
    
    /// @notice Allows the contract owner to withdraw any remaining tokens after the IDO
    function withdrawRemainingTokens() external onlyOwner {
        require(distributionComplete, "Tokens have not been distributed yet");
        _transfer(address(this), msg.sender, balanceOf(address(this)));
    }
}