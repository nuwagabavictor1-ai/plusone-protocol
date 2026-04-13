"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { useReadContract } from "wagmi"
import { PLUS_ONE_ABI } from "@/lib/contracts"
import { useChainContracts } from "@/lib/useChainContracts"
import { NightScene } from "@/components/NightScene"
import { WalletModal } from "@/components/WalletModal"
import { Logo } from "@/components/Logo"
import { SpaceRing } from "@/components/SpaceRing"

export default function HomePage() {
  const router   = useRouter()
  const { address, isConnected } = useAccount()
  const { chainId, plusOneAddress } = useChainContracts()
  const [animOn, setAnimOn] = useState(true)
  const [walletModal, setWalletModal] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const { data: userCount } = useReadContract({
    address: plusOneAddress,
    abi:     PLUS_ONE_ABI,
    functionName: "getUserCount",
    chainId,
  })

  function handleImIn() {
    router.push("/discover")
  }

  // Möbius strip — Canvas 3D surface + gold coins
  const MobiusCoinTrack = useCallback(() => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const W = 280, H = 150
      canvas.width = W * 2
      canvas.height = H * 2
      ctx.scale(2, 2)

      let rotation = 0
      let animId: number
      let coinPhase = 0
      const coinSpeeds = [0.003, 0.0035, 0.004, 0.0028, 0.0032, 0.0038] // different speeds

      const draw = () => {
        ctx.clearRect(0, 0, W, H)
        rotation += 0.003
        coinPhase += 0.008

        const cx = W / 2, cy = H / 2
        const R = 56, halfW = 16
        const steps = 90
        const tiltX = 0.82

        const getPoint = (t: number, s: number) => {
          const twist = t / 2
          const cosT = Math.cos(t + rotation)
          const sinT = Math.sin(t + rotation)
          const cosTw = Math.cos(twist)
          const sinTw = Math.sin(twist)
          const x3d = (R + s * cosTw) * cosT
          const y3d = (R + s * cosTw) * sinT
          const z3d = s * sinTw
          return {
            px: cx + x3d,
            py: cy + y3d * tiltX + z3d * 0.5,
            depth: y3d * (1 - tiltX) + z3d,
          }
        }

        // Collect quads
        const quads: { depth: number; pts: [number,number][]; t: number }[] = []
        for (let i = 0; i < steps; i++) {
          const t0 = (i / steps) * Math.PI * 2
          const t1 = ((i + 1) / steps) * Math.PI * 2
          const p0a = getPoint(t0, -halfW), p0b = getPoint(t0, halfW)
          const p1a = getPoint(t1, -halfW), p1b = getPoint(t1, halfW)
          quads.push({
            depth: (p0a.depth + p0b.depth + p1a.depth + p1b.depth) / 4,
            pts: [[p0a.px, p0a.py], [p1a.px, p1a.py], [p1b.px, p1b.py], [p0b.px, p0b.py]],
            t: t0,
          })
        }

        // Collect coins as items to sort with quads
        const coinItems: { depth: number; x: number; y: number; size: number }[] = []
        for (let ci = 0; ci < coinSpeeds.length; ci++) {
          const cp = (ci / coinSpeeds.length) + coinPhase * coinSpeeds[ci] * 50
          const t = (cp % 1) * Math.PI * 2
          const p = getPoint(t, 0)
          coinItems.push({ depth: p.depth, x: p.px, y: p.py, size: 4 })
        }

        // Sort everything by depth
        const allItems: ({ type: "quad"; data: typeof quads[0] } | { type: "coin"; data: typeof coinItems[0] })[] = [
          ...quads.map(q => ({ type: "quad" as const, data: q })),
          ...coinItems.map(c => ({ type: "coin" as const, data: c })),
        ]
        allItems.sort((a, b) => a.data.depth - b.data.depth)

        for (const item of allItems) {
          if (item.type === "quad") {
            const q = item.data as typeof quads[0]
            const t = q.t + rotation
            const norm = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
            // Green → teal → emerald (matching homepage aurora)
            const hue = 130 + Math.sin(norm) * 30
            const sat = 60 + Math.sin(norm * 2) * 15
            const light = 35 + (q.depth / 20) * 16

            ctx.beginPath()
            ctx.moveTo(q.pts[0][0], q.pts[0][1])
            ctx.lineTo(q.pts[1][0], q.pts[1][1])
            ctx.lineTo(q.pts[2][0], q.pts[2][1])
            ctx.lineTo(q.pts[3][0], q.pts[3][1])
            ctx.closePath()
            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.7)`
            ctx.fill()
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light + 10}%, 0.2)`
            ctx.lineWidth = 0.3
            ctx.stroke()
          } else {
            // Gold coin
            const c = item.data as typeof coinItems[0]
            ctx.beginPath()
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
            ctx.fillStyle = "rgba(255,220,80,0.85)"
            ctx.fill()
            ctx.strokeStyle = "rgba(255,240,150,0.6)"
            ctx.lineWidth = 0.8
            ctx.stroke()
            // Coin glow
            ctx.beginPath()
            ctx.arc(c.x, c.y, c.size + 3, 0, Math.PI * 2)
            ctx.fillStyle = "rgba(255,220,80,0.15)"
            ctx.fill()
            // $ on coin
            ctx.fillStyle = "rgba(180,140,40,0.7)"
            ctx.font = "bold 5px monospace"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText("$", c.x, c.y + 0.5)
          }
        }

        animId = requestAnimationFrame(draw)
      }

      draw()
      return () => cancelAnimationFrame(animId)
    }, [])

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
        <div style={{ position: "relative" }}>
          <canvas ref={canvasRef} style={{ width: "280px", height: "150px", display: "block" }}/>
        </div>
      </div>
    )
  }, [])

  return (
    <>
      <NightScene paused={!animOn} excludeRef={contentRef} onConnectWallet={() => setWalletModal(true)} walletModalOpen={walletModal} auroraColor="0,255,100" auroraPreset="home" />
      <SpaceRing />
      <WalletModal open={walletModal} onClose={() => setWalletModal(false)} />

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 home-main pointer-events-none">
        <Logo />


        <div ref={contentRef} className="text-center space-y-8">

          {/* Core mark — pixel-styled +1 with gold gradient */}
          <div
            className="flex items-end justify-center gap-4 select-none"
            style={{ animation: "title-glow 4s ease-in-out infinite" }}
          >
            <span className="home-title" style={{
              fontFamily: "'Righteous', cursive",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              background: "linear-gradient(180deg, #ffffff 0%, #ffe8cc 40%, #ffdd88 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(255,210,80,0.2))",
            }}>+1</span>
            <div className="flex gap-0.5 pb-3" style={{ position: "relative" }}>
              {"USDC".split("").map((c, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    fontFamily: "'Righteous', cursive",
                    animation: `usdc-bounce 0.78s ${i * 0.12}s ease-in-out infinite`,
                    fontSize: "22px",
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    background: `linear-gradient(135deg, ${
                      ["#ffee88,#ffcc33", "#ff9ed2,#dd77bb", "#88ddff,#55bbee", "#ffbb66,#ff9944"][i]
                    })`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 8px rgba(255,210,80,0.15))",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* "what if" — gradient text, each line different hue */}
          <div className="select-none" style={{ maxWidth: "340px", textAlign: "center" }}>
            <p style={{
              fontFamily:    "'Caveat', cursive",
              fontSize:      "1.7rem",
              fontWeight:    700,
              background:    "linear-gradient(135deg, rgba(220,200,255,0.95) 0%, rgba(170,230,255,1) 50%, rgba(200,255,230,0.95) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              lineHeight:    1.5,
              letterSpacing: "0.02em",
              paddingBottom: "6px",
            }}>
              what if everyone give you 1 usdc?
            </p>
            <p style={{
              fontFamily:    "'Caveat', cursive",
              fontSize:      "1.9rem",
              fontWeight:    700,
              background:    "linear-gradient(135deg, rgba(255,220,190,1) 0%, rgba(255,200,240,1) 50%, rgba(220,200,255,1) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              lineHeight:    1.5,
              letterSpacing: "0.02em",
              paddingBottom: "6px",
            }}>
              what would you do?
            </p>
          </div>

          {/* Stats */}
          {userCount != null && userCount > 0n && (
            <p className="text-xs text-neutral-600">
              {userCount.toString()} people in
            </p>
          )}

          {/* "I'm in." — Pixel door CTA */}
          <div className="flex flex-col gap-4 items-center pt-4">
            <div
              onClick={handleImIn}
              className="pixel-door pointer-events-auto"
            >
              <svg width="54" height="75" viewBox="0 0 18 25" style={{ imageRendering: "pixelated", display: "block" }}>
                <defs>
                  <linearGradient id="doorWood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c49a6c"/>
                    <stop offset="100%" stopColor="#8a6240"/>
                  </linearGradient>
                  <linearGradient id="innerLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff8e8" stopOpacity="0.9"/>
                    <stop offset="50%" stopColor="#ffe4b5" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#ffd090" stopOpacity="0.3"/>
                  </linearGradient>
                </defs>

                {/* === Arch frame — warm sandstone === */}
                {/* Arch top — stepped curve */}
                <rect x="5" y="0" width="8" height="1" fill="#d4b896"/>
                <rect x="3" y="1" width="12" height="1" fill="#d4b896"/>
                <rect x="2" y="2" width="14" height="1" fill="#c4a886"/>
                <rect x="1" y="3" width="16" height="1" fill="#c4a886"/>
                <rect x="0" y="4" width="18" height="1" fill="#b89878"/>
                {/* Pillars */}
                <rect x="0" y="5" width="2" height="18" fill="#b89878"/>
                <rect x="16" y="5" width="2" height="18" fill="#b89878"/>
                {/* Inner pillar highlight */}
                <rect x="2" y="5" width="1" height="18" fill="#c4a886" opacity="0.6"/>
                <rect x="15" y="5" width="1" height="18" fill="#c4a886" opacity="0.6"/>
                {/* Arch keystone accent */}
                <rect x="8" y="0" width="2" height="1" fill="#e0c8a0"/>

                {/* === Door — rich warm wood with grain === */}
                <rect className="door-panel" x="3" y="4" width="12" height="19" fill="url(#doorWood)"/>
                {/* Grain lines */}
                <rect className="door-panel" x="4" y="7" width="10" height="1" fill="#b08050" opacity="0.25"/>
                <rect className="door-panel" x="4" y="13" width="10" height="1" fill="#b08050" opacity="0.2"/>
                <rect className="door-panel" x="4" y="18" width="10" height="1" fill="#b08050" opacity="0.25"/>
                {/* Upper panel — recessed */}
                <rect className="door-panel" x="5" y="6" width="8" height="4" fill="#a07848" opacity="0.5"/>
                {/* Lower panel — recessed */}
                <rect className="door-panel" x="5" y="14" width="8" height="5" fill="#a07848" opacity="0.5"/>
                {/* Panel edge highlight — top of each panel */}
                <rect className="door-panel" x="5" y="6" width="8" height="1" fill="#d4b080" opacity="0.3"/>
                <rect className="door-panel" x="5" y="14" width="8" height="1" fill="#d4b080" opacity="0.3"/>

                {/* Doorknob — polished brass */}
                <rect className="door-panel" x="12" y="12" width="2" height="2" fill="#e8c860"/>
                <rect className="door-panel" x="12" y="12" width="1" height="1" fill="#fff0a0"/>
                {/* Keyhole */}
                <rect className="door-panel" x="12" y="15" width="1" height="2" fill="#3a2818"/>

                {/* === Hover lights — warm golden glow from inside === */}
                <rect className="door-light" x="3" y="4" width="1" height="19" fill="url(#innerLight)" opacity="0"/>
                <rect className="door-light" x="14" y="4" width="1" height="19" fill="url(#innerLight)" opacity="0"/>
                <rect className="door-light" x="3" y="4" width="12" height="1" fill="url(#innerLight)" opacity="0"/>
                <rect className="door-glow" x="9" y="4" width="6" height="19" fill="url(#innerLight)" opacity="0"/>

                {/* Step */}
                <rect x="1" y="23" width="16" height="2" fill="#a08868"/>
                <rect x="0" y="23" width="18" height="1" fill="#b89878"/>
              </svg>

              {/* Label */}
              <span className="door-label">I'm in.</span>
            </div>


            {isConnected && address && (
              <span
                onClick={() => router.push(`/${address}`)}
                className="door-label pointer-events-auto"
                style={{ opacity: 0.4, cursor: "pointer" }}
              >
                check in
              </span>
            )}
          </div>

          {/* ── Bottom: Möbius + Gods + Pools ── */}
            {/* Bottom section — clean layout */}
            <div className="home-bottom-section" style={{ position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%) scale(0.67)", transformOrigin: "center bottom", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 15, pointerEvents: "auto" }}>

              {/* Merit Box + Dream Bowl */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "60px", marginTop: "8px" }}>

                {/* LEFT: Merit Pool 功德箱 */}
                <div onClick={() => router.push("/pool")} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "transform 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)" }}
                >
                  <svg width="72" height="72" viewBox="0 0 12 12" style={{ imageRendering: "pixelated", display: "block" }}>
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
                    <rect x="5" y="0" width="2" height="1" fill="#ffdd44" style={{ animation: "star-twinkle 2s ease-in-out infinite" }}/>
                  </svg>
                  <span style={{ fontFamily: "'Righteous', cursive", fontSize: "11px", fontWeight: 700, color: "rgba(255,210,80,0.85)", textAlign: "center", marginTop: "4px", textShadow: "0 0 6px rgba(255,200,60,0.2)" }}>
                    Merit Pool<br/><span style={{ fontSize: "16px" }}>$63</span>
                  </span>
                </div>

                {/* RIGHT: Dream Fund 聚宝盆 */}
                <div onClick={() => router.push("/pool")} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "transform 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)" }}
                >
                  <svg width="72" height="72" viewBox="0 0 12 12" style={{ imageRendering: "pixelated", display: "block" }}>
                    <rect x="1" y="4" width="10" height="1" fill="#ddaa33"/>
                    <rect x="0" y="5" width="12" height="1" fill="#ccaa33"/>
                    <rect x="1" y="6" width="10" height="2" fill="#ddaa33"/>
                    <rect x="2" y="8" width="8" height="2" fill="#ccaa33"/>
                    <rect x="3" y="10" width="6" height="1" fill="#bb9922"/>
                    <rect x="2" y="4" width="8" height="1" fill="#886600"/>
                    <rect x="3" y="5" width="6" height="1" fill="#775500"/>
                    <rect x="3" y="3" width="2" height="1" fill="#ffdd44"/>
                    <rect x="5" y="2" width="2" height="2" fill="#ffee66"/>
                    <rect x="7" y="3" width="2" height="1" fill="#ffdd44"/>
                    <rect x="5" y="2" width="1" height="1" fill="#ffff99"/>
                    <rect x="4" y="1" width="1" height="1" fill="#ffcc33" style={{ animation: "star-twinkle 1.8s ease-in-out infinite" }}/>
                    <rect x="7" y="1" width="1" height="1" fill="#ffdd44" style={{ animation: "star-twinkle 2.2s 0.5s ease-in-out infinite" }}/>
                    <rect x="6" y="0" width="1" height="1" fill="#ffee88" style={{ animation: "star-twinkle 1.5s 1s ease-in-out infinite" }}/>
                    <rect x="4" y="11" width="4" height="1" fill="#aa8822"/>
                  </svg>
                  <span style={{ fontFamily: "'Righteous', cursive", fontSize: "11px", fontWeight: 700, color: "rgba(100,255,150,0.85)", textAlign: "center", marginTop: "4px", textShadow: "0 0 6px rgba(100,255,150,0.2)" }}>
                    Dream Fund<br/><span style={{ fontSize: "16px" }}>$127</span>
                  </span>
                </div>
              </div>

              {/* Row 3: Three Gods — decorative, centered below */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginTop: "6px" }}>

                {/* ═══ LEFT: Chinese Caishen 财神 ═══ */}
                <svg width="56" height="80" viewBox="0 0 14 20" style={{ imageRendering: "pixelated", display: "block" }}>
                  {/* Hat wings 帽翅 */}
                  <rect x="0" y="2" width="2" height="1" fill="#cc3333"/>
                  <rect x="12" y="2" width="2" height="1" fill="#cc3333"/>
                  {/* Hat body */}
                  <rect x="3" y="0" width="8" height="1" fill="#222"/>
                  <rect x="2" y="1" width="10" height="1" fill="#cc3333"/>
                  <rect x="2" y="2" width="10" height="1" fill="#cc3333"/>
                  {/* Hat gold ornament */}
                  <rect x="6" y="0" width="2" height="1" fill="#ffcc33"/>
                  <rect x="5" y="1" width="4" height="1" fill="#ffcc33"/>
                  {/* Face */}
                  <rect x="3" y="3" width="8" height="4" fill="#f8d8b8"/>
                  {/* Eyes — crescent smile */}
                  <rect x="4" y="4" width="2" height="1" fill="#3a2510"/>
                  <rect x="8" y="4" width="2" height="1" fill="#3a2510"/>
                  {/* Cheeks */}
                  <rect x="3" y="5" width="1" height="1" fill="#ffaaaa" opacity="0.5"/>
                  <rect x="10" y="5" width="1" height="1" fill="#ffaaaa" opacity="0.5"/>
                  {/* Smile */}
                  <rect x="5" y="6" width="4" height="1" fill="#d88878"/>
                  {/* Beard — white/grey */}
                  <rect x="4" y="7" width="2" height="2" fill="#cccccc"/>
                  <rect x="8" y="7" width="2" height="2" fill="#cccccc"/>
                  <rect x="5" y="9" width="1" height="2" fill="#bbbbbb"/>
                  <rect x="8" y="9" width="1" height="2" fill="#bbbbbb"/>
                  {/* Red robe */}
                  <rect x="2" y="7" width="10" height="2" fill="#cc3333"/>
                  <rect x="1" y="9" width="12" height="6" fill="#cc3333"/>
                  {/* Gold belt */}
                  <rect x="2" y="10" width="10" height="1" fill="#ffcc33"/>
                  {/* Gold collar */}
                  <rect x="4" y="7" width="6" height="1" fill="#ffcc33"/>
                  {/* Robe center line */}
                  <rect x="6" y="11" width="2" height="4" fill="#ee4444"/>
                  {/* Dragon pattern */}
                  <rect x="4" y="12" width="1" height="1" fill="#ffcc33" opacity="0.5"/>
                  <rect x="9" y="13" width="1" height="1" fill="#ffcc33" opacity="0.5"/>
                  {/* Right arm + Yuanbao 元宝 */}
                  <rect x="12" y="9" width="1" height="2" fill="#f8d8b8"/>
                  <rect x="12" y="8" width="2" height="1" fill="#ffcc33"/>
                  <rect x="11" y="7" width="3" height="1" fill="#ffdd44"/>
                  {/* Left arm reaching */}
                  <rect x="0" y="9" width="2" height="2" fill="#f8d8b8"/>
                  {/* Feet */}
                  <rect x="3" y="15" width="3" height="1" fill="#222"/>
                  <rect x="8" y="15" width="3" height="1" fill="#222"/>
                  {/* Boots */}
                  <rect x="2" y="16" width="4" height="1" fill="#333"/>
                  <rect x="8" y="16" width="4" height="1" fill="#333"/>
                </svg>

                {/* ═══ CENTER: Ganesha 象头神 — larger ═══ */}
                <svg width="72" height="96" viewBox="0 0 18 24" style={{ imageRendering: "pixelated", display: "block" }}>
                  {/* Crown — gold tiered */}
                  <rect x="6" y="0" width="6" height="1" fill="#ffcc33"/>
                  <rect x="5" y="1" width="8" height="1" fill="#ffcc33"/>
                  <rect x="8" y="0" width="2" height="1" fill="#ff6666"/>
                  {/* Elephant head — grey/tan */}
                  <rect x="4" y="2" width="10" height="5" fill="#c8b8a0"/>
                  <rect x="3" y="3" width="12" height="4" fill="#c8b8a0"/>
                  {/* Big ears — flared */}
                  <rect x="1" y="2" width="3" height="4" fill="#c8b8a0"/>
                  <rect x="0" y="3" width="2" height="3" fill="#c8b8a0"/>
                  <rect x="14" y="2" width="3" height="4" fill="#c8b8a0"/>
                  <rect x="16" y="3" width="2" height="3" fill="#c8b8a0"/>
                  {/* Inner ear — pink */}
                  <rect x="1" y="3" width="2" height="2" fill="#e8a8a8"/>
                  <rect x="15" y="3" width="2" height="2" fill="#e8a8a8"/>
                  {/* Eyes — large, kind */}
                  <rect x="5" y="3" width="2" height="2" fill="white"/>
                  <rect x="11" y="3" width="2" height="2" fill="white"/>
                  <rect x="6" y="3" width="1" height="2" fill="#2a1a10"/>
                  <rect x="12" y="3" width="1" height="2" fill="#2a1a10"/>
                  {/* Eye shine */}
                  <rect x="5" y="3" width="1" height="1" fill="white"/>
                  <rect x="11" y="3" width="1" height="1" fill="white"/>
                  {/* TRUNK — curling left, key feature */}
                  <rect x="8" y="5" width="2" height="1" fill="#b8a890"/>
                  <rect x="7" y="6" width="2" height="1" fill="#b8a890"/>
                  <rect x="6" y="7" width="2" height="1" fill="#b8a890"/>
                  <rect x="5" y="8" width="2" height="1" fill="#b8a890"/>
                  <rect x="4" y="9" width="2" height="1" fill="#b8a890"/>
                  <rect x="5" y="10" width="1" height="1" fill="#b8a890"/>
                  {/* Tusks — white */}
                  <rect x="6" y="6" width="1" height="2" fill="#ffffee"/>
                  <rect x="11" y="6" width="1" height="1" fill="#ffffee"/>
                  {/* Pot belly body — gold */}
                  <rect x="4" y="9" width="10" height="5" fill="#e8aa44"/>
                  <rect x="3" y="10" width="12" height="4" fill="#e8aa44"/>
                  <rect x="5" y="14" width="8" height="2" fill="#d89830"/>
                  {/* Belly highlight */}
                  <rect x="7" y="11" width="4" height="2" fill="#f0c060" opacity="0.7"/>
                  {/* Red dhoti */}
                  <rect x="4" y="15" width="10" height="3" fill="#cc3333"/>
                  <rect x="5" y="18" width="8" height="2" fill="#cc3333"/>
                  {/* Gold dhoti border */}
                  <rect x="4" y="15" width="10" height="1" fill="#ffcc33"/>
                  {/* FOUR ARMS */}
                  {/* Upper left — holding sweet */}
                  <rect x="1" y="8" width="3" height="1" fill="#c8b8a0"/>
                  <rect x="0" y="7" width="2" height="1" fill="#ffcc33"/>
                  {/* Upper right — holding broken tusk */}
                  <rect x="14" y="8" width="3" height="1" fill="#c8b8a0"/>
                  <rect x="16" y="7" width="2" height="1" fill="#ffffee"/>
                  {/* Lower left — reaching to Caishen */}
                  <rect x="2" y="12" width="2" height="1" fill="#c8b8a0"/>
                  <rect x="0" y="12" width="2" height="1" fill="#f8d8b8"/>
                  {/* Lower right — reaching to Hermes */}
                  <rect x="14" y="12" width="2" height="1" fill="#c8b8a0"/>
                  <rect x="16" y="12" width="2" height="1" fill="#f8d8b8"/>
                  {/* Feet */}
                  <rect x="5" y="20" width="3" height="1" fill="#c8b8a0"/>
                  <rect x="10" y="20" width="3" height="1" fill="#c8b8a0"/>
                  {/* Mouse — tiny at feet */}
                  <rect x="13" y="21" width="3" height="2" fill="#aaa090"/>
                  <rect x="16" y="21" width="1" height="1" fill="#aaa090"/>
                  <rect x="12" y="22" width="1" height="1" fill="#aaa090"/>
                </svg>

                {/* ═══ RIGHT: Greek Hermes 赫尔墨斯 ═══ */}
                <svg width="56" height="80" viewBox="0 0 14 20" style={{ imageRendering: "pixelated", display: "block" }}>
                  {/* Petasos hat */}
                  <rect x="2" y="1" width="10" height="2" fill="#4477cc"/>
                  <rect x="1" y="2" width="12" height="1" fill="#4477cc"/>
                  {/* Hat wings — white feathers */}
                  <rect x="0" y="0" width="2" height="2" fill="#ddeeff"/>
                  <rect x="0" y="1" width="1" height="1" fill="white"/>
                  <rect x="12" y="0" width="2" height="2" fill="#ddeeff"/>
                  <rect x="13" y="1" width="1" height="1" fill="white"/>
                  {/* Curly hair */}
                  <rect x="3" y="1" width="2" height="1" fill="#c8a050"/>
                  <rect x="9" y="1" width="2" height="1" fill="#c8a050"/>
                  {/* Face — youthful */}
                  <rect x="3" y="3" width="8" height="4" fill="#f0d0b0"/>
                  {/* Eyes — blue */}
                  <rect x="4" y="4" width="2" height="1" fill="white"/>
                  <rect x="8" y="4" width="2" height="1" fill="white"/>
                  <rect x="5" y="4" width="1" height="1" fill="#4466aa"/>
                  <rect x="9" y="4" width="1" height="1" fill="#4466aa"/>
                  {/* Smile */}
                  <rect x="5" y="6" width="4" height="1" fill="#d88878"/>
                  {/* Blue chlamys cloak */}
                  <rect x="2" y="7" width="10" height="2" fill="#4477cc"/>
                  <rect x="1" y="9" width="12" height="6" fill="#4477cc"/>
                  {/* Lighter drape */}
                  <rect x="8" y="8" width="3" height="5" fill="#5588dd"/>
                  {/* Gold clasp */}
                  <rect x="3" y="7" width="2" height="1" fill="#ffcc33"/>
                  {/* CADUCEUS staff */}
                  <rect x="0" y="4" width="1" height="13" fill="#ccaa44"/>
                  {/* Staff top wings */}
                  <rect x="0" y="3" width="1" height="1" fill="#ddeeff"/>
                  {/* Snakes on staff */}
                  <rect x="0" y="6" width="1" height="1" fill="#ddcc44"/>
                  <rect x="1" y="7" width="1" height="1" fill="#ccbb33"/>
                  <rect x="0" y="8" width="1" height="1" fill="#ddcc44"/>
                  <rect x="1" y="9" width="1" height="1" fill="#ccbb33"/>
                  <rect x="0" y="10" width="1" height="1" fill="#ddcc44"/>
                  {/* Left arm holding staff */}
                  <rect x="1" y="9" width="2" height="1" fill="#f0d0b0"/>
                  {/* Right arm reaching */}
                  <rect x="12" y="9" width="2" height="2" fill="#f0d0b0"/>
                  {/* Winged sandals */}
                  <rect x="2" y="15" width="4" height="1" fill="#ddeeff"/>
                  <rect x="8" y="15" width="4" height="1" fill="#ddeeff"/>
                  {/* Sandal wings */}
                  <rect x="1" y="14" width="1" height="1" fill="white" opacity="0.7"/>
                  <rect x="12" y="14" width="1" height="1" fill="white" opacity="0.7"/>
                  {/* Feet */}
                  <rect x="3" y="16" width="3" height="1" fill="#4466aa"/>
                  <rect x="8" y="16" width="3" height="1" fill="#4466aa"/>
                </svg>

              </div>{/* end gods row */}
            </div>{/* end bottom section */}

        </div>

      </main>
    </>
  )
}
