// scripts/deploy.js
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');

// Helper function to add delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Starting deployment on Sepolia testnet...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    if (balance < ethers.parseEther("0.1")) {
        throw new Error("Insufficient balance for deployment (need at least 0.1 ETH)");
    }

    const foundersWallet = process.env.FOUNDERS_WALLET || deployer.address;
    const advisorsWallet = process.env.ADVISORS_WALLET || deployer.address;
    const communityWallet = process.env.COMMUNITY_WALLET || deployer.address;
    const treasuryWallet = process.env.TREASURY_WALLET || deployer.address;
    const privateWallet = process.env.PRIVATE_WALLET || deployer.address;

    // 1. Deploy NaijaLoyal Token FIRST
    console.log("\n1. Deploying NaijaLoyal Token...");
    const NaijaLoyal = await ethers.getContractFactory("NaijaLoyal");
    const token = await NaijaLoyal.deploy(
        foundersWallet,
        advisorsWallet,
        communityWallet,
        treasuryWallet
    );
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("NaijaLoyal Token deployed to:", tokenAddress);

    // Wait 15 seconds after token deployment
    console.log("⏳ Waiting 15 seconds for block confirmation...");
    await delay(15000);

    // IDO parameters
    const tokenPrice = 66000000000000n; // 0.000066 ETH
    const tokensAvailable = ethers.parseEther("100000"); // 100,000 tokens
    const minPurchase = ethers.parseEther("100"); // 100 tokens minimum
    const maxPurchase = ethers.parseEther("10000"); // 10,000 tokens maximum
    const fundraisingTarget = ethers.parseEther("6.6"); // 6.6 ETH target

    // 2. Deploy IDO Contract, passing the NaijaLoyal token's address
    console.log("\n2. Deploying IDO Contract...");
    const NaijaLoyalIDO = await ethers.getContractFactory("NaijaLoyalIDO");
    const idoContract = await NaijaLoyalIDO.deploy(
        tokenAddress,
        tokenPrice,
        tokensAvailable,
        minPurchase,
        maxPurchase,
        fundraisingTarget
    );
    await idoContract.waitForDeployment();
    const idoAddress = await idoContract.getAddress();
    console.log("IDO Contract deployed to:", idoAddress);

    // Wait 15 seconds after IDO deployment
    console.log("⏳ Waiting 15 seconds for block confirmation...");
    await delay(15000);

    // 3. Set up the IDO contract and token distribution
    console.log("\n3. Setting up token distribution...");
    const setIdoTx = await token.setIdoContract(idoAddress);
    await setIdoTx.wait(); // Wait for transaction to be mined
    console.log("IDO contract set");

    // Wait 15 seconds after setting IDO contract
    console.log("⏳ Waiting 15 seconds for block confirmation...");
    await delay(15000);

    const setPrivateTx = await token.setPrivateWallet(privateWallet);
    await setPrivateTx.wait(); // Wait for transaction to be mined
    console.log("Private wallet set");

    // Wait 15 seconds after setting private wallet
    console.log("⏳ Waiting 15 seconds for block confirmation...");
    await delay(15000);

    // This part should work now that the IDO contract is known
    console.log("Distributing tokens...");
    const distributeTx = await token.distributeTokens();
    await distributeTx.wait(); // Wait for transaction to be mined
    console.log("Token distribution completed!");

    // Wait 15 seconds after token distribution
    console.log("⏳ Waiting 15 seconds for block confirmation...");
    await delay(15000);

    console.log("\n4. Starting IDO sale...");
    const saleDuration = 30 * 24 * 60 * 60; // 30 days in seconds
    const startSaleTx = await idoContract.startSale(saleDuration);
    await startSaleTx.wait(); // Wait for transaction to be mined
    console.log("IDO sale started!");

    // Save deployment addresses
    const deploymentInfo = {
        network: "sepolia",
        token: {
            name: "NaijaLoyal",
            symbol: "NLG",
            address: tokenAddress,
            totalSupply: "1000000"
        },
        ido: {
            address: idoAddress,
            tokenPrice: "0.000066",
            tokensAvailable: "100000",
            fundraisingTarget: "6.6"
        },
        wallets: {
            founders: foundersWallet,
            advisors: advisorsWallet,
            community: communityWallet,
            treasury: treasuryWallet,
            private: privateWallet
        },
        deployment: {
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            blockNumber: await deployer.provider.getBlockNumber()
        }
    };

    fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));

    console.log("\n✅ Deployment completed successfully!");
    console.log("📄 Deployment info saved to deployment-info.json");
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});