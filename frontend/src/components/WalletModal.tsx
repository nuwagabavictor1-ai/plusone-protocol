"use client"

import { useEffect, useState } from "react"
import { useConnect } from "wagmi"

// Known wallet icons — inline SVG data URIs for wallets that don't provide their own
const WALLET_ICONS: Record<string, string> = {
  "metamask": "/wallets/metamask.svg",
  "coinbase": "/wallets/coinbase.svg",
  "walletconnect": "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#3B99FC"/><path fill="white" d="M11.5 15.5c4.7-4.7 12.3-4.7 17 0l.6.6c.2.2.2.6 0 .8l-2 2c-.1.1-.3.1-.4 0l-.8-.8c-3.3-3.3-8.6-3.3-11.8 0l-.8.8c-.1.1-.3.1-.4 0l-2-2c-.2-.2-.2-.6 0-.8zm21 3.9l1.8 1.8c.2.2.2.6 0 .8l-8 8c-.2.2-.6.2-.8 0l-5.7-5.7c-.1-.1-.2-.1-.2 0L14 30c-.2.2-.6.2-.8 0l-8-8c-.2-.2-.2-.6 0-.8l1.8-1.8c.2-.2.6-.2.8 0l5.7 5.7c.1.1.2.1.2 0l5.7-5.7c.2-.2.6-.2.8 0l5.7 5.7c.1.1.2.1.2 0l5.7-5.7c.2-.2.6-.2.8 0z"/></svg>`),
  "binance": "/wallets/binance.svg",
}

function getWalletIcon(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(WALLET_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return null
}

// Fallback colors
const WALLET_COLORS: Record<string, string> = {
  "metamask":       "#f6851b",
  "okx":            "#000000",
  "binance":        "#f0b90b",
  "coinbase":       "#0052ff",
  "walletconnect":  "#3b99fc",
  "phantom":        "#ab9ff2",
  "rabby":          "#7c7cff",
  "trust":          "#3375bb",
}

function getFallbackColor(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, color] of Object.entries(WALLET_COLORS)) {
    if (lower.includes(key)) return color
  }
  return "#666688"
}

interface WalletModalProps {
  open: boolean
  onClose: () => void
}

export function WalletModal({ open, onClose }: WalletModalProps) {
  const { connect, connectors, isPending } = useConnect()
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Auto-close on successful connection
  useEffect(() => {
    if (!isPending && connectingId) {
      // Small delay to let the state settle
      const t = setTimeout(() => {
        setConnectingId(null)
        onClose()
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isPending, connectingId, onClose])

  if (!open) return null

  // Dedupe connectors by name, hide generic "Injected"
  const seen = new Set<string>()
  const uniqueConnectors = connectors.filter(c => {
    const key = c.name.toLowerCase()
    if (key === "injected") return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div
      className="wallet-modal-overlay"
      onClick={onClose}
    >
      <div
        className="wallet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wallet list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {uniqueConnectors.map((connector) => {
            const isConnecting = connectingId === connector.uid
            const hasIcon = !!connector.icon

            return (
              <button
                key={connector.uid}
                onClick={() => {
                  setConnectingId(connector.uid)
                  connect({ connector })
                }}
                disabled={isPending}
                className="wallet-option"
              >
                {/* Wallet icon — connector icon > built-in SVG > fallback square */}
                {(() => {
                  const builtInIcon = getWalletIcon(connector.name)
                  const iconSrc = hasIcon ? connector.icon : builtInIcon
                  if (iconSrc) {
                    return (
                      <img
                        src={iconSrc}
                        alt={connector.name}
                        width={20}
                        height={20}
                        style={{ borderRadius: "4px", flexShrink: 0 }}
                      />
                    )
                  }
                  return (
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: "4px",
                      background: getFallbackColor(connector.name),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "white",
                      fontFamily: "monospace",
                    }}>
                      {connector.name.charAt(0)}
                    </div>
                  )
                })()}

                {/* Name */}
                <span style={{
                  fontFamily: "'Righteous', cursive",
                  fontSize: "10px",
                  color: isConnecting ? "rgba(255,220,180,0.7)" : "rgba(255,255,255,0.75)",
                  letterSpacing: "0.03em",
                  flex: 1,
                  textAlign: "left",
                }}>
                  {isConnecting ? "connecting..." : connector.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
