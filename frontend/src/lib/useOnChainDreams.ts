"use client"

import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { parseAbiItem } from "viem"
import { useChainContracts } from "./useChainContracts"

export interface OnChainDream {
  address: string
  thought: string
  dreamIndex: number
  blockNumber: bigint
}

/**
 * Reads all Registered + DreamPublished events from the PlusOne contract.
 * Returns a list of dreams with addresses and thoughts.
 * Falls back to empty array if contract not deployed (address 0x000...).
 */
export function useOnChainDreams() {
  const { chainId, plusOneAddress } = useChainContracts()
  const publicClient = usePublicClient({ chainId })
  const [dreams, setDreams] = useState<OnChainDream[]>([])
  const [loading, setLoading] = useState(true)

  const isDeployed = plusOneAddress !== "0x0000000000000000000000000000000000000000"

  useEffect(() => {
    if (!publicClient || !isDeployed) {
      setLoading(false)
      return
    }

    async function fetchDreams() {
      try {
        // Fetch Registered events
        const registeredLogs = await publicClient!.getLogs({
          address: plusOneAddress,
          event: parseAbiItem("event Registered(address indexed user, uint256 dreamIndex, string thought)"),
          fromBlock: 0n,
          toBlock: "latest",
        })

        // Fetch DreamPublished events
        const publishedLogs = await publicClient!.getLogs({
          address: plusOneAddress,
          event: parseAbiItem("event DreamPublished(address indexed user, uint256 dreamIndex, string thought)"),
          fromBlock: 0n,
          toBlock: "latest",
        })

        const allDreams: OnChainDream[] = [
          ...registeredLogs.map(log => ({
            address: log.args.user as string,
            thought: log.args.thought as string,
            dreamIndex: Number(log.args.dreamIndex),
            blockNumber: log.blockNumber,
          })),
          ...publishedLogs.map(log => ({
            address: log.args.user as string,
            thought: log.args.thought as string,
            dreamIndex: Number(log.args.dreamIndex),
            blockNumber: log.blockNumber,
          })),
        ]

        // Sort by block number (newest first)
        allDreams.sort((a, b) => Number(b.blockNumber - a.blockNumber))

        setDreams(allDreams)
      } catch (err) {
        console.error("Failed to fetch on-chain dreams:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDreams()
  }, [publicClient, plusOneAddress, isDeployed])

  return { dreams, loading, isDeployed }
}
