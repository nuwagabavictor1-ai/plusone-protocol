"use client"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { useRouter } from "next/navigation"
import { PLUS_ONE_ABI, ERC20_ABI, DREAM_COST } from "@/lib/contracts"
import { useChainContracts } from "@/lib/useChainContracts"
import { useUsdcBalance } from "@/lib/useUsdcBalance"
import { Logo } from "@/components/Logo"

export default function CreatePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { chainId, plusOneAddress, usdcAddress } = useChainContracts()
  const [thought, setThought] = useState("")
  const [step, setStep] = useState<"input" | "approving" | "registering">("input")
  const [error, setError] = useState("")

  // USDC balance check
  const { balanceUsd: usdcBalanceUsd } = useUsdcBalance(address)

  // Check if already registered
  const { data: profile } = useReadContract({
    address:      plusOneAddress,
    abi:          PLUS_ONE_ABI,
    functionName: "getProfile",
    args:         address ? [address] : undefined,
    chainId,
    query:        { enabled: !!address },
  })

  // Check USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, plusOneAddress] : undefined,
    chainId, query: { enabled: !!address },
  })

  // Approve USDC
  const { writeContract: approveUsdc, data: approveTxHash } = useWriteContract()
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash })

  // Register
  const { writeContract: registerContract, data: registerTxHash } = useWriteContract()
  const { isLoading: isRegistering, isSuccess: registerSuccess } = useWaitForTransactionReceipt({ hash: registerTxHash })

  // After approve succeeds, proceed to register
  useEffect(() => {
    if (approveSuccess && step === "approving") {
      refetchAllowance()
      setStep("registering")
      registerContract({
        address:      plusOneAddress,
        abi:          PLUS_ONE_ABI,
        functionName: "register",
        args:         [thought.trim()],
        chainId,
      })
    }
  }, [approveSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to personal page after successful registration
  useEffect(() => {
    if (registerSuccess && address) {
      router.push(`/${address}`)
    }
  }, [registerSuccess, address, router])

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <Logo />
        <p className="text-neutral-500 text-sm tracking-widest">
          connect your wallet first.
        </p>
      </main>
    )
  }

  if (profile?.registered) {
    router.push(`/${address}`)
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!thought.trim()) return
    setError("")

    // Check USDC balance ($1 needed)
    if (usdcBalanceUsd < 1) {
      setError(`Not enough USDC. Need $1.00, have $${usdcBalanceUsd.toFixed(2)}`)
      return
    }

    const hasAllowance = allowance != null && allowance >= DREAM_COST

    if (!hasAllowance) {
      // Step 1: approve USDC first
      setStep("approving")
      approveUsdc({
        address: usdcAddress, abi: ERC20_ABI, functionName: "approve",
        args: [plusOneAddress, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
        chainId,
      })
    } else {
      // Already approved, register directly
      setStep("registering")
      registerContract({
        address:      plusOneAddress,
        abi:          PLUS_ONE_ABI,
        functionName: "register",
        args:         [thought.trim()],
        chainId,
      })
    }
  }

  const buttonText = step === "approving"
    ? "approving USDC..."
    : step === "registering" || isRegistering
      ? "registering..."
      : "I'm in. ($1 USDC)"

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-10">

        <div className="text-center">
          <div className="text-4xl font-light text-white mb-4">+1</div>
          <p className="text-xs text-neutral-500 tracking-widest">
            what would you do?
          </p>
          <p className="text-xs text-neutral-600 tracking-widest mt-2">
            publishing costs $1 USDC → Dream Fund
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-neutral-600 tracking-widest">
              如果有 +1，我会...
            </p>
            <textarea
              value={thought}
              onChange={e => setThought(e.target.value)}
              placeholder="complete the sentence"
              maxLength={200}
              rows={3}
              className="w-full bg-transparent border border-neutral-700 text-white text-sm p-3 resize-none focus:outline-none focus:border-neutral-400 transition-colors placeholder:text-neutral-700"
            />
            <p className="text-right text-xs text-neutral-700">
              {thought.length}/200
            </p>
          </div>

          {error && (
            <p className="text-xs text-amber-400 tracking-widest text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!thought.trim() || step !== "input"}
            className="w-full py-3 border border-white text-white text-sm tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {buttonText}
          </button>
        </form>

      </div>
      <Logo />
    </main>
  )
}
