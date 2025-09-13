// frontend/app.js

const tokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

const idoABI = [
  "function getSaleInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getUserPurchase(address) view returns (uint256)",
  "function buyTokens() payable",
  "function calculateTokenAmount(uint256) view returns (uint256)",
  "function calculateEthAmount(uint256) view returns (uint256)",
  "function minPurchase() view returns (uint256)",
  "function maxPurchase() view returns (uint256)",
  "function tokensAvailable() view returns (uint256)",
  "function tokensSold() view returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function saleActive() view returns (bool)",
  "function tokenPrice() view returns (uint256)",
  "function fundraisingTarget() view returns (uint256)",
  "event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost)"
];

// Update with your actual deployed addresses
const tokenAddress = "0x66ddb7BAF31E90d7d925C78d02Efe28195d4B84a";
const idoAddress = "0xDDaf1B239941Af55799AC42f90e53bf213075c43";

let provider, signer, tokenContract, idoContract;
let userAccount = null;

async function init() {
  // Connect to MetaMask
  if (window.ethereum) {
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();
      userAccount = await signer.getAddress();
      document.getElementById('walletAddress').textContent = userAccount.slice(0, 6) + '...' + userAccount.slice(-4);
      
      // Initialize contracts
      tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
      idoContract = new ethers.Contract(idoAddress, idoABI, signer);
      
      // Update UI
      await updateSaleInfo();
      await updateWalletInfo();

      // Show the purchase section
      document.getElementById('walletSection').classList.add('hidden');
      document.getElementById('purchaseSection').classList.remove('hidden');

      // Event listeners
      document.getElementById('buyTokens').addEventListener('click', buyTokens);
      document.getElementById('ethAmount').addEventListener('input', updateTokenAmount);

      // Listen for account/chain changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      showMessage("Failed to connect to MetaMask. Please make sure it's installed and unlocked.", 'error');
    }
  } else {
    showMessage("MetaMask is not installed. Please install it to use this DApp.", 'error');
  }
}

async function updateSaleInfo() {
  try {
    const saleInfo = await idoContract.getSaleInfo();
    const minPurchase = await idoContract.minPurchase();
    const maxPurchase = await idoContract.maxPurchase();
    
    const tokenPrice = ethers.formatEther(saleInfo[0]);
    const tokensAvailable = ethers.formatEther(saleInfo[1]);
    const tokensSold = ethers.formatEther(saleInfo[2]);
    const totalRaised = ethers.formatEther(saleInfo[3]);
    const saleStatus = saleInfo[6] ? "Active" : "Inactive";
    const progress = (parseFloat(tokensSold) / parseFloat(tokensAvailable)) * 100;
    
    document.getElementById('tokenPrice').textContent = `${tokenPrice} ETH`;
    document.getElementById('tokensAvailable').textContent = `${parseFloat(tokensAvailable).toLocaleString()} NLG`;
    document.getElementById('tokensSold').textContent = `${parseFloat(tokensSold).toLocaleString()} NLG`;
    document.getElementById('totalRaised').textContent = `${totalRaised} ETH`;
    document.getElementById('saleStatus').textContent = saleStatus;
    document.getElementById('progressBar').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('minPurchase').textContent = `${ethers.formatEther(minPurchase)} NLG`;
    document.getElementById('maxPurchase').textContent = `${ethers.formatEther(maxPurchase)} NLG`;

    if (!saleInfo[6]) {
        document.getElementById('buyTokens').disabled = true;
        document.getElementById('buyTokens').textContent = 'Sale Inactive';
    } else {
        document.getElementById('buyTokens').disabled = false;
        document.getElementById('buyTokens').textContent = '🛒 Buy Tokens';
    }
  } catch (error) {
    console.error("Error fetching sale info:", error);
    showMessage("Error fetching sale information. Check contract addresses.", 'error');
  }
}

async function updateWalletInfo() {
  if (!userAccount) return;
  try {
    const ethBalance = await provider.getBalance(userAccount);
    const nlgBalance = await tokenContract.balanceOf(userAccount);
    const userPurchase = await idoContract.getUserPurchase(userAccount);
    
    document.getElementById('ethBalance').textContent = parseFloat(ethers.formatEther(ethBalance)).toFixed(4);
    document.getElementById('nlgBalance').textContent = parseFloat(ethers.formatEther(nlgBalance)).toFixed(2);
    document.getElementById('yourPurchases').textContent = parseFloat(ethers.formatEther(userPurchase)).toFixed(2) + ' NLG';
  } catch (error) {
    console.error("Error fetching wallet info:", error);
  }
}

async function updateTokenAmount() {
  const ethInput = document.getElementById('ethAmount').value;
  if (ethInput && !isNaN(ethInput)) {
    try {
      const ethAmount = ethers.parseEther(ethInput);
      const tokenAmount = await idoContract.calculateTokenAmount(ethAmount);
      document.getElementById('tokenAmount').value = parseFloat(ethers.formatEther(tokenAmount)).toFixed(2);
    } catch (error) {
      console.error("Error calculating token amount:", error);
      document.getElementById('tokenAmount').value = '0';
    }
  } else {
    document.getElementById('tokenAmount').value = '0';
  }
}

async function buyTokens() {
  const ethInput = document.getElementById('ethAmount').value;
  if (!ethInput || isNaN(ethInput) || parseFloat(ethInput) <= 0) {
    showMessage("Please enter a valid ETH amount", 'error');
    return;
  }
  
  try {
    showMessage("Processing transaction...", 'info');
    document.getElementById('buyTokens').disabled = true;
    
    const ethAmount = ethers.parseEther(ethInput);
    const tx = await idoContract.buyTokens({ value: ethAmount });
    await tx.wait();
    
    showMessage("Purchase successful!", 'success');
    await updateSaleInfo();
    await updateWalletInfo();
    
  } catch (error) {
    console.error("Error buying tokens:", error);
    let errorMessage = "Transaction failed.";
    if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
    }
    showMessage(errorMessage, 'error');
    
  } finally {
    document.getElementById('buyTokens').disabled = false;
  }
}

function showMessage(message, type) {
    const messageEl = document.getElementById('statusMessage');
    messageEl.textContent = message;
    messageEl.className = `status-message status-${type}`;
    messageEl.classList.remove('hidden');
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected
        location.reload();
    } else if (accounts[0] !== userAccount) {
        // User switched accounts
        location.reload();
    }
}

function handleChainChanged(chainId) {
    // Reload page when chain changes
    location.reload();
}

// Auto-refresh data every 30 seconds
setInterval(async () => {
    if (userAccount) {
        await updateWalletInfo();
        await updateSaleInfo();
    }
}, 30000);

document.addEventListener('DOMContentLoaded', () => {
    // Add connect wallet event listener
    document.getElementById('connectWallet').addEventListener('click', init);
});
