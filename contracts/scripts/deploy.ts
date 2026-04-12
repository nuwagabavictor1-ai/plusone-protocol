import { ethers, network } from "hardhat"

// Network-specific addresses
const ADDRESSES: Record<string, {
  usdc: string
  vrfCoordinator: string
  keyHash: string
}> = {
  "base-sepolia": {
    usdc: "0x9A37B1C96DACbbf90BF550d7Fb0D3C0Ab70Ec64e", // MockUSDC for testing
    // VRF V2.5 on Base Sepolia — placeholder, update when Chainlink confirms
    vrfCoordinator: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634",
    keyHash: "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71",
  },
  "base": {
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    vrfCoordinator: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634",
    keyHash: "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71",
  },
  "bsc-testnet": {
    usdc: "0x821E7a04EeDf28f434A8af196ADf052F306a5608", // MockUSDC
    vrfCoordinator: "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f",
    keyHash: "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13b2a0051ee",
  },
  "bsc": {
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    vrfCoordinator: "0xc587d9053cd1118f25F645F9E08BB98c9712A4EE",
    keyHash: "0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04",
  },
}

async function main() {
  const networkName = network.name
  console.log(`\n🚀 Deploying PlusOne to ${networkName}...\n`)

  const config = ADDRESSES[networkName]
  if (!config) {
    throw new Error(`Unknown network: ${networkName}. Supported: ${Object.keys(ADDRESSES).join(", ")}`)
  }

  // VRF subscription ID — 0 means raffle disabled (core functions still work)
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID || "0"
  const callbackGasLimit = 300_000

  const vrfEnabled = subscriptionId !== "0"

  console.log("  USDC:            ", config.usdc)
  console.log("  VRF Coordinator: ", config.vrfCoordinator)
  console.log("  VRF Sub ID:      ", subscriptionId, vrfEnabled ? "" : "(⚠️  raffle disabled)")
  console.log("  Callback Gas:    ", callbackGasLimit)
  console.log()

  const PlusOne = await ethers.getContractFactory("PlusOne")
  const plusOne = await PlusOne.deploy(
    config.usdc,
    config.vrfCoordinator,
    BigInt(subscriptionId),
    config.keyHash,
    BigInt(callbackGasLimit)
  )

  await plusOne.waitForDeployment()
  const deployedAddress = await plusOne.getAddress()

  console.log(`✅ PlusOne deployed to: ${deployedAddress}\n`)

  if (!vrfEnabled) {
    console.log("⚠️  VRF_SUBSCRIPTION_ID=0 → raffle functions disabled.")
    console.log("   Core functions (register, give, withdraw) work normally.")
    console.log("   To enable raffle later: redeploy with a valid VRF subscription.\n")
  }

  console.log("📋 Next steps:")
  console.log(`  1. Update frontend/src/lib/contracts.ts:`)
  console.log(`     PLUS_ONE_ADDRESS.baseSepolia = "${deployedAddress}"`)
  if (vrfEnabled) {
    console.log(`  2. Add contract as VRF consumer on subscription ${subscriptionId}`)
  }
  console.log(`  ${vrfEnabled ? "3" : "2"}. Verify on BaseScan:`)
  console.log(`     npx hardhat verify --network ${networkName} ${deployedAddress} \\`)
  console.log(`       "${config.usdc}" "${config.vrfCoordinator}" "${subscriptionId}" "${config.keyHash}" "${callbackGasLimit}"`)
  console.log(`  ${vrfEnabled ? "4" : "3"}. Get testnet USDC from Base Sepolia faucet`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
