"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain, useChainId } from "wagmi"
import { useRouter } from "next/navigation"
import { PLUS_ONE_ABI, ERC20_ABI, GIVE_COST } from "@/lib/contracts"
import { useChainContracts } from "@/lib/useChainContracts"
import { useOnChainDreams } from "@/lib/useOnChainDreams"
import { useUsdcBalance } from "@/lib/useUsdcBalance"
import { NightScene } from "@/components/NightScene"
import { WalletModal } from "@/components/WalletModal"
import { PixelAvatar } from "@/components/PixelAvatar"
import { Logo } from "@/components/Logo"

// Dream pool — starts from the 7 homepage dreams
const DREAM_POOL = [
  { address: "0xaaa1", thought: "Open a free coding school for kids in my village", count: 312, name: "Ada" },
  { address: "0xbbb2", thought: "Launch a scholarship for first-generation college students", count: 1089, name: "Kai" },
  { address: "0xccc3", thought: "Create a documentary about forgotten war veterans", count: 456, name: "Orion" },
  { address: "0xddd4", thought: "Fund 100 hearing aids for children who can't afford them", count: 2741, name: "Mochi" },
  { address: "0xeee5", thought: "Start a micro-farm that feeds the whole neighborhood", count: 187, name: "Fern" },
  { address: "0xfff6", thought: "Build a playground in a refugee camp", count: 863, name: "Sol" },
  { address: "0x1117", thought: "Turn an abandoned building into a community art space", count: 95, name: "Nova" },
]

const DREAM_COLORS = [
  "255,148,72", "255,218,55", "75,205,118", "168,120,255",
  "78,162,255", "95,228,182", "255,168,210",
]

interface Dream {
  address: string
  thought: string
  count: number
  color: string
  name: string
}

