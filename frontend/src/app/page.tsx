"use client"

import { useRouter } from "next/navigation"
import { useAccount, useConnect } from "wagmi"
import { coinbaseWallet } from "wagmi/connectors"
import { useReadContract } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { PLUS_ONE_ABI, PLUS_ONE_ADDRESS } from "@/lib/contracts"
import { NightScene } from "@/components/NightScene"

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

  return (
    <>
      <NightScene />

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pb-52 pointer-events-none">
        <div className="text-center space-y-8">

          {/* Core mark + bouncing USDC letters */}
          <div
            className="flex items-end justify-center gap-3 select-none"
            style={{ animation: "title-glow 4s ease-in-out infinite" }}
          >
            <span className="text-8xl font-light tracking-widest text-white">+1</span>
            <div className="flex gap-px pb-4">
              {"USDC".split("").map((c, i) => (
                <span
                  key={i}
                  style={{
                    display:     "inline-block",
                    color:       i % 2 === 0 ? "#f4c045" : "#ff9ed2",
                    animation:   `usdc-bounce 0.78s ${i * 0.12}s ease-in-out infinite`,
                    fontSize:    "13px",
                    fontWeight:  900,
                    letterSpacing: "0.05em",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <p
            className="select-none"
            style={{
              fontFamily:    "'Caveat', cursive",
              fontSize:      "1.2rem",
              fontWeight:    600,
              color:         "rgba(255,255,255,0.48)",
              letterSpacing: "0.01em",
              lineHeight:    1.45,
              maxWidth:      "300px",
            }}
          >
            what if everyone give you 1 usdc?<br/>what would you do?
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
              className="w-48 py-3 border border-white text-white text-sm tracking-widest hover:bg-white hover:text-black transition-colors pointer-events-auto"
            >
              I'm in.
            </button>

            {isConnected && address && (
              <button
                onClick={() => router.push(`/${address}`)}
                className="w-48 py-3 text-neutral-600 text-sm tracking-widest hover:text-neutral-400 transition-colors pointer-events-auto"
              >
                check in
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
