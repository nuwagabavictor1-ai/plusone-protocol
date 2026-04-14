"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { NightScene } from "@/components/NightScene"
import { Logo } from "@/components/Logo"
import { PixelAvatar } from "@/components/PixelAvatar"

const CHARACTERS = [
  {
    name: "Starrider",
    role: "The Dreamer",
    description: "Rides a shooting star across the sky, collecting wishes from everyone. Every dream deserves to be seen — and this little rider makes sure yours reaches the stars.",
    blessing: "\"Even the smallest light can cross the darkest sky.\"",
    color: "78,162,255",
    svg: (
      <svg width="120" height="52" viewBox="0 0 30 13" style={{ imageRendering: "pixelated" }}>
        {/* Trail */}
        <rect x="0" y="8" width="1" height="1" fill="#ffee88" opacity="0.2"/>
        <rect x="2" y="9" width="1" height="1" fill="#ffdd44" opacity="0.25"/>
        <rect x="4" y="8" width="2" height="1" fill="#ffdd66" opacity="0.35"/>
        <rect x="6" y="9" width="2" height="1" fill="#ffee88" opacity="0.45"/>
        <rect x="8" y="8" width="2" height="1" fill="#ffdd44" opacity="0.55"/>
        <rect x="10" y="8" width="2" height="2" fill="#ffee88" opacity="0.65"/>
        {/* Star */}
        <rect x="12" y="7" width="6" height="3" fill="#ffee88"/>
        <rect x="13" y="6" width="4" height="1" fill="#ffdd44"/>
        <rect x="13" y="10" width="4" height="1" fill="#ffcc44"/>
        <rect x="14" y="7" width="2" height="2" fill="#fffbe0"/>
        {/* Rider */}
        <rect x="14" y="1" width="4" height="1" fill="#5c3d1a"/>
        <rect x="13" y="2" width="6" height="3" fill="#f8d8b8"/>
        <rect x="14" y="2" width="1" height="1" fill="#2a1a40"/>
        <rect x="17" y="2" width="1" height="1" fill="#2a1a40"/>
        <rect x="15" y="4" width="2" height="1" fill="#d88878"/>
        <rect x="13" y="5" width="6" height="2" fill="#5577cc"/>
        <rect x="11" y="4" width="2" height="2" fill="#5577cc" opacity="0.6"/>
        <rect x="19" y="5" width="1" height="2" fill="#f8d8b8"/>
      </svg>
    ),
  },
  {
    name: "Wallet Sprite",
    role: "The Keeper",
    description: "Your gateway to Web3. This little guardian holds the key to connecting your wallet — the first step to joining the dream.",
    blessing: "\"Fortune favors those who dare to open the door.\"",
    color: "255,180,60",
    svg: (
      <svg width="60" height="48" viewBox="0 0 16 13" style={{ imageRendering: "pixelated" }}>
        <rect x="7" y="0" width="2" height="1" fill="#ffee66"/>
        <rect x="2" y="1" width="12" height="1" fill="#ffaa33"/>
        <rect x="1" y="2" width="14" height="1" fill="#ffcc55"/>
        <rect x="7" y="2" width="2" height="1" fill="#ffe088"/>
        <rect x="1" y="3" width="14" height="1" fill="#ffbb44"/>
        <rect x="1" y="4" width="14" height="1" fill="#ffbb44"/>
        <rect x="3" y="4" width="2" height="1" fill="white"/>
        <rect x="11" y="4" width="2" height="1" fill="white"/>
        <rect x="4" y="4" width="1" height="1" fill="#1a1a2e"/>
        <rect x="12" y="4" width="1" height="1" fill="#1a1a2e"/>
        <rect x="1" y="5" width="14" height="1" fill="#ffbb44"/>
        <rect x="3" y="5" width="1" height="1" fill="#ff9988" opacity="0.7"/>
        <rect x="12" y="5" width="1" height="1" fill="#ff9988" opacity="0.7"/>
        <rect x="6" y="5" width="1" height="1" fill="#cc7733"/>
        <rect x="9" y="5" width="1" height="1" fill="#cc7733"/>
        <rect x="7" y="6" width="2" height="1" fill="#cc7733"/>
        <rect x="1" y="6" width="5" height="1" fill="#ffaa33"/>
        <rect x="10" y="6" width="5" height="1" fill="#ffaa33"/>
        <rect x="1" y="7" width="14" height="1" fill="#ffaa33"/>
        <rect x="10" y="7" width="5" height="1" fill="#ffe888"/>
        <rect x="11" y="8" width="4" height="1" fill="#fff4cc"/>
        <rect x="1" y="8" width="9" height="1" fill="#ff9922"/>
        <rect x="1" y="9" width="14" height="1" fill="#ff9922"/>
        <rect x="5" y="9" width="1" height="1" fill="#ffe066"/>
        <rect x="6" y="8" width="2" height="1" fill="#ffe066"/>
        <rect x="7" y="9" width="1" height="1" fill="#ffe066"/>
        <rect x="2" y="10" width="12" height="1" fill="#ee8811"/>
      </svg>
    ),
  },
  {
    name: "The Three Guardians",
    role: "Keepers of the Dream Pool",
    description: "Caishen, Ganesha, and Hermes — wealth gods from three cultures, united to guard the Dream Pool. Every $1 dream contribution flows through their hands.",
    blessing: "\"When different worlds hold hands, miracles become possible.\"",
    color: "255,210,80",
    svg: (
      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", transform: "scale(0.8)", transformOrigin: "center center" }}>
        {/* Caishen */}
        <svg width="38" height="54" viewBox="0 0 14 20" style={{ imageRendering: "pixelated" }}>
          <rect x="0" y="2" width="2" height="1" fill="#cc3333"/>
          <rect x="12" y="2" width="2" height="1" fill="#cc3333"/>
          <rect x="3" y="0" width="8" height="1" fill="#222"/>
          <rect x="2" y="1" width="10" height="1" fill="#cc3333"/>
          <rect x="2" y="2" width="10" height="1" fill="#cc3333"/>
          <rect x="6" y="0" width="2" height="1" fill="#ffcc33"/>
          <rect x="5" y="1" width="4" height="1" fill="#ffcc33"/>
          <rect x="3" y="3" width="8" height="4" fill="#f8d8b8"/>
          <rect x="4" y="4" width="2" height="1" fill="#3a2510"/>
          <rect x="8" y="4" width="2" height="1" fill="#3a2510"/>
          <rect x="3" y="5" width="1" height="1" fill="#ffaaaa" opacity="0.5"/>
          <rect x="10" y="5" width="1" height="1" fill="#ffaaaa" opacity="0.5"/>
          <rect x="5" y="6" width="4" height="1" fill="#d88878"/>
          <rect x="4" y="7" width="2" height="2" fill="#cccccc"/>
          <rect x="8" y="7" width="2" height="2" fill="#cccccc"/>
          <rect x="5" y="9" width="1" height="2" fill="#bbbbbb"/>
          <rect x="8" y="9" width="1" height="2" fill="#bbbbbb"/>
          <rect x="2" y="7" width="10" height="2" fill="#cc3333"/>
          <rect x="1" y="9" width="12" height="6" fill="#cc3333"/>
          <rect x="2" y="10" width="10" height="1" fill="#ffcc33"/>
          <rect x="4" y="7" width="6" height="1" fill="#ffcc33"/>
          <rect x="12" y="9" width="1" height="2" fill="#f8d8b8"/>
          <rect x="12" y="8" width="2" height="1" fill="#ffcc33"/>
          <rect x="11" y="7" width="3" height="1" fill="#ffdd44"/>
          <rect x="3" y="15" width="3" height="1" fill="#222"/>
          <rect x="8" y="15" width="3" height="1" fill="#222"/>
          <rect x="2" y="16" width="4" height="1" fill="#333"/>
          <rect x="8" y="16" width="4" height="1" fill="#333"/>
        </svg>
        {/* Ganesha */}
        <svg width="48" height="64" viewBox="0 0 18 24" style={{ imageRendering: "pixelated" }}>
          <rect x="6" y="0" width="6" height="1" fill="#ffcc33"/>
          <rect x="5" y="1" width="8" height="1" fill="#ffcc33"/>
          <rect x="8" y="0" width="2" height="1" fill="#ff6666"/>
          <rect x="4" y="2" width="10" height="5" fill="#c8b8a0"/>
          <rect x="3" y="3" width="12" height="4" fill="#c8b8a0"/>
          <rect x="1" y="2" width="3" height="4" fill="#c8b8a0"/>
          <rect x="0" y="3" width="2" height="3" fill="#c8b8a0"/>
          <rect x="14" y="2" width="3" height="4" fill="#c8b8a0"/>
          <rect x="16" y="3" width="2" height="3" fill="#c8b8a0"/>
          <rect x="1" y="3" width="2" height="2" fill="#e8a8a8"/>
          <rect x="15" y="3" width="2" height="2" fill="#e8a8a8"/>
          <rect x="5" y="3" width="2" height="2" fill="white"/>
          <rect x="11" y="3" width="2" height="2" fill="white"/>
          <rect x="6" y="3" width="1" height="2" fill="#2a1a10"/>
          <rect x="12" y="3" width="1" height="2" fill="#2a1a10"/>
          <rect x="8" y="5" width="2" height="1" fill="#b8a890"/>
          <rect x="7" y="6" width="2" height="1" fill="#b8a890"/>
          <rect x="6" y="7" width="2" height="1" fill="#b8a890"/>
          <rect x="5" y="8" width="2" height="1" fill="#b8a890"/>
          <rect x="4" y="9" width="2" height="1" fill="#b8a890"/>
          <rect x="5" y="10" width="1" height="1" fill="#b8a890"/>
          <rect x="6" y="6" width="1" height="2" fill="#ffffee"/>
          <rect x="11" y="6" width="1" height="1" fill="#ffffee"/>
          <rect x="4" y="9" width="10" height="5" fill="#e8aa44"/>
          <rect x="3" y="10" width="12" height="4" fill="#e8aa44"/>
          <rect x="4" y="15" width="10" height="3" fill="#cc3333"/>
          <rect x="5" y="18" width="8" height="2" fill="#cc3333"/>
          <rect x="4" y="15" width="10" height="1" fill="#ffcc33"/>
          <rect x="1" y="8" width="3" height="1" fill="#c8b8a0"/>
          <rect x="14" y="8" width="3" height="1" fill="#c8b8a0"/>
          <rect x="2" y="12" width="2" height="1" fill="#c8b8a0"/>
          <rect x="14" y="12" width="2" height="1" fill="#c8b8a0"/>
          <rect x="5" y="20" width="3" height="1" fill="#c8b8a0"/>
          <rect x="10" y="20" width="3" height="1" fill="#c8b8a0"/>
          <rect x="13" y="21" width="3" height="2" fill="#aaa090"/>
          <rect x="16" y="21" width="1" height="1" fill="#aaa090"/>
        </svg>
        {/* Hermes */}
        <svg width="38" height="54" viewBox="0 0 14 20" style={{ imageRendering: "pixelated" }}>
          <rect x="2" y="1" width="10" height="2" fill="#4477cc"/>
          <rect x="1" y="2" width="12" height="1" fill="#4477cc"/>
          <rect x="0" y="0" width="2" height="2" fill="#ddeeff"/>
          <rect x="0" y="1" width="1" height="1" fill="white"/>
          <rect x="12" y="0" width="2" height="2" fill="#ddeeff"/>
          <rect x="13" y="1" width="1" height="1" fill="white"/>
          <rect x="3" y="1" width="2" height="1" fill="#c8a050"/>
          <rect x="9" y="1" width="2" height="1" fill="#c8a050"/>
          <rect x="3" y="3" width="8" height="4" fill="#f0d0b0"/>
          <rect x="4" y="4" width="2" height="1" fill="white"/>
          <rect x="8" y="4" width="2" height="1" fill="white"/>
          <rect x="5" y="4" width="1" height="1" fill="#4466aa"/>
          <rect x="9" y="4" width="1" height="1" fill="#4466aa"/>
          <rect x="5" y="6" width="4" height="1" fill="#d88878"/>
          <rect x="2" y="7" width="10" height="2" fill="#4477cc"/>
          <rect x="1" y="9" width="12" height="6" fill="#4477cc"/>
          <rect x="8" y="8" width="3" height="5" fill="#5588dd"/>
          <rect x="3" y="7" width="2" height="1" fill="#ffcc33"/>
          <rect x="0" y="4" width="1" height="13" fill="#ccaa44"/>
          <rect x="0" y="3" width="1" height="1" fill="#ddeeff"/>
          <rect x="0" y="6" width="1" height="1" fill="#ddcc44"/>
          <rect x="1" y="7" width="1" height="1" fill="#ccbb33"/>
          <rect x="0" y="8" width="1" height="1" fill="#ddcc44"/>
          <rect x="1" y="9" width="1" height="1" fill="#ccbb33"/>
          <rect x="0" y="10" width="1" height="1" fill="#ddcc44"/>
          <rect x="2" y="15" width="4" height="1" fill="#ddeeff"/>
          <rect x="8" y="15" width="4" height="1" fill="#ddeeff"/>
          <rect x="1" y="14" width="1" height="1" fill="white" opacity="0.7"/>
          <rect x="12" y="14" width="1" height="1" fill="white" opacity="0.7"/>
          <rect x="3" y="16" width="3" height="1" fill="#4466aa"/>
          <rect x="8" y="16" width="3" height="1" fill="#4466aa"/>
        </svg>
      </div>
    ),
  },
  {
    name: "Dream Fairy",
    role: "The Guide",
    description: "Floating in the Discover sky, this fairy leads you to your personal page. A guardian spirit that watches over every dreamer's journey.",
    blessing: "\"You are never alone on the path to your dream.\"",
    color: "160,100,220",
    svg: (
      <svg width="54" height="54" viewBox="0 0 12 12" style={{ imageRendering: "pixelated" }}>
        <rect x="3" y="0" width="1" height="1" fill="#ffee88"/>
        <rect x="5" y="0" width="2" height="1" fill="#ffcc44"/>
        <rect x="8" y="0" width="1" height="1" fill="#ffee88"/>
        <rect x="3" y="1" width="6" height="1" fill="#ffe8cc"/>
        <rect x="2" y="2" width="8" height="1" fill="#ffe8cc"/>
        <rect x="3" y="2" width="2" height="1" fill="white"/>
        <rect x="7" y="2" width="2" height="1" fill="white"/>
        <rect x="4" y="2" width="1" height="1" fill="#2a1a40"/>
        <rect x="8" y="2" width="1" height="1" fill="#2a1a40"/>
        <rect x="2" y="3" width="8" height="1" fill="#ffe8cc"/>
        <rect x="5" y="3" width="2" height="1" fill="#e8a090"/>
        <rect x="2" y="4" width="8" height="1" fill="#8b6ddb"/>
        <rect x="1" y="5" width="10" height="1" fill="#7b5dcc"/>
        <rect x="5" y="5" width="2" height="1" fill="#ffee88"/>
        <rect x="0" y="4" width="1" height="2" fill="rgba(200,180,255,0.5)"/>
        <rect x="11" y="4" width="1" height="2" fill="rgba(200,180,255,0.5)"/>
        <rect x="1" y="6" width="10" height="1" fill="#7b5dcc"/>
        <rect x="2" y="7" width="8" height="1" fill="#6a4db8"/>
        <rect x="3" y="8" width="6" height="1" fill="#6a4db8"/>
      </svg>
    ),
  },
  {
    name: "154 Pixel Souls",
    role: "Your Identity",
    description: "11 character archetypes, 14 color palettes — 154 unique pixel avatars for you to choose from. Wizard, knight, cat, robot, ghost, alien, fairy, pirate, ninja, astronaut, or jester. Each one is you, in a different universe.",
    blessing: "\"Be whoever you dream to be — there's a pixel for every soul.\"",
    color: "200,180,255",
    isAvatarGrid: true,
  },
  {
    name: "Merit Pool",
    role: "The Merit Box",
    description: "Every +1 leaves a trace of goodness. $0.2 from each transfer flows into the Merit Pool — a collective well of merit that fuels weekly raffles and rewards for those who give the most.",
    blessing: "\"What goes around, comes around — in coins and in karma.\"",
    color: "255,210,80",
    svg: (
      <svg width="56" height="56" viewBox="0 0 12 12" style={{ imageRendering: "pixelated" }}>
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
        <rect x="5" y="0" width="2" height="1" fill="#ffdd44"/>
      </svg>
    ),
  },
  {
    name: "Dream Fund",
    role: "The Treasure Bowl",
    description: "Every dream costs $1 to publish — and every dollar goes into the Dream Fund. 80% funds real-world impact projects. 20% sustains the builders. Your dream doesn't just float — it funds change.",
    blessing: "\"A bowl that never empties, because dreamers never stop.\"",
    color: "100,255,150",
    svg: (
      <svg width="56" height="56" viewBox="0 0 12 12" style={{ imageRendering: "pixelated" }}>
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
        <rect x="4" y="1" width="1" height="1" fill="#ffcc33"/>
        <rect x="7" y="1" width="1" height="1" fill="#ffdd44"/>
        <rect x="6" y="0" width="1" height="1" fill="#ffee88"/>
        <rect x="4" y="11" width="4" height="1" fill="#aa8822"/>
      </svg>
    ),
  },
]