export default function DiscoverPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { chainId, plusOneAddress, usdcAddress } = useChainContracts()
  const [dreams, setDreams] = useState<Dream[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [animState, setAnimState] = useState<"idle" | "plus" | "up" | "down" | "like" | "dislike">("idle")
  const [flyDir, setFlyDir] = useState({ x: 0, y: -1, r: 0 }) // random fly direction
  const [totalGiven, setTotalGiven] = useState(0)
  const [showTransferPrompt, setShowTransferPrompt] = useState(false)
  const [showCoinDrop, setShowCoinDrop] = useState(false)
  const [walletModal, setWalletModal] = useState(false)
  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe")
  const [sortMode, setSortMode] = useState<"Hot" | "New" | "Liked">("Hot")

  // Transfer panel state
  const [sendAddr, setSendAddr] = useState("")
  const [sendChain, setSendChain] = useState<number>(chainId)
  const [sendStatus, setSendStatus] = useState<"" | "switching" | "approving" | "sending" | "success" | "failed">("")
  const { switchChain } = useSwitchChain()
  const currentChainId = useChainId()
  const touchStartY = useRef(0)

  // Contract hooks
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, plusOneAddress] : undefined,
    chainId, query: { enabled: !!address },
  })
  const { writeContract: approve, data: approveTxHash, error: approveError, reset: resetApprove } = useWriteContract()
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { writeContract: give, data: giveTxHash, error: giveWriteError, reset: resetGive } = useWriteContract()
  const { isSuccess: giveSuccess, isError: giveTxError } = useWaitForTransactionReceipt({ hash: giveTxHash })

  // USDC balance check
  const { balanceUsd: usdcBalanceUsd } = useUsdcBalance(address)

  // On-chain dreams
  const { dreams: onChainDreams, loading: dreamsLoading } = useOnChainDreams()

  // Transaction status toast
  const [txStatus, setTxStatus] = useState<"" | "pending" | "success" | "failed" | "insufficient">("")

  // After approve succeeds, auto-call give
  const pendingGiveRef = useRef<string | null>(null)
  useEffect(() => {
    if (approveSuccess && pendingGiveRef.current) {
      refetchAllowance()
      give({
        address: plusOneAddress, abi: PLUS_ONE_ABI, functionName: "give",
        args: [pendingGiveRef.current as `0x${string}`], chainId,
      })
      pendingGiveRef.current = null
    }
  }, [approveSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // Give success/error feedback
  useEffect(() => {
    if (giveSuccess) {
      setTxStatus("success")
      setTimeout(() => { setTxStatus(""); resetGive() }, 3000)
    }
  }, [giveSuccess]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (giveTxError) {
      setTxStatus("failed")
      setAnimState("idle")
      setTimeout(() => { setTxStatus(""); resetGive() }, 3000)
    }
  }, [giveTxError]) // eslint-disable-line react-hooks/exhaustive-deps
  // User rejected wallet signature
  useEffect(() => {
    if (giveWriteError || approveError) {
      setTxStatus("failed")
      setAnimState("idle")
      pendingGiveRef.current = null
      setTimeout(() => { setTxStatus(""); resetGive(); resetApprove() }, 3000)
    }
  }, [giveWriteError, approveError]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load dreams: on-chain first, mock as fallback seed content
  useEffect(() => {
    const allDreams: Dream[] = []

    // Add on-chain dreams
    for (const d of onChainDreams) {
      const colorIdx = parseInt(d.address.slice(-2), 16) % DREAM_COLORS.length
      const name = localStorage.getItem(`plusone_name_${d.address}`) || ""
      allDreams.push({
        address: d.address,
        thought: d.thought,
        count: 0,
        color: DREAM_COLORS[colorIdx],
        name,
      })
    }

    // Add mock seed dreams only if no on-chain data
    if (allDreams.length === 0) {
      for (const [i, d] of DREAM_POOL.entries()) {
        allDreams.push({ ...d, color: DREAM_COLORS[i % DREAM_COLORS.length] })
      }
    }

    // Shuffle
    for (let i = allDreams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allDreams[i], allDreams[j]] = [allDreams[j], allDreams[i]]
    }
    setDreams(allDreams)
  }, [onChainDreams, address])

  const current = dreams[currentIdx]
  const nextDream = dreams[(currentIdx + 1) % dreams.length]
  const prevDream = currentIdx > 0 ? dreams[currentIdx - 1] : null

  const randomFly = useCallback(() => {
    const angle = Math.random() * Math.PI * 2
    setFlyDir({
      x: Math.cos(angle) * 130,
      y: Math.sin(angle) * 130,
      r: (Math.random() - 0.5) * 25,
    })
  }, [])

  const goNext = useCallback(() => {
    randomFly()
    setAnimState("up")
    setTimeout(() => {
      if (currentIdx >= dreams.length - 1) {
        setCurrentIdx(0)
        setDreams(prev => {
          const s = [...prev]
          for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]] }
          return s
        })
      } else {
        setCurrentIdx(prev => prev + 1)
      }
      setAnimState("idle")
    }, 700)
  }, [currentIdx, dreams.length, randomFly])

  const goPrev = useCallback(() => {
    if (currentIdx <= 0) return
    randomFly()
    setAnimState("down")
    setTimeout(() => {
      setCurrentIdx(prev => prev - 1)
      setAnimState("idle")
    }, 700)
  }, [currentIdx, randomFly])

  function handleLike() {
    if (animState !== "idle" || !current) return
    if (!isConnected) { setWalletModal(true); return }
    setAnimState("like")
    // Save to localStorage liked list
    const likedKey = "plusone_liked"
    const liked: string[] = JSON.parse(localStorage.getItem(likedKey) || "[]")
    if (!liked.includes(current.address)) {
      liked.push(current.address)
      localStorage.setItem(likedKey, JSON.stringify(liked))
    }
    // Show transfer prompt after like animation
    setTimeout(() => {
      setAnimState("idle")
      setShowTransferPrompt(true)
    }, 500)
  }

  function handleTransferYes() {
    setShowTransferPrompt(false)
    if (!isConnected) {
      setWalletModal(true)
      return
    }
    handlePlusOne()
  }

  function handleTransferNo() {
    setShowTransferPrompt(false)
    goNext()
  }

  function handleDislike() {
    if (animState !== "idle") return
    if (!isConnected) { setWalletModal(true); return }
    randomFly()
    setAnimState("dislike")
    setTimeout(goNext, 600)
  }

  function handlePlusOne() {
    if (animState !== "idle" || !current) return
    if (!isConnected) { setWalletModal(true); return }

    // Check USDC balance ($1.20 needed)
    if (usdcBalanceUsd < 1.2) {
      setTxStatus("insufficient")
      setTimeout(() => setTxStatus(""), 4000)
      return
    }

    setAnimState("plus")
    setTotalGiven(prev => prev + 1)
    setTxStatus("pending")

    // Trigger coin drop animation
    setShowCoinDrop(true)
    setTimeout(() => setShowCoinDrop(false), 5000)
    setDreams(prev => {
      const u = [...prev]
      if (u[currentIdx]) u[currentIdx] = { ...u[currentIdx], count: u[currentIdx].count + 1 }
      return u
    })

    // Contract call — approve then give
    const hasEnough = allowance != null && allowance >= GIVE_COST
    if (!hasEnough) {
      pendingGiveRef.current = current.address
      approve({
        address: usdcAddress, abi: ERC20_ABI, functionName: "approve",
        args: [plusOneAddress, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
        chainId,
      })
    } else {
      give({
        address: plusOneAddress, abi: PLUS_ONE_ABI, functionName: "give",
        args: [current.address as `0x${string}`], chainId,
      })
    }

    // Wait for coin to drop into merit box (4.5s) + 2s pause, then next
    setTimeout(goNext, 6500)
  }

  // Scroll / swipe to navigate
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (animState !== "idle") return
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (e.deltaY > 30) goNext()
        else if (e.deltaY < -30) goPrev()
      }, 50)
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    return () => window.removeEventListener("wheel", onWheel)
  }, [animState, goNext, goPrev])

  // Touch swipe
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      if (animState !== "idle") return
      const dy = touchStartY.current - e.changedTouches[0].clientY
      if (dy > 50) goNext()
      else if (dy < -50) goPrev()
    }
    window.addEventListener("touchstart", onTouchStart)
    window.addEventListener("touchend", onTouchEnd)
    return () => { window.removeEventListener("touchstart", onTouchStart); window.removeEventListener("touchend", onTouchEnd) }
  }, [animState, goNext, goPrev])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (animState !== "idle") return
      if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goNext() }
      else if (e.key === "ArrowUp") { e.preventDefault(); goPrev() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [animState, goNext, goPrev])

  if (dreams.length === 0) {
    return (
      <>
        <NightScene paused={false} skyOnly auroraColor="0,150,255" />
        <main className="relative z-10 min-h-screen flex items-center justify-center">
          <p style={{ fontFamily: "'Righteous', cursive", fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
            Loading dreams...
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <NightScene paused={false} skyOnly auroraColor={current?.color || "0,150,255"} />
      <WalletModal open={walletModal} onClose={() => setWalletModal(false)} />

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden discover-main">

        <Logo />

        {/* Top bar — counter + view toggle */}
        <div className="discover-topbar" style={{
          position: "fixed", top: "36px", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: "16px", zIndex: 10,
        }}>
          {/* Shuffle */}
          <span
            onClick={() => {
              setDreams(prev => {
                const s = [...prev]
                for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]] }
                return s
              })
              setCurrentIdx(0)
            }}
            style={{
              fontSize: "18px",
              color: "rgba(255,210,80,0.6)", cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              display: "inline-block",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(180deg) scale(1.2)"; e.currentTarget.style.color = "rgba(255,220,100,1)" }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "rotate(0deg) scale(1)"; e.currentTarget.style.color = "rgba(255,210,80,0.6)" }}
          >
            ↻
          </span>
          {/* View toggle */}
          <div style={{ display: "flex", gap: "2px" }}>
            <button
              onClick={() => setViewMode("swipe")}
              className={`discover-tab ${viewMode === "swipe" ? "discover-tab-active" : ""}`}
            >
              Explore
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`discover-tab ${viewMode === "list" ? "discover-tab-active" : ""}`}
            >
              Dreams
            </button>
            <button
              onClick={() => router.push("/about")}
              className="discover-tab"
            >
              About
            </button>
          </div>
        </div>

        {/* Dream Sprite — top right, links to personal page */}
        <div
          onClick={() => {
            if (isConnected && address) router.push(`/${address}`)
            else setWalletModal(true)
          }}
          style={{
            position: "fixed",
            top: "36px",
            right: "20px",
            cursor: "pointer",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            animation: "moon-float 5s ease-in-out infinite",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 12 12" style={{ imageRendering: "pixelated" }}>
            {/* Sparkle crown */}
            <rect x="3" y="0" width="1" height="1" fill="#ffee88" style={{ animation: "star-twinkle 1.5s ease-in-out infinite" }}/>
            <rect x="5" y="0" width="2" height="1" fill="#ffcc44"/>
            <rect x="8" y="0" width="1" height="1" fill="#ffee88" style={{ animation: "star-twinkle 1.5s 0.5s ease-in-out infinite" }}/>
            {/* Head */}
            <rect x="3" y="1" width="6" height="1" fill="#ffe8cc"/>
            <rect x="2" y="2" width="8" height="1" fill="#ffe8cc"/>
            {/* Eyes */}
            <rect x="3" y="2" width="2" height="1" fill="white"/>
            <rect x="7" y="2" width="2" height="1" fill="white"/>
            <rect x="4" y="2" width="1" height="1" fill="#2a1a40"/>
            <rect x="8" y="2" width="1" height="1" fill="#2a1a40"/>
            {/* Smile */}
            <rect x="2" y="3" width="8" height="1" fill="#ffe8cc"/>
            <rect x="5" y="3" width="2" height="1" fill="#e8a090"/>
            {/* Body — star robe */}
            <rect x="2" y="4" width="8" height="1" fill="#8b6ddb"/>
            <rect x="1" y="5" width="10" height="1" fill="#7b5dcc"/>
            <rect x="1" y="6" width="10" height="1" fill="#7b5dcc"/>
            <rect x="5" y="5" width="2" height="1" fill="#ffee88"/>
            {/* Wings */}
            <rect x="0" y="4" width="1" height="2" fill="rgba(200,180,255,0.5)"/>
            <rect x="11" y="4" width="1" height="2" fill="rgba(200,180,255,0.5)"/>
            {/* Lower robe */}
            <rect x="2" y="7" width="8" height="1" fill="#6a4db8"/>
            <rect x="3" y="8" width="6" height="1" fill="#6a4db8"/>
            {/* Trail sparkles */}
            <rect x="4" y="9" width="1" height="1" fill="#ffee88" opacity="0.4" style={{ animation: "star-twinkle 2s ease-in-out infinite" }}/>
            <rect x="7" y="9" width="1" height="1" fill="#c8b4ff" opacity="0.3" style={{ animation: "star-twinkle 2s 0.7s ease-in-out infinite" }}/>
          </svg>
          <span style={{
            fontFamily: "'Righteous', cursive",
            fontSize: "8px",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.04em",
          }}>
            {isConnected && address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "my page"}
          </span>
        </div>

        {/* ====== LIST VIEW ====== */}
        {viewMode === "list" && (
          <div className="discover-list">

            {/* ── Transfer Panel (Uniswap-style) ── */}
            <div style={{
              marginBottom: "20px",
              padding: "4px",
              borderRadius: "20px",
              background: "rgba(15,20,40,0.6)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* From: You send */}
              <div style={{
                padding: "14px 16px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
                marginBottom: "2px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "'Righteous', cursive", fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>You send</span>
                  <span style={{ fontFamily: "'Righteous', cursive", fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>
                    Balance: ${usdcBalanceUsd.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Righteous', cursive", fontSize: "24px", color: "rgba(255,255,255,0.9)" }}>1.20</span>
                  <select
                    value={sendChain}
                    onChange={e => setSendChain(Number(e.target.value))}
                    style={{
                      padding: "6px 12px", borderRadius: "16px",
                      border: "none",
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.85)", fontFamily: "'Righteous', cursive",
                      fontSize: "11px", outline: "none", cursor: "pointer",
                    }}
                  >
                    <option value={84532} style={{ background: "#1a1a2e" }}>USDC · Base Sepolia</option>
                    <option value={97} style={{ background: "#1a1a2e" }}>USDC · BSC Testnet</option>
                    <option value={8453} style={{ background: "#1a1a2e" }}>USDC · Base</option>
                    <option value={56} style={{ background: "#1a1a2e" }}>USDC · BNB Chain</option>
                  </select>
                </div>
              </div>

              {/* Arrow divider */}
              <div style={{ display: "flex", justifyContent: "center", margin: "-10px 0", position: "relative", zIndex: 2 }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "rgba(15,20,40,0.9)",
                  border: "3px solid rgba(15,20,40,0.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", color: "rgba(255,255,255,0.5)",
                }}>↓</div>
              </div>

              {/* To: Recipient */}
              <div style={{
                padding: "14px 16px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontFamily: "'Righteous', cursive", fontSize: "9px", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: "8px" }}>To</span>
                <input
                  type="text"
                  value={sendAddr}
                  onChange={e => setSendAddr(e.target.value.trim())}
                  placeholder="0x... wallet address"
                  style={{
                    width: "100%", padding: "0", border: "none",
                    background: "transparent",
                    color: sendAddr ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px", outline: "none",
                  }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={async () => {
                  if (!isConnected) { setWalletModal(true); return }
                  if (!sendAddr.match(/^0x[a-fA-F0-9]{40}$/)) {
                    setTxStatus("failed"); setTimeout(() => setTxStatus(""), 3000); return
                  }
                  if (usdcBalanceUsd < 1.2) {
                    setTxStatus("insufficient"); setTimeout(() => setTxStatus(""), 4000); return
                  }
                  if (currentChainId !== sendChain) {
                    setSendStatus("switching")
                    try { switchChain({ chainId: sendChain }) } catch { setSendStatus("failed"); return }
                  }
                  setSendStatus("sending")
                  const hasEnough = allowance != null && allowance >= GIVE_COST
                  if (!hasEnough) {
                    pendingGiveRef.current = sendAddr
                    approve({
                      address: usdcAddress, abi: ERC20_ABI, functionName: "approve",
                      args: [plusOneAddress, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
                      chainId: sendChain,
                    })
                  } else {
                    give({
                      address: plusOneAddress, abi: PLUS_ONE_ABI, functionName: "give",
                      args: [sendAddr as `0x${string}`], chainId: sendChain,
                    })
                  }
                  setTxStatus("pending")
                }}
                disabled={sendStatus === "sending" || sendStatus === "switching"}
                style={{
                  width: "100%", padding: "14px", marginTop: "4px",
                  borderRadius: "16px", border: "none",
                  background: !sendAddr ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, rgba(255,210,80,0.25), rgba(100,255,150,0.2))",
                  color: !sendAddr ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.9)",
                  fontFamily: "'Righteous', cursive", fontSize: "14px",
                  cursor: sendAddr ? "pointer" : "default",
                  transition: "all 0.2s",
                  letterSpacing: "0.04em",
                }}
              >
                {!isConnected ? "Connect Wallet" : sendStatus === "switching" ? "Switching Chain..." : sendStatus === "sending" ? "Sending +1..." : !sendAddr ? "Enter address" : "Send +1"}
              </button>

              {/* Fee info */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 4px 4px" }}>
                <span style={{ fontFamily: "'Righteous', cursive", fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>$1 → dreamer</span>
                <span style={{ fontFamily: "'Righteous', cursive", fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>$0.20 → Merit Pool</span>
              </div>
            </div>

            {/* Sort tabs */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", justifyContent: "center" }}>
              {(["Hot", "New", "Liked"] as const).map(tab => (
                <span key={tab} onClick={() => setSortMode(tab)} style={{
                  fontFamily: "'Righteous', cursive",
                  fontSize: "10px",
                  color: sortMode === tab ? "rgba(255,220,180,0.9)" : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  background: sortMode === tab ? "rgba(255,220,180,0.08)" : "transparent",
                  transition: "all 0.2s",
                }}>
                  {tab}
                </span>
              ))}
            </div>

            {/* Dream list — sorted by active tab */}
            {(() => {
              const liked: string[] = JSON.parse(localStorage.getItem("plusone_liked") || "[]")
              let sorted = [...dreams]
              if (sortMode === "Hot") {
                sorted.sort((a, b) => b.count - a.count)
              } else if (sortMode === "New") {
                sorted.reverse() // newest = last added = reverse order
              } else if (sortMode === "Liked") {
                sorted = sorted.filter(d => liked.includes(d.address))
              }
              return sorted.length === 0 ? (
                <p style={{ fontFamily: "'Righteous', cursive", fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "20px" }}>
                  {sortMode === "Liked" ? "No liked dreams yet. Explore and 💚 some!" : "No dreams found."}
                </p>
              ) : sorted.map((dream, i) => {
              const isLiked = liked.includes(dream.address)
              return (
                <div
                  key={`${dream.address}-${i}`}
                  className="discover-list-item"
                  onClick={() => {
                    // Jump to this dream in swipe view
                    const idx = dreams.findIndex(d => d.address === dream.address)
                    if (idx >= 0) {
                      setCurrentIdx(idx)
                      setViewMode("swipe")
                    }
                  }}
                >
                  {/* Color dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: `rgb(${dream.color})`,
                    boxShadow: `0 0 6px rgba(${dream.color}, 0.3)`,
                  }}/>

                  {/* Dream text */}
                  <p style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.75)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {dream.thought}
                  </p>

                  {/* Liked + Name — fixed layout */}
                  <span style={{
                    fontFamily: "'Righteous', cursive",
                    fontSize: "10px",
                    color: "rgba(255,220,180,0.6)",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    minWidth: "60px",
                    justifyContent: "flex-end",
                    gap: "3px",
                  }}>
                    {isLiked && <span style={{ fontSize: "9px" }}>💚</span>}
                    {dream.name || "Anon"}
                  </span>

                  {/* +1 count */}
                  <span style={{
                    fontFamily: "'Righteous', cursive",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    flexShrink: 0,
                    minWidth: "36px",
                    textAlign: "right",
                  }}>
                    +{dream.count}
                  </span>
                </div>
              )
            })})()}
          </div>
        )}

        {/* ====== SWIPE VIEW ====== */}
        {viewMode === "swipe" && <>
        {/* Full-screen card stack */}
        <div className="discover-viewport">

          {/* Current card */}
          {current && (
            <div
              className="discover-fullcard"
              style={{
                transform: animState === "up" || animState === "dislike"
                         ? `translate(${flyDir.x}%, ${flyDir.y}%) rotate(${flyDir.r}deg) scale(0.7)`
                         : animState === "down"    ? "translateY(110%) scale(0.9)"
                         : animState === "plus"    ? "scale(1.05)"
                         : animState === "like"    ? "scale(1.06)"
                         : "translateY(0) scale(1)",
                opacity: animState === "up" || animState === "down" || animState === "dislike" ? 0 : 1,
                filter: animState === "up" || animState === "down" || animState === "dislike"
                      ? "blur(14px)" : "blur(0)",
                transition: animState === "idle" ? "none" : "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {/* Giant quote — background decoration */}
              <span style={{
                fontFamily: "Georgia, serif",
                fontSize: "160px",
                color: `rgba(${current.color}, 0.06)`,
                position: "absolute",
                top: "-40px",
                left: "50%",
                transform: "translateX(-70%)",
                lineHeight: 1,
                userSelect: "none",
                pointerEvents: "none",
              }}>
                "
              </span>

              {/* Dream text — hero typography, colored by dream */}
              <p className="discover-dream-text" style={{
                fontFamily: "'Caveat', cursive",
                fontSize: "40px",
                fontWeight: 700,
                color: `rgb(${current.color})`,
                textAlign: "center",
                lineHeight: 1.3,
                maxWidth: "440px",
                position: "relative",
                textShadow: `0 0 40px rgba(${current.color}, 0.25), 0 0 80px rgba(${current.color}, 0.1)`,
              }}>
                {current.thought}
              </p>

              {/* Accent line — colored by dream */}
              <div style={{
                width: "48px",
                height: "2px",
                background: `linear-gradient(90deg, transparent, rgb(${current.color}), transparent)`,
                margin: "20px auto 16px",
                borderRadius: "1px",
              }}/>

              {/* Info strip */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                fontFamily: "'Righteous', cursive",
                fontSize: "9px",
              }}>
                <span
                  onClick={() => router.push(`/${current.address}`)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    cursor: "pointer", transition: "transform 0.25s ease, opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.3)"; e.currentTarget.style.opacity = "0.9" }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1" }}
                >
                  <PixelAvatar address={current.address} size={16} />
                  <span style={{ color: "rgba(255,220,180,0.8)" }}>
                    {current.name || "Anon"}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>
                    ...{current.address.slice(-4)}
                  </span>
                </span>
                <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                <span style={{ color: "rgba(100,255,150,0.6)" }}>
                  💚 {(() => {
                    const liked: string[] = JSON.parse(localStorage.getItem("plusone_liked") || "[]")
                    return liked.filter(a => a === current.address).length
                  })() || 0} liked
                </span>
                <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>
                  +{current.count} seen
                </span>
              </div>

              {/* Action buttons — below card */}
              <div className="discover-action-row" style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                marginTop: "48px",
              }}>
                {/* 💔 Dislike — skip to next */}
                <button
                  onClick={handleDislike}
                  disabled={animState !== "idle"}
                  className="discover-react-btn discover-dislike"
                  title="Not for me"
                >
                  💔
                </button>

                {/* +1 Give $1 USDC */}
                <button
                  onClick={handlePlusOne}
                  disabled={animState !== "idle"}
                  className="discover-give-btn"
                >
                  <span style={{ fontSize: "20px" }}>+1</span>
                  <span style={{ fontSize: "10px", opacity: 0.6 }}>$1 USDC</span>
                </button>

                {/* 💚 Like — save to favorites */}
                <button
                  onClick={handleLike}
                  disabled={animState !== "idle"}
                  className="discover-react-btn discover-like"
                  title="Love this dream"
                >
                  💚
                </button>
              </div>

              {/* Transfer prompt — after liking */}
              {showTransferPrompt && (
                <div style={{
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  animation: "bubble-in 0.25s ease-out",
                }}>
                  <p style={{
                    fontFamily: "'Righteous', cursive",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.7)",
                    letterSpacing: "0.04em",
                  }}>
                    Send +1 ($1 USDC) now?
                  </p>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={handleTransferYes} className="discover-prompt-btn discover-prompt-yes">
                      Yes, +1
                    </button>
                    <button onClick={handleTransferNo} className="discover-prompt-btn discover-prompt-no">
                      Maybe later
                    </button>
                  </div>
                </div>
              )}

              {/* 💚 Like burst */}
              {animState === "like" && (
                <div className="discover-burst">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="discover-burst-particle"
                      style={{
                        fontSize: "20px",
                        animationDelay: `${i * 0.06}s`,
                        transform: `rotate(${i * 72}deg) translateY(-50px)`,
                      }}
                    >
                      💚
                    </span>
                  ))}
                </div>
              )}

              {/* +1 burst */}
              {animState === "plus" && (
                <div className="discover-burst">
                  {[...Array(8)].map((_, i) => (
                    <span
                      key={i}
                      className="discover-burst-particle"
                      style={{
                        color: `rgb(${current.color})`,
                        textShadow: `0 0 12px rgba(${current.color}, 0.6)`,
                        animationDelay: `${i * 0.05}s`,
                        transform: `rotate(${i * 45}deg) translateY(-60px)`,
                      }}
                    >
                      +1
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        </>}

        {/* Merit Box + coin drop animation */}
        {/* 功德箱 — always visible at bottom center */}
        <div style={{
          position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          zIndex: 20, pointerEvents: "none",
        }}>
          <svg width="64" height="64" viewBox="0 0 12 12" style={{ imageRendering: "pixelated", display: "block" }}>
            {/* 功德箱 */}
            <rect x="1" y="2" width="10" height="1" fill="#8b3333"/>
            <rect x="2" y="1" width="8" height="1" fill="#aa4444"/>
            <rect x="4" y="1" width="4" height="1" fill="#3a1818"/>
            <rect x="1" y="3" width="10" height="6" fill="#cc4444"/>
            <rect x="2" y="3" width="8" height="1" fill="#dd5555"/>
            <rect x="1" y="5" width="10" height="1" fill="#ffcc33" opacity="0.4"/>
            <rect x="5" y="4" width="2" height="1" fill="#ffcc33" opacity="0.6"/>
            <rect x="4" y="6" width="4" height="1" fill="#ffcc33" opacity="0.5"/>
            <rect x="5" y="7" width="2" height="1" fill="#ffcc33" opacity="0.4"/>
            <rect x="0" y="9" width="12" height="1" fill="#8b3333"/>
            <rect x="1" y="10" width="10" height="1" fill="#6b2222"/>
          </svg>
          <span style={{
            fontFamily: "'Righteous', cursive", fontSize: "8px",
            color: "rgba(255,210,80,0.5)", marginTop: "2px",
          }}>
            Merit Pool
          </span>
        </div>

        {/* Coin dropping into merit box */}
        {showCoinDrop && (
          <div style={{
            position: "fixed", left: "50%", top: "62%", transform: "translateX(-50%)",
            pointerEvents: "none", zIndex: 51,
          }}>
            <div style={{ animation: "coin-drop-to-box 4.5s linear forwards", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{
                fontFamily: "'Righteous', cursive", fontSize: "10px", fontWeight: 700,
                color: "rgba(255,210,80,0.95)",
                textShadow: "0 0 10px rgba(255,200,60,0.5)",
                marginBottom: "4px",
              }}>
                $0.2
              </span>
              <svg width="16" height="16" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
                <rect x="2" y="0" width="4" height="1" fill="#ffdd44"/>
                <rect x="1" y="1" width="6" height="6" fill="#ffcc33"/>
                <rect x="2" y="7" width="4" height="1" fill="#ffdd44"/>
                <rect x="0" y="2" width="1" height="4" fill="#ffdd44"/>
                <rect x="7" y="2" width="1" height="4" fill="#ffdd44"/>
                <rect x="3" y="3" width="2" height="2" fill="#ffee88"/>
                <rect x="2" y="2" width="1" height="1" fill="#ffee88"/>
              </svg>
            </div>
          </div>
        )}

        {/* Transaction status toast */}
        {txStatus && (
          <div style={{
            position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
            padding: "10px 20px", borderRadius: "12px", zIndex: 100,
            fontFamily: "'Righteous', cursive", fontSize: "12px",
            letterSpacing: "0.04em",
            animation: "bubble-in 0.25s ease-out",
            background: txStatus === "success" ? "rgba(100,255,150,0.15)"
                      : txStatus === "failed" ? "rgba(255,100,100,0.15)"
                      : txStatus === "insufficient" ? "rgba(255,210,80,0.15)"
                      : "rgba(255,255,255,0.1)",
            border: `1px solid ${
              txStatus === "success" ? "rgba(100,255,150,0.3)"
              : txStatus === "failed" ? "rgba(255,100,100,0.3)"
              : txStatus === "insufficient" ? "rgba(255,210,80,0.3)"
              : "rgba(255,255,255,0.15)"
            }`,
            color: txStatus === "success" ? "rgba(100,255,150,0.9)"
                 : txStatus === "failed" ? "rgba(255,100,100,0.9)"
                 : txStatus === "insufficient" ? "rgba(255,210,80,0.9)"
                 : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
          }}>
            {txStatus === "pending" && "⏳ Transaction pending..."}
            {txStatus === "success" && "✅ +1 sent successfully!"}
            {txStatus === "failed" && "❌ Transaction failed. Try again."}
            {txStatus === "insufficient" && `💰 Not enough USDC. Need $1.20, have $${usdcBalanceUsd.toFixed(2)}`}
          </div>
        )}
      </main>
    </>
  )
}
