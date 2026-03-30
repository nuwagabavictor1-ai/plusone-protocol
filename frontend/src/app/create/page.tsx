"use client"

import { useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { useRouter } from "next/navigation"
import { PLUS_ONE_ABI, PLUS_ONE_ADDRESS } from "@/lib/contracts"

export default function CreatePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [thought, setThought] = useState("")

  // Check if already registered
  const { data: profile } = useReadContract({
    address:      PLUS_ONE_ADDRESS.baseSepolia,
    abi:          PLUS_ONE_ABI,
    functionName: "getProfile",
    args:         address ? [address] : undefined,
    chainId:      baseSepolia.id,
    query:        { enabled: !!address },
  })

  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess && address) {
    router.push(`/${address}`)
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-neutral-500 text-sm tracking-widest">
          connect your wallet first.
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

  if (profile?.registered) {
    router.push(`/${address}`)
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!thought.trim()) return

    writeContract({
      address:      PLUS_ONE_ADDRESS.baseSepolia,
      abi:          PLUS_ONE_ABI,
      functionName: "register",
      args:         [thought.trim()],
      chainId:      baseSepolia.id,
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-10">

        <div className="text-center">
          <div className="text-4xl font-light text-white mb-4">+1</div>
          <p className="text-xs text-neutral-500 tracking-widest">
            what would you do?
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

          <button
            type="submit"
            disabled={!thought.trim() || isLoading}
            className="w-full py-3 border border-white text-white text-sm tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? "registering..." : "I'm in."}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="w-full text-center text-neutral-700 text-xs tracking-widest hover:text-neutral-500 transition-colors"
        >
          ← back
        </button>
      </div>
    </main>
  )
}
