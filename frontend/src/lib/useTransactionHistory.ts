"use client"

import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { parseAbiItem } from "viem"
import { useChainContracts } from "./useChainContracts"

export interface TxRecord {
  type: "given" | "received"
  counterparty: string // the other address
  amount: number       // USDC amount (human readable)
  blockNumber: bigint
  txHash: string
}

/**
 * Reads PlusOneGiven events for a specific address (both as sender and recipient).
 */
export function useTransactionHistory(userAddress: string | undefined) {
  const { chainId, plusOneAddress } = useChainContracts()
  const publicClient = usePublicClient({ chainId })
  const [given, setGiven] = useState<TxRecord[]>([])
  const [received, setReceived] = useState<TxRecord[]>([])
  const [loading, setLoading] = useState(true)

  const isDeployed = plusOneAddress !== "0x0000000000000000000000000000000000000000"

  useEffect(() => {
    if (!publicClient || !isDeployed || !userAddress) {
      setLoading(false)
      return
    }

    async function fetchHistory() {
      try {
        const eventAbi = parseAbiItem(
          "event PlusOneGiven(address indexed from, address indexed to, uint256 recipientNewCount, uint256 meritPoolContribution)"
        )

        // Fetch events where user is sender
        const givenLogs = await publicClient!.getLogs({
          address: plusOneAddress,
          event: eventAbi,
          args: { from: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: "latest",
        })

        // Fetch events where user is recipient
        const receivedLogs = await publicClient!.getLogs({
          address: plusOneAddress,
          event: eventAbi,
          args: { to: userAddress as `0x${string}` },
          fromBlock: 0n,
          toBlock: "latest",
        })

        setGiven(
          givenLogs.map(log => ({
            type: "given" as const,
            counterparty: log.args.to as string,
            amount: 1.2,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          })).reverse()
        )

        setReceived(
          receivedLogs.map(log => ({
            type: "received" as const,
            counterparty: log.args.from as string,
            amount: 1.0,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          })).reverse()
        )
      } catch (err) {
        console.error("Failed to fetch tx history:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [publicClient, plusOneAddress, userAddress, isDeployed])

  return { given, received, loading }
}