const GUIDE_ITEMS = [
  { title: "Publish a Dream", desc: "Hover the Starrider on the homepage, type your dream, click Share. Costs $1 USDC — goes to the Dream Fund (80% public good, 20% developers)." },
  { title: "Give +1", desc: "Browse dreams in Discover, click +1 to send $1 USDC. $0.2 drops into the Merit Pool. The rest goes to the dreamer." },
  { title: "Like a Dream", desc: "Click 💚 to save a dream to your favorites. You'll be asked if you want to send +1 right away." },
  { title: "Merit Pool", desc: "Accumulates $0.2 from every +1. Funds weekly raffles — hit 7, 77, or 777 +1s in a week to qualify." },
  { title: "Dream Fund", desc: "Accumulates $1 from every dream published. 80% funds real-world impact. 20% sustains the builders." },
  { title: "Weekly Raffle", desc: "Every Saturday UTC+0. Three tiers: 7 / 77 / 777 weekly +1s. Whitelisted users must click to participate within a 1-hour window. Drawing 1 hour later." },
  { title: "Your Avatar", desc: "154 unique pixel avatars (11 types × 14 colors). Click your avatar on your personal page to choose. Auto-generated from your wallet address by default." },
]

const FAQ_ITEMS = [
  { q: "What blockchain does +1 use?", a: "Base — an Ethereum L2 by Coinbase. Low gas fees, fast transactions." },
  { q: "Do I need crypto to browse?", a: "No. You only need a wallet with USDC on Base when you want to give +1, publish a dream, or interact." },
  { q: "Where does my $1 go when I give +1?", a: "A portion goes to the dreamer, and $0.2 goes to the Merit Pool for weekly raffles." },
  { q: "Where does my $1 go when I publish a dream?", a: "100% to the Dream Fund — 80% for public good activities, 20% for developers." },
  { q: "Can I give +1 multiple times to the same person?", a: "Yes. Each +1 is a separate $1 USDC transfer." },
  { q: "What wallets are supported?", a: "MetaMask, OKX Wallet, Coinbase Wallet, WalletConnect, and any EIP-1193 browser extension." },
  { q: "Is my avatar stored on-chain?", a: "No. Avatar selection is stored in your browser (localStorage). If you clear data or switch devices, re-select." },
  { q: "What if I qualify for the raffle but forget to click?", a: "You miss it. The participation window is 1 hour — just like forgetting to claim a lottery ticket." },
  { q: "Will +1 support other chains?", a: "Planned. The goal is to let users send $1 from any chain (Base, BSC, etc.)." },
  { q: "Can I withdraw my received +1s?", a: "Yes. Go to your personal page and click Withdraw." },
]

