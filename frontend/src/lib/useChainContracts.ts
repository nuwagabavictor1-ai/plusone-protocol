import { useChainId } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { PLUS_ONE_ADDRESS, USDC_ADDRESS } from "./contracts"

/**
 * Returns contract addresses for the currently connected chain.
 * Falls back to Base Sepolia if chain is unknown.
 */
export function useChainContracts() {
  const chainId = useChainId()

  const fallbackChainId = baseSepolia.id
  const activeChainId = PLUS_ONE_ADDRESS[chainId] ? chainId : fallbackChainId

  return {
    chainId: activeChainId,
    plusOneAddress: (PLUS_ONE_ADDRESS[activeChainId] ?? PLUS_ONE_ADDRESS[fallbackChainId]) as `0x${string}`,
    usdcAddress: (USDC_ADDRESS[activeChainId] ?? USDC_ADDRESS[fallbackChainId]) as `0x${string}`,
  }
}
