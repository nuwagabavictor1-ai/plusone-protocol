"use client"

import { useEffect, useState } from "react"
import { useConnect } from "wagmi"

// Known wallet icons — inline SVG data URIs for wallets that don't provide their own
const WALLET_ICONS: Record<string, string> = {
  "metamask": "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path fill="#E17726" d="M36.8 3L22.2 14l2.7-6.4z"/><path fill="#E27625" d="M3.2 3l14.4 11.1L15.1 7.6zM31.5 28.8l-3.9 5.9 8.3 2.3 2.4-8.1zM1.7 28.9l2.4 8.1 8.3-2.3-3.9-5.9z"/><path fill="#E27625" d="M12 18.2l-2.3 3.5 8.2.4-.3-8.8zM28 18.2l-5.7-5 -.2 8.9 8.2-.4z"/><path fill="#E27625" d="M12.4 34.7l5-2.4-4.3-3.4zM22.6 32.3l5 2.4-.7-5.8z"/><path fill="#D5BFB2" d="M27.6 34.7l-5-2.4.4 3.3 0 1.4zM12.4 34.7l4.6 2.3 0-1.4.4-3.3z"/><path fill="#233447" d="M17.1 26.6l-4.1-1.2 2.9-1.3zM22.9 26.6l1.2-2.5 2.9 1.3z"/><path fill="#CC6228" d="M12.4 34.7l.7-5.9-4.6.1zM26.9 28.8l.7 5.9 3.9-5.8zM30.3 21.7l-8.2.4.8 4.5 1.2-2.5 2.9 1.3zM13 25.4l2.9-1.3 1.2 2.5.8-4.5-8.2-.4z"/><path fill="#E27525" d="M9.7 21.7l3.4 6.7-.1-3.3zM27 25.1l-.1 3.3 3.4-6.7zM17.9 22.1l-.8 4.5 1 5-.2-3.7zM22.1 22.1l-1 5.8-.2-5 1-4.5z"/><path fill="#F5841F" d="M22.1 22.1l-1 4.5.2 5 1-5 .8-4.5-8.2-.4.8 4.5-.2 5-1-5-.8-4.5z"/><path fill="#C0AC9D" d="M27.6 34.7l0-1.4-.4-.3H13.8l-.3.3 0 1.4-4.6-2.3 1.6 1.3 3.3 2.3h13.5l3.3-2.3 1.6-1.3z"/><path fill="#161616" d="M22.6 32.3l-5-2.4H17.1l-.4 3.3 0 1.4 4.6-2.3z M17.4 29.9l5 2.4 4.6 2.3 0-1.4-.4-3.3h-.5z"/><path fill="#763E1A" d="M37.3 14.9l1.2-6L36.8 3 22.6 13.6l5.4 4.6 7.6 2.2 1.7-2-.7-.5 1.2-1.1-.9-.7 1.2-.9zM1.5 8.9l1.2 6-.8.9 1.2.9-.9.7 1.2 1.1-.7.5 1.7 2 7.6-2.2 5.4-4.6L3.2 3z"/><path fill="#F5841F" d="M35.6 20.4l-7.6-2.2 2.3 3.5-3.4 6.7 4.5-.1h6.7zM12 18.2l-7.6 2.2-2.5 8.5h6.7l4.5.1-3.4-6.7zM22.1 22.1l.5-8.5 2.2-6h-9.6l2.2 6 .5 8.5.2 3.7 0 5.8h3.4l0-5.8z"/></svg>`),
  "coinbase": "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#0052FF"/><circle cx="20" cy="20" r="13" fill="#0052FF" stroke="white" stroke-width="2.5"/><rect x="16" y="16" width="8" height="8" rx="2" fill="white"/></svg>`),
  "walletconnect": "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#3B99FC"/><path fill="white" d="M11.5 15.5c4.7-4.7 12.3-4.7 17 0l.6.6c.2.2.2.6 0 .8l-2 2c-.1.1-.3.1-.4 0l-.8-.8c-3.3-3.3-8.6-3.3-11.8 0l-.8.8c-.1.1-.3.1-.4 0l-2-2c-.2-.2-.2-.6 0-.8zm21 3.9l1.8 1.8c.2.2.2.6 0 .8l-8 8c-.2.2-.6.2-.8 0l-5.7-5.7c-.1-.1-.2-.1-.2 0L14 30c-.2.2-.6.2-.8 0l-8-8c-.2-.2-.2-.6 0-.8l1.8-1.8c.2-.2.6-.2.8 0l5.7 5.7c.1.1.2.1.2 0l5.7-5.7c.2-.2.6-.2.8 0l5.7 5.7c.1.1.2.1.2 0l5.7-5.7c.2-.2.6-.2.8 0z"/></svg>`),
  "binance": "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#000000"/><g fill="#F0B90B"><polygon points="20,6 23.8,9.8 21.8,11.8 20,10 18.2,11.8 16.2,9.8"/><polygon points="11,15 14.8,18.8 12.8,20.8 11,19 9.2,20.8 7.2,18.8"/><polygon points="29,15 32.8,18.8 30.8,20.8 29,19 27.2,20.8 25.2,18.8"/><polygon points="20,15 23.8,18.8 20,22.6 16.2,18.8"/><polygon points="11,23 14.8,26.8 12.8,28.8 11,27 9.2,28.8 7.2,26.8"/><polygon points="29,23 32.8,26.8 30.8,28.8 29,27 27.2,28.8 25.2,26.8"/><polygon points="20,24 23.8,27.8 21.8,29.8 20,28 18.2,29.8 16.2,27.8"/></g></svg>`),
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