type Tab = "Crew" | "Guide" | "FAQ"

export default function AboutPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("Crew")

  return (
    <>
      <NightScene paused={false} skyOnly auroraColor="160,100,220" />

      <main className="relative z-10 min-h-screen px-4 py-16">
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>

          <Logo />

          <button onClick={() => router.push("/discover")} style={{
            fontFamily: "'Righteous', cursive", fontSize: "11px",
            color: "rgba(255,255,255,0.4)", background: "none", border: "none",
            cursor: "pointer", marginBottom: "20px", letterSpacing: "0.04em",
            transition: "color 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)" }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
          >
            ← Back
          </button>

          {/* ═══ Tab Navigation ═══ */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "32px" }}>
            {(["Crew", "Guide", "FAQ"] as const).map(t => (
              <span
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: "'Righteous', cursive",
                  fontSize: "14px",
                  color: tab === t ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  padding: "6px 18px",
                  borderRadius: "12px",
                  background: tab === t ? "rgba(255,255,255,0.1)" : "transparent",
                  border: tab === t ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* ═══ Crew Tab ═══ */}
          {tab === "Crew" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "36px" }}>
                <h1 style={{
                  fontFamily: "'Righteous', cursive", fontSize: "24px",
                  color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em",
                }}>
                  Meet the Crew
                </h1>
                <div style={{
                  width: "40px", height: "2px", margin: "12px auto",
                  background: "linear-gradient(90deg, transparent, rgba(200,180,255,0.4), transparent)",
                }}/>
                <p style={{
                  fontFamily: "'Righteous', cursive", fontSize: "10px",
                  color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em",
                }}>
                  The pixel spirits that guide your +1 journey
                </p>
              </div>

              {CHARACTERS.map((char, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "center",
                    padding: "24px 16px",
                    marginBottom: "12px",
                    borderRadius: "16px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <div style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "90px",
                  }}>
                    {"isAvatarGrid" in char && char.isAvatarGrid ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", width: "84px" }}>
                        {[0, 15, 30, 45, 57, 72, 89, 118, 137].map(id => (
                          <PixelAvatar key={id} avatarId={id} size={24} />
                        ))}
                      </div>
                    ) : (
                      "svg" in char && char.svg
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h2 style={{
                      fontFamily: "'Righteous', cursive", fontSize: "16px",
                      color: `rgb(${char.color})`, letterSpacing: "0.04em",
                      textShadow: `0 0 12px rgba(${char.color}, 0.25)`,
                    }}>
                      {char.name}
                    </h2>
                    <p style={{
                      fontFamily: "'Righteous', cursive", fontSize: "9px",
                      color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
                      marginTop: "2px",
                    }}>
                      {char.role}
                    </p>
                    <p style={{
                      fontFamily: "'Caveat', cursive", fontSize: "14px", fontWeight: 700,
                      color: "rgba(255,255,255,0.55)", lineHeight: 1.5,
                      marginTop: "8px",
                    }}>
                      {char.description}
                    </p>
                    {"blessing" in char && (
                      <p style={{
                        fontFamily: "'Caveat', cursive", fontSize: "13px",
                        fontStyle: "italic",
                        color: `rgba(${char.color}, 0.5)`,
                        marginTop: "6px",
                      }}>
                        {char.blessing as string}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ Guide Tab ═══ */}
          {tab === "Guide" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "36px" }}>
                <h1 style={{
                  fontFamily: "'Righteous', cursive", fontSize: "24px",
                  color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em",
                }}>
                  How It Works
                </h1>
                <div style={{
                  width: "40px", height: "2px", margin: "12px auto",
                  background: "linear-gradient(90deg, transparent, rgba(100,255,150,0.4), transparent)",
                }}/>
              </div>

              {GUIDE_ITEMS.map((item, i) => (
                <div key={i} style={{ marginBottom: "20px", padding: "0 8px" }}>
                  <h3 style={{
                    fontFamily: "'Righteous', cursive", fontSize: "12px",
                    color: "rgba(100,255,150,0.8)", letterSpacing: "0.04em",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontFamily: "'Caveat', cursive", fontSize: "14px", fontWeight: 700,
                    color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginTop: "4px",
                  }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ═══ FAQ Tab ═══ */}
          {tab === "FAQ" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "36px" }}>
                <h1 style={{
                  fontFamily: "'Righteous', cursive", fontSize: "24px",
                  color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em",
                }}>
                  FAQ
                </h1>
                <div style={{
                  width: "40px", height: "2px", margin: "12px auto",
                  background: "linear-gradient(90deg, transparent, rgba(255,210,80,0.4), transparent)",
                }}/>
              </div>

              {FAQ_ITEMS.map((item, i) => (
                <div key={i} style={{ marginBottom: "20px", padding: "0 8px" }}>
                  <h3 style={{
                    fontFamily: "'Righteous', cursive", fontSize: "11px",
                    color: "rgba(255,210,80,0.8)", letterSpacing: "0.04em",
                  }}>
                    {item.q}
                  </h3>
                  <p style={{
                    fontFamily: "'Caveat', cursive", fontSize: "14px", fontWeight: 700,
                    color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginTop: "4px",
                  }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
