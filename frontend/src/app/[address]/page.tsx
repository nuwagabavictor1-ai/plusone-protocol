"use client"

import { use, useState, useEffect } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { PLUS_ONE_ABI, ERC20_ABI, GIVE_COST } from "@/lib/contracts"
import { useChainContracts } from "@/lib/useChainContracts"
import { useRouter } from "next/navigation"
import { NightScene } from "@/components/NightScene"
import { Logo } from "@/components/Logo"
import { useUsdcBalance } from "@/lib/useUsdcBalance"
import { WalletModal } from "@/components/WalletModal"
import { PixelAvatar, ALL_AVATARS } from "@/components/PixelAvatar"
import { useTransactionHistory } from "@/lib/useTransactionHistory"

interface Props { params: Promise<{ address: string }> }

export default function ProfilePage({ params }: Props) {
  const { address: pageAddress } = use(params)
  const profileAddress = pageAddress as `0x${string}`
  const { address: viewer, isConnected } = useAccount()
  const { chainId, plusOneAddress, usdcAddress } = useChainContracts()
  const { balanceUsd: usdcBalanceUsd } = useUsdcBalance(viewer)
  const { given: txGiven, received: txReceived } = useTransactionHistory(profileAddress)
  const [txMsg, setTxMsg] = useState("")
  const router = useRouter()
  const isOwn = viewer?.toLowerCase() === profileAddress.toLowerCase()
  const shortAddr = `${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}`

  const [walletModal, setWalletModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [editingDream, setEditingDream] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [dreamValue, setDreamValue] = useState("")
  const [likedDreams, setLikedDreams] = useState<string[]>([])

  useEffect(() => {
    const n = localStorage.getItem(`plusone_name_${profileAddress}`)
    if (n) setNameValue(n)
    const w = localStorage.getItem(`plusone_wish_${profileAddress}`)
    if (w) { try { setDreamValue(JSON.parse(w).text) } catch {} }
    setLikedDreams(JSON.parse(localStorage.getItem("plusone_liked") || "[]"))
    const savedAvatar = localStorage.getItem(`plusone_avatar_${profileAddress}`)
    if (savedAvatar) setSelectedAvatar(parseInt(savedAvatar, 10))
  }, [profileAddress])

  const { data: profile, refetch } = useReadContract({
    address: plusOneAddress, abi: PLUS_ONE_ABI, functionName: "getProfile",
    args: [profileAddress], chainId,
  })
  const { data: allowance } = useReadContract({
    address: usdcAddress, abi: ERC20_ABI, functionName: "allowance",
    args: viewer ? [viewer, plusOneAddress] : undefined,
    chainId, query: { enabled: !!viewer },
  })
  const { writeContract: approve } = useWriteContract()
  const { writeContract: give } = useWriteContract()
  const { writeContract: withdraw, data: withdrawTxHash } = useWriteContract()
  const { isLoading: isWithdrawing, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash })
  if (withdrawSuccess) refetch()

  const balanceUsd = profile?.balance ? (Number(profile.balance) / 1_000_000).toFixed(2) : "0.00"
  const count = profile?.totalReceived ? profile.totalReceived.toString() : "0"
  const thought = dreamValue || ""
  const colorIdx = parseInt(profileAddress.slice(-2), 16) % 7
  const themeColor = ["255,148,72", "255,218,55", "75,205,118", "168,120,255", "78,162,255", "95,228,182", "255,168,210"][colorIdx]

  function handleGive(addr: string) {
    if (!isConnected) { setWalletModal(true); return }
    if (usdcBalanceUsd < 1.2) {
      setTxMsg(`Not enough USDC. Need $1.20, have $${usdcBalanceUsd.toFixed(2)}`)
      setTimeout(() => setTxMsg(""), 4000)
      return
    }
    const ok = allowance != null && allowance >= GIVE_COST
    if (!ok) {
      approve({ address: usdcAddress, abi: ERC20_ABI, functionName: "approve",
        args: [plusOneAddress, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")], chainId })
    } else {
      give({ address: plusOneAddress, abi: PLUS_ONE_ABI, functionName: "give",
        args: [addr as `0x${string}`], chainId })
    }
  }
  function handleWithdraw() {
    withdraw({ address: plusOneAddress, abi: PLUS_ONE_ABI, functionName: "withdraw", chainId })
  }
  function handleShare() { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  function saveName(v: string) { localStorage.setItem(`plusone_name_${profileAddress}`, v.trim()); setEditingName(false) }
  function saveDream(v: string) {
    const e = localStorage.getItem(`plusone_wish_${profileAddress}`)
    const d = e ? JSON.parse(e) : { color: themeColor, createdAt: Date.now() }
    localStorage.setItem(`plusone_wish_${profileAddress}`, JSON.stringify({ ...d, text: v.trim() })); setEditingDream(false)
  }

  const likedItems = likedDreams.map(addr => {
    const w = localStorage.getItem(`plusone_wish_${addr}`)
    const n = localStorage.getItem(`plusone_name_${addr}`) || ""
    if (w) { try { const d = JSON.parse(w); return { address: addr, thought: d.text, name: n, color: d.color || "255,255,255" } } catch {} }
    return { address: addr, thought: "...", name: "", color: "255,255,255" }
  })

  const S = { // shared inline styles
    label: { fontFamily: "'Righteous', cursive", fontSize: "8px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" } as const,
    val: { fontFamily: "'Righteous', cursive", letterSpacing: "0.04em" } as const,
  }

  return (
    <>
      <NightScene paused={false} skyOnly auroraColor={themeColor} />
      <WalletModal open={walletModal} onClose={() => setWalletModal(false)} />

      <main className="relative z-10 min-h-screen px-4 py-16">
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>

          {/* Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
            <Logo />
            <button onClick={handleShare} style={{
              fontFamily: "'Righteous', cursive", fontSize: "10px", color: "rgba(255,255,255,0.3)",
              background: "none", border: "none", cursor: "pointer",
            }}>{copied ? "Copied!" : "Share ↗"}</button>
          </div>

          {/* ── Header: Avatar + Name/Address + Dream + Count ── */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            {/* Avatar — clickable for owner to change */}
            <div
              style={{ display: "flex", justifyContent: "center", marginBottom: "12px", cursor: isOwn ? "pointer" : "default" }}
              onClick={() => { if (isOwn) setShowAvatarPicker(v => !v) }}
            >
              <PixelAvatar address={profileAddress} avatarId={selectedAvatar ?? undefined} size={42} />
            </div>

            {/* Avatar picker — grid of 77 */}
            {showAvatarPicker && isOwn && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center",
                maxWidth: "320px", margin: "0 auto 16px", padding: "12px",
                background: "rgba(255,255,255,0.03)", borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.06)", maxHeight: "180px", overflowY: "auto",
              }}>
                {ALL_AVATARS.map(a => (
                  <div
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAvatar(a.id)
                      localStorage.setItem(`plusone_avatar_${profileAddress}`, String(a.id))
                      setShowAvatarPicker(false)
                    }}
                    style={{
                      cursor: "pointer", borderRadius: "6px", padding: "2px",
                      border: selectedAvatar === a.id ? "1px solid rgba(255,220,180,0.5)" : "1px solid transparent",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <PixelAvatar avatarId={a.id} size={28} />
                  </div>
                ))}
              </div>
            )}

            {/* Name + Address — inline */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {isOwn && editingName ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input value={nameValue} onChange={(e) => setNameValue(e.target.value.replace(/[^a-zA-Z0-9_\-\.!@#\$%\^&\*\(\)\s]/g, "").slice(0, 20))}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(nameValue); if (e.key === "Escape") setEditingName(false) }}
                    autoFocus placeholder="Your name" maxLength={20} className="profile-input" style={{ width: "120px", fontSize: "14px" }}/>
                  <button onClick={() => saveName(nameValue)} className="profile-save-btn">✓</button>
                  <button onClick={() => setEditingName(false)} className="profile-cancel-btn">✕</button>
                </div>
              ) : (
                <>
                  {nameValue && (
                    <span style={{
                      fontFamily: "'Righteous', cursive", fontSize: "16px",
                      color: "rgba(255,220,180,0.9)", letterSpacing: "0.06em",
                    }}>
                      {nameValue}
                    </span>
                  )}
                  {!nameValue && isOwn && (
                    <span style={{
                      fontFamily: "'Righteous', cursive", fontSize: "11px",
                      color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em",
                    }}>
                      No name
                    </span>
                  )}
                  {isOwn && (
                    <span onClick={() => setEditingName(true)} style={{
                      fontSize: "10px", color: "rgba(255,255,255,0.25)", cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,220,180,0.7)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)" }}
                    >✎</span>
                  )}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>{shortAddr}</span>
                </>
              )}
            </div>

            {/* Dream */}
            <div style={{ marginTop: "20px", position: "relative" }}>
              {isOwn && editingDream ? (
                <div>
                  <textarea value={dreamValue} onChange={(e) => setDreamValue(e.target.value.replace(/[^a-zA-Z0-9_\-\.!@#\$%\^&\*\(\)\s,;:'"?\/]/g, "").slice(0, 200))}
                    onKeyDown={(e) => { if (e.key === "Escape") setEditingDream(false) }}
                    autoFocus maxLength={200} rows={2} className="profile-textarea"/>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                    <button onClick={() => setEditingDream(false)} className="profile-cancel-btn">Cancel</button>
                    <button onClick={() => saveDream(dreamValue)} className="profile-save-btn">Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "8px" }}>
                  <p style={{
                    fontFamily: "'Caveat', cursive", fontSize: "24px", fontWeight: 700,
                    color: `rgb(${themeColor})`, lineHeight: 1.35,
                    textShadow: `0 0 30px rgba(${themeColor}, 0.2)`,
                    minHeight: "32px", textAlign: "center",
                  }}>{thought || (isOwn ? "Write your dream" : "...")}</p>
                  {isOwn && (
                    <span onClick={() => setEditingDream(true)} style={{
                      fontSize: "12px", color: "rgba(255,255,255,0.25)", cursor: "pointer",
                      marginTop: "6px", flexShrink: 0, transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,220,180,0.7)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)" }}
                    >✎</span>
                  )}
                </div>
              )}
            </div>

            {/* Accent + Count — inline */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
              <div style={{ width: "24px", height: "1px", background: `rgba(${themeColor}, 0.3)` }}/>
              <span style={{ ...S.val, fontSize: "20px", color: "white" }}>+{count}</span>
              <div style={{ width: "24px", height: "1px", background: `rgba(${themeColor}, 0.3)` }}/>
            </div>
            <p style={{ ...S.label, marginTop: "4px", textAlign: "center" }}>seen you</p>

            {/* +1 visitor button */}
            {!isOwn && (
              <button onClick={() => handleGive(profileAddress)} className="discover-give-btn" style={{ margin: "16px auto 0", display: "flex" }}>
                <span style={{ fontSize: "16px" }}>+1</span>
                <span style={{ fontSize: "9px", opacity: 0.6 }}>$1 USDC</span>
              </button>
            )}
          </div>

          {/* ── Stats row ── */}
          <div style={{
            display: "flex", justifyContent: "space-around", padding: "14px 0",
            borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)",
            marginBottom: "28px",
          }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ ...S.val, fontSize: "14px", color: "rgba(255,140,140,0.8)" }}>{profile?.totalGiven?.toString() || txGiven.length}</p>
              <p style={S.label}>given</p>
            </div>
            <div style={{ width: "1px", background: "rgba(255,255,255,0.05)" }}/>
            <div style={{ textAlign: "center" }}>
              <p style={{ ...S.val, fontSize: "14px", color: "rgba(100,255,150,0.8)" }}>{count}</p>
              <p style={S.label}>received</p>
            </div>
            <div style={{ width: "1px", background: "rgba(255,255,255,0.05)" }}/>
            <div style={{ textAlign: "center" }}>
              <p style={{ ...S.val, fontSize: "14px", color: "rgba(255,220,180,0.8)" }}>{txGiven.length + txReceived.length}</p>
              <p style={S.label}>txns</p>
            </div>
            {isOwn && <>
              <div style={{ width: "1px", background: "rgba(255,255,255,0.05)" }}/>
              <div style={{ textAlign: "center" }}>
                <p style={{ ...S.val, fontSize: "14px", color: "rgba(255,220,180,0.9)" }}>${balanceUsd}</p>
                <p style={S.label}>balance</p>
              </div>
            </>}
          </div>

          {/* ── Liked Dreams ── */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 className="profile-section-title" style={{ marginBottom: 0 }}>💚 Liked Dreams</h2>
              <span className="profile-view-all">view all</span>
            </div>
            {likedItems.length === 0 ? (
              <p className="profile-empty">
                <span onClick={() => router.push("/discover")} style={{ color: "rgba(255,220,180,0.6)", cursor: "pointer" }}>Discover dreams →</span>
              </p>
            ) : (
              <div className="profile-list">
                {likedItems.slice(0, 4).map((item, i) => (
                  <div key={i} className="profile-list-item" style={{ padding: "8px 10px" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", flexShrink: 0, background: `rgb(${item.color})` }}/>
                    <p style={{ fontFamily: "'Caveat', cursive", fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.6)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.thought}
                    </p>
                    <span style={{ fontFamily: "'Righteous', cursive", fontSize: "8px", color: "rgba(255,220,180,0.4)", flexShrink: 0 }}>
                      {item.name || `...${item.address.slice(-4)}`}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleGive(item.address) }} className="profile-inline-give">+1</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Given + Received — compact ── */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            {/* Given */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h2 className="profile-section-title" style={{ marginBottom: 0 }}>↑ Given</h2>
                <span className="profile-view-all">view all</span>
              </div>
              <div className="profile-list">
                {txGiven.length === 0 && (
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", padding: "5px 8px", fontFamily: "'Righteous', cursive" }}>No +1s given yet</p>
                )}
                {txGiven.slice(0, 3).map((tx, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", fontFamily: "'Righteous', cursive" }}>
                    <span style={{ fontSize: "9px", color: "rgba(255,140,140,0.65)" }}>−$1.20</span>
                    <span style={{ fontSize: "9px", color: "rgba(255,220,180,0.5)", flex: 1 }}>→ {tx.counterparty.slice(0,6)}...{tx.counterparty.slice(-4)}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "7px", color: "rgba(255,255,255,0.15)" }}>#{tx.blockNumber.toString()}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: "1px", background: "rgba(255,255,255,0.04)" }}/>
            {/* Received */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h2 className="profile-section-title" style={{ marginBottom: 0 }}>↓ Received</h2>
                <span className="profile-view-all">view all</span>
              </div>
              <div className="profile-list">
                {txReceived.length === 0 && (
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", padding: "5px 8px", fontFamily: "'Righteous', cursive" }}>No +1s received yet</p>
                )}
                {txReceived.slice(0, 3).map((tx, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", fontFamily: "'Righteous', cursive" }}>
                    <span style={{ fontSize: "9px", color: "rgba(100,255,150,0.65)" }}>+$1</span>
                    <span style={{ fontSize: "9px", color: "rgba(255,220,180,0.5)", flex: 1 }}>← {tx.counterparty.slice(0,6)}...{tx.counterparty.slice(-4)}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "7px", color: "rgba(255,255,255,0.15)" }}>#{tx.blockNumber.toString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Withdraw */}
          {isOwn && profile && profile.balance > 0n && (
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <button onClick={handleWithdraw} disabled={isWithdrawing} className="profile-withdraw-btn">
                {isWithdrawing ? "Withdrawing..." : `Withdraw $${balanceUsd}`}
              </button>
            </div>
          )}


        </div>
      </main>
    </>
  )
}
