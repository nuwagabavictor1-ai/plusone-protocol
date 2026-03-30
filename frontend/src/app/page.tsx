"use client"

import { useRouter } from "next/navigation"
import { useAccount, useConnect } from "wagmi"
import { coinbaseWallet } from "wagmi/connectors"
import { useReadContract } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { PLUS_ONE_ABI, PLUS_ONE_ADDRESS } from "@/lib/contracts"

export default function HomePage() {
  const router   = useRouter()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()

  const { data: userCount } = useReadContract({
    address: PLUS_ONE_ADDRESS.baseSepolia,
    abi:     PLUS_ONE_ABI,
    functionName: "getUserCount",
    chainId: baseSepolia.id,
  })

  function handleImIn() {
    if (isConnected && address) {
      router.push("/create")
    } else {
      connect({ connector: coinbaseWallet({ appName: "一块钱计划", preference: "smartWalletOnly" }) })
    }
  }

  function handleTryPlusOne() {
    if (isConnected && address) {
      router.push(`/${address}`)
    } else {
      connect({ connector: coinbaseWallet({ appName: "一块钱计划", preference: "smartWalletOnly" }) })
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Core mark */}
      <div className="text-center space-y-8">
        <div className="text-8xl font-light tracking-widest text-white select-none">
          +1
        </div>

        <p className="text-sm text-neutral-400 tracking-widest uppercase">
          what if everyone did?
        </p>

        {/* Stats */}
        {userCount != null && userCount > 0n && (
          <p className="text-xs text-neutral-600">
            {userCount.toString()} people in
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 items-center pt-4">
          <button
            onClick={handleImIn}
            className="w-48 py-3 border border-white text-white text-sm tracking-widest hover:bg-white hover:text-black transition-colors"
          >
            I'm in.
          </button>

          <button
            onClick={handleTryPlusOne}
            className="w-48 py-3 border border-neutral-600 text-neutral-400 text-sm tracking-widest hover:border-neutral-400 hover:text-white transition-colors"
          >
            try +1
          </button>

          {isConnected && address && (
            <button
              onClick={() => router.push(`/${address}`)}
              className="w-48 py-3 text-neutral-600 text-sm tracking-widest hover:text-neutral-400 transition-colors"
            >
              check in
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
