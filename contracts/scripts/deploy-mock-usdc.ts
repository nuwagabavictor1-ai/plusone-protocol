import { ethers, network } from "hardhat"

async function main() {
  const networkName = network.name
  console.log(`\n🪙 Deploying MockUSDC to ${networkName}...\n`)

  const MockUSDC = await ethers.getContractFactory("MockUSDC")
  const usdc = await MockUSDC.deploy()
  await usdc.waitForDeployment()
  const usdcAddress = await usdc.getAddress()

  console.log(`✅ MockUSDC deployed to: ${usdcAddress}`)

  // Mint $10,000 to deployer
  const [deployer] = await ethers.getSigners()
  const mintAmount = 10_000_000_000n // $10,000 USDC (6 decimals)
  await usdc.mint(deployer.address, mintAmount)
  console.log(`💰 Minted $10,000 USDC to ${deployer.address}`)

  console.log(`\n📋 Next steps:`)
  console.log(`  1. Update frontend/src/lib/contracts.ts USDC_ADDRESS for chain ${networkName}`)
  console.log(`  2. Redeploy PlusOne with this MockUSDC address`)
  console.log(`  3. Anyone can call mint(address, amount) to get test USDC`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
