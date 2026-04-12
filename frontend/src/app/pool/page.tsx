"use client"

import { useRouter } from "next/navigation"
import { useReadContract } from "wagmi"
import { PLUS_ONE_ABI } from "@/lib/contracts"
import { useChainContracts } from "@/lib/useChainContracts"
import { NightScene } from "@/components/NightScene"
import { Logo } from "@/components/Logo"

export default function PoolPage() {
  const router = useRouter()
  const { chainId, plusOneAddress } = useChainContracts()

  // Read on-chain pool data
  const { data: meritPool } = useReadContract({
    address: plusOneAddress, abi: PLUS_ONE_ABI,
    functionName: "meritPool", chainId,
  })
  const { data: dreamFund } = useReadContract({
    address: plusOneAddress, abi: PLUS_ONE_ABI,
    functionName: "dreamFund", chainId,
  })
  const { data: userCount } = useReadContract({
    address: plusOneAddress, abi: PLUS_ONE_ABI,
    functionName: "getUserCount", chainId,
  })
  const { data: raffleState } = useReadContract({
    address: plusOneAddress, abi: PLUS_ONE_ABI,
    functionName: "raffleState", chainId,
  })

  const meritUsd = meritPool ? (Number(meritPool) / 1_000_000).toFixed(2) : "0.00"
  const dreamUsd = dreamFund ? (Number(dreamFund) / 1_000_000).toFixed(2) : "0.00"
  const totalUsd = meritPool && dreamFund
    ? ((Number(meritPool) + Number(dreamFund)) / 1_000_000).toFixed(2)
    : "0.00"
  const users = userCount ? userCount.toString() : "0"

  const raffleLabels = ["Idle", "Open", "Drawing", "Settled"]
  const raffleLabel = raffleState != null ? raffleLabels[Number(raffleState)] || "Unknown" : "—"
  const raffleColors = ["rgba(255,255,255,0.3)", "rgba(100,255,150,0.8)", "rgba(255,210,80,0.8)", "rgba(200,180,255,0.8)"]
  const raffleColor = raffleState != null ? raffleColors[Number(raffleState)] || "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.3)"

  return (
    <>
      <NightScene paused={false} skyOnly auroraColor="0,200,100" />

      <main className="relative z-10 min-h-screen px-4 py-16">
        <div style={{ maxWidth: "480px", margin: "0 auto" }}>

          <Logo />

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h1 style={{
              fontFamily: "'Righteous', cursive",
              fontSize: "28px",
              color: "rgba(255,210,80,0.9)",
              letterSpacing: "0.06em",
              textShadow: "0 0 20px rgba(255,200,60,0.2)",
            }}>
              Pools
            </h1>
            <div style={{
              width: "40px", height: "2px", margin: "12px auto",
              background: "linear-gradient(90deg, transparent, rgba(255,210,80,0.4), transparent)",
            }}/>
            <span style={{
              fontFamily: "'Righteous', cursive",
              fontSize: "36px",
              color: "rgba(255,255,255,0.95)",
              textShadow: "0 0 16px rgba(255,210,80,0.25)",
            }}>
              ${totalUsd}
            </span>
            <p style={{
              fontFamily: "'Righteous', cursive",
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.08em",
              marginTop: "6px",
            }}>
              total across both pools · {users} dreamers
            </p>
          </div>

          {/* Dual Pool Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "28px",
          }}>
            {/* Merit Pool */}
            <div style={{
              padding: "20px 16px",
              borderRadius: "16px",
              background: "rgba(255,80,80,0.06)",
              border: "1px solid rgba(255,80,80,0.1)",
            }}>
              <p style={{
                fontFamily: "'Righteous', cursive", fontSize: "9px",
                color: "rgba(255,100,100,0.6)", letterSpacing: "0.08em", marginBottom: "8px",
              }}>
                MERIT POOL
              </p>
              <p style={{
                fontFamily: "'Righteous', cursive", fontSize: "24px",
                color: "rgba(255,100,100,0.9)",
              }}>
                ${meritUsd}
              </p>
              <p style={{
                fontFamily: "'Caveat', cursive", fontSize: "12px", fontWeight: 700,
                color: "rgba(255,255,255,0.35)", marginTop: "8px", lineHeight: 1.4,
              }}>
                $0.20 from every +1. Fuels weekly raffles.
              </p>
            </div>

            {/* Dream Fund */}
            <div style={{
              padding: "20px 16px",
              borderRadius: "16px",
              background: "rgba(255,210,80,0.06)",
              border: "1px solid rgba(255,210,80,0.1)",
            }}>
              <p style={{
                fontFamily: "'Righteous', cursive", fontSize: "9px",
                color: "rgba(255,210,80,0.6)", letterSpacing: "0.08em", marginBottom: "8px",
              }}>
                DREAM FUND
              </p>
              <p style={{
                fontFamily: "'Righteous', cursive", fontSize: "24px",
                color: "rgba(255,210,80,0.9)",
              }}>
                ${dreamUsd}
              </p>
              <p style={{
                fontFamily: "'Caveat', cursive", fontSize: "12px", fontWeight: 700,
                color: "rgba(255,255,255,0.35)", marginTop: "8px", lineHeight: 1.4,
              }}>
                $1 per dream. 80% public good, 20% builders.
              </p>
            </div>
          </div>

          {/* Raffle Status */}
          <div style={{
            padding: "16px 20px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: "28px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{
                  fontFamily: "'Righteous', cursive", fontSize: "9px",
                  color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
                }}>
                  WEEKLY RAFFLE
                </p>
                <p style={{
                  fontFamily: "'Righteous', cursive", fontSize: "14px",
                  color: raffleColor, marginTop: "4px",
                }}>
                  {raffleLabel}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{
                  fontFamily: "'Righteous', cursive", fontSize: "9px",
                  color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
                }}>
                  TIERS
                </p>
                <p style={{
                  fontFamily: "'Righteous', cursive", fontSize: "11px",
                  color: "rgba(255,255,255,0.5)", marginTop: "4px",
                }}>
                  7 · 77 · 777
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{
            textAlign: "center",
            padding: "20px 0",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            <p style={{
              fontFamily: "'Caveat', cursive", fontSize: "14px", fontWeight: 700,
              color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
            }}>
              Give 7 / 77 / 777 +1s in a week to qualify for the raffle.
              <br />
              Every Saturday, winners share the Merit Pool.
            </p>
          </div>

        </div>
      </main>
    </>
  )
}
