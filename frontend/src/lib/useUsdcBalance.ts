"use client"

import { useReadContract } from "wagmi"
import { ERC20_ABI } from "./contracts"
import { useChainContracts } from "./useChainContracts"

/**
 * Returns the user's USDC balance on the current chain.
 */
export function useUsdcBalance(address: `0x${string}` | undefined) {
  const { chainId, usdcAddress } = useChainContracts()

  const { data: balance, refetch } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!address },
  })

  const balanceUsd = balance != null ? Number(balance) / 1_000_000 : 0

  return { balance: balance ?? 0n, balanceUsd, refetch }
}
