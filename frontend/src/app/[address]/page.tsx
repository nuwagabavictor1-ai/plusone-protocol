"use client"

import { use } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { PLUS_ONE_ABI, PLUS_ONE_ADDRESS, ERC20_ABI, USDC_ADDRESS, ONE_DOLLAR } from "@/lib/contracts"
import { useRouter } from "next/navigation"

interface Props {
  params: Promise<{ address: string }>
}

export default function ProfilePage({ params }: Props) {
  const { address: pageAddress } = use(params)
  const { address: viewer, isConnected } = useAccount()
  const router = useRouter()

  const profileAddress = pageAddress as `0x${string}`
  const isOwn = viewer?.toLowerCase() === profileAddress.toLowerCase()

  // Read profile
  const { data: profile, refetch } = useReadContract({
    address:      PLUS_ONE_ADDRESS.baseSepolia,
    abi:          PLUS_ONE_ABI,
    functionName: "getProfile",
    args:         [profileAddress],
    chainId:      baseSepolia.id,
  })

  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address:      USDC_ADDRESS.baseSepolia,
    abi:          ERC20_ABI,
    functionName: "allowance",
    args:         viewer ? [viewer, PLUS_ONE_ADDRESS.baseSepolia] : undefined,
    chainId:      baseSepolia.id,
    query:        { enabled: !!viewer },
  })

  // Approve USDC
  const { writeContract: approve, data: approveTxHash } = useWriteContract()
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveTxHash })

  // Give +1
  const { writeContract: give, data: giveTxHash } = useWriteContract()
  const { isLoading: isGiving, isSuccess: gaveSuccess } = useWaitForTransactionReceipt({ hash: giveTxHash })

  // Withdraw
  const { writeContract: withdraw, data: withdrawTxHash } = useWriteContract()
  const { isLoading: isWithdrawing, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash })

  if (gaveSuccess || withdrawSuccess) {
    refetch()
  }

  const hasAllowance = allowance != null && allowance >= ONE_DOLLAR

  function handleGive() {
    if (!isConnected) return
    if (!hasAllowance) {
      approve({
        address:      USDC_ADDRESS.baseSepolia,
        abi:          ERC20_ABI,
        functionName: "approve",
        args:         [PLUS_ONE_ADDRESS.baseSepolia, ONE_DOLLAR],
        chainId:      baseSepolia.id,
      })
    } else {
      give({
        address:      PLUS_ONE_ADDRESS.baseSepolia,
        abi:          PLUS_ONE_ABI,
        functionName: "give",
        args:         [profileAddress],
        chainId:      baseSepolia.id,
      })
    }
  }

  function handleWithdraw() {
    withdraw({
      address:      PLUS_ONE_ADDRESS.baseSepolia,
      abi:          PLUS_ONE_ABI,
      functionName: "withdraw",
      chainId:      baseSepolia.id,
    })
  }

  if (!profile?.registered) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-neutral-500 text-sm tracking-widest">
          this address hasn't registered yet.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-8 text-neutral-600 text-xs tracking-widest hover:text-neutral-400 transition-colors"
        >
          ← back
        </button>
      </main>
    )
  }

  const balanceUsd = profile.balance ? (Number(profile.balance) / 1_000_000).toFixed(2) : "0.00"

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-12 text-center">

        {/* Count — the main thing */}
        <div className="space-y-2">
          <div className="text-6xl font-light text-white">
            +1: {profile.count.toString()}
          </div>
        </div>

        {/* Thought */}
        <p className="text-sm text-neutral-400 leading-relaxed">
          {profile.thought}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {!isOwn && isConnected && (
            <button
              onClick={handleGive}
              disabled={isApproving || isGiving}
              className="w-full py-3 border border-white text-white text-sm tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isApproving ? "approving..." : isGiving ? "sending +1..." : hasAllowance ? "+1" : "approve & +1"}
            </button>
          )}

          {isOwn && profile.balance > 0n && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">
                balance: ${balanceUsd}
              </p>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="w-full py-3 border border-neutral-600 text-neutral-400 text-sm tracking-widest hover:border-white hover:text-white transition-colors disabled:opacity-40"
              >
                {isWithdrawing ? "withdrawing..." : "withdraw"}
              </button>
            </div>
          )}
        </div>

        {/* Share */}
        <p
          onClick={() => navigator.clipboard.writeText(`+1: ${profile.count.toString()}\n${window.location.href}`)}
          className="text-xs text-neutral-600 cursor-pointer hover:text-neutral-400 transition-colors"
        >
          Just got +1. →
        </p>

        <button
          onClick={() => router.push("/")}
          className="text-neutral-700 text-xs tracking-widest hover:text-neutral-500 transition-colors"
        >
          ← back
        </button>
      </div>
    </main>
  )
}
