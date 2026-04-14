"use client"

import { useRef, useEffect, useState } from "react"
import { useAccount, useDisconnect } from "wagmi"
import { PixelAvatar } from "@/components/PixelAvatar"

// Deterministic star positions — golden ratio distribution, no hydration mismatch
const STARS = Array.from({ length: 220 }, (_, i) => ({
  id:  i,
  cx:  `${((i * 137.508) % 100).toFixed(2)}%`,
  cy:  `${((i * 97.31)   % 95).toFixed(2)}%`,
  r:   (0.3 + (i % 5) * 0.4).toFixed(1),
  dur: `${(1.4 + (i % 7) * 0.55).toFixed(1)}s`,
  del: `${((i * 0.37)    % 6.5).toFixed(2)}s`,
  op:  (0.12 + (i % 9) * 0.09).toFixed(2),
}))

// 7 wishes — what to do after collecting 1 USDC from everyone
// baseSize is the desktop reference; actual size = baseSize * screenScale
const WISHES = [
  { baseSize: 130, rgb: "255,148,72",  text: "Open a free coding\nschool for kids", avatarId: 3 },
  { baseSize: 100, rgb: "255,218,55",  text: "Launch a scholarship\nfor first-gen students", avatarId: 18 },
  { baseSize: 120, rgb: "75,205,118",  text: "A documentary about\nforgotten veterans", avatarId: 45 },
  { baseSize: 90,  rgb: "168,120,255", text: "Fund 100 hearing aids\nfor children", avatarId: 72 },
  { baseSize: 115, rgb: "78,162,255",  text: "A micro-farm that feeds\nthe neighborhood", avatarId: 97 },
  { baseSize: 95,  rgb: "95,228,182",  text: "Build a playground\nin a refugee camp", avatarId: 120 },
  { baseSize: 125, rgb: "255,168,210", text: "Turn an abandoned building\ninto a community art space", avatarId: 140 },
]

// Responsive: compute bubble scale and visible count from viewport width
function getScreenConfig(w: number) {
  if (w < 480)  return { scale: 0.5,  maxBubbles: 4 }  // mobile
  if (w < 768)  return { scale: 0.65, maxBubbles: 5 }  // small tablet
  if (w < 1024) return { scale: 0.8,  maxBubbles: 6 }  // tablet
  return                { scale: 1,    maxBubbles: 7 }  // desktop
}

// Bubble physics state — initialized once on mount
interface BubbleState {
  x: number; y: number   // center position
  vx: number; vy: number // velocity (px per frame)
  r: number              // radius
}

// Collision particle — a "+1" that flies out when bubbles meet
interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number    // 0→1, fades out as it increases
  color: string
}

function initBubbles(w: number, h: number, count: number, scale: number): BubbleState[] {
  const bubbles: BubbleState[] = []
  for (let i = 0; i < count; i++) {
    const r = (WISHES[i].baseSize * scale) / 2
    const speed = 0.3 + Math.random() * 0.4 // slow drift
    const angle = Math.random() * Math.PI * 2
    // Spread initial positions using golden angle to avoid overlaps
    const gx = ((i * 137.508) % 360) / 360
    const gy = ((i * 97.31 + 50) % 300) / 400 + 0.15
    bubbles.push({
      x: r + gx * (w - r * 2),
      y: r + gy * (h - r * 2),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r,
    })
  }
  return bubbles
}

export function NightScene({ paused = false, excludeRef, onConnectWallet, walletModalOpen = false, skyOnly = false, auroraColor, auroraPreset }: { paused?: boolean; excludeRef?: React.RefObject<HTMLElement | null>; onConnectWallet?: () => void; walletModalOpen?: boolean; skyOnly?: boolean; auroraColor?: string; auroraPreset?: "home" }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // Responsive bubble scaling
  const [screenCfg, setScreenCfg] = useState(() =>
    typeof window !== "undefined" ? getScreenConfig(window.innerWidth) : { scale: 1, maxBubbles: 7 }
  )
  useEffect(() => {
    const handleResize = () => setScreenCfg(getScreenConfig(window.innerWidth))
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const [hoveredBubble, setHoveredBubble] = useState<number | null>(null)
  const [charHovered, setCharHovered] = useState(false)
  const [wishInput, setWishInput] = useState(false)
  const charStoppedRef = useRef(false) // freeze walking when input is open
  const [wishText, setWishText] = useState("")
  const [userWishes, setUserWishes] = useState<{ text: string; rgb: string; baseSize: number; owner?: string }[]>([])

  // Load user wishes from localStorage on mount
  useEffect(() => {
    const stored: { text: string; rgb: string; baseSize: number; owner?: string }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("plusone_wish_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!)
          const ownerAddr = key.replace("plusone_wish_", "")
          stored.push({ text: data.text, rgb: data.color, baseSize: 100, owner: ownerAddr })
        } catch {}
      }
    }
    if (stored.length > 0) setUserWishes(stored)
  }, [])
  const hoveredRef = useRef<number | null>(null)
  hoveredRef.current = hoveredBubble

  // Character refs
  const posRef     = useRef<HTMLDivElement>(null)   // horizontal position wrapper
  const flipRef    = useRef<HTMLDivElement>(null)   // scaleX flip
  const charRef    = useRef<SVGSVGElement>(null)    // animation-play-state
  const thoughtRef = useRef<HTMLDivElement>(null)   // thought bubble

  // Wish bubble refs
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── Character: fly freely across entire sky ──
  useEffect(() => {
    const W = () => typeof window !== "undefined" ? window.innerWidth : 800
    const H = () => typeof window !== "undefined" ? window.innerHeight : 600
    const fly = {
      x: W() * 0.3,
      y: H() * 0.4,
      vx: 0.6,
      vy: 0.3,
      dir: 1 as 1 | -1,
    }
    let flyAnim: number

    const tick = () => {
      if (!charStoppedRef.current) {
        if (hoveredRef.current !== null) {
          const bubbleEl = bubbleRefs.current[hoveredRef.current]
          if (bubbleEl) {
            const rect = bubbleEl.getBoundingClientRect()
            const targetX = rect.left + rect.width / 2 - 50
            const targetY = rect.top + rect.height / 2 - 30
            fly.x += (targetX - fly.x) * 0.03
            fly.y += (targetY - fly.y) * 0.03
            fly.dir = targetX > fly.x ? 1 : -1
          }
        } else {
          fly.x += fly.vx
          fly.y += fly.vy

          // Bounce off all 4 edges with padding
          const pad = 60
          if (fly.x <= pad)         { fly.x = pad; fly.vx = Math.abs(fly.vx) * (0.8 + Math.random() * 0.4) }
          if (fly.x >= W() - pad)   { fly.x = W() - pad; fly.vx = -Math.abs(fly.vx) * (0.8 + Math.random() * 0.4) }
          if (fly.y <= pad)         { fly.y = pad; fly.vy = Math.abs(fly.vy) * (0.8 + Math.random() * 0.4) }
          if (fly.y >= H() - pad)   { fly.y = H() - pad; fly.vy = -Math.abs(fly.vy) * (0.8 + Math.random() * 0.4) }

          // Avoid wallet sprite (top-right) and door (center)
          const w = W(), h = H()
          // Wallet sprite zone: right 15%, top 12%
          if (fly.x > w * 0.82 && fly.y < h * 0.12) {
            fly.vx -= 0.15
            fly.vy += 0.15
          }
          // Door / center content zone: middle 30%, vertical 35%-65%
          if (fly.x > w * 0.35 && fly.x < w * 0.65 && fly.y > h * 0.35 && fly.y < h * 0.65) {
            const cx = w * 0.5, cy = h * 0.5
            const dx = fly.x - cx, dy = fly.y - cy
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            fly.vx += (dx / dist) * 0.1
            fly.vy += (dy / dist) * 0.1
          }

          // Gentle random drift to keep it interesting
          fly.vx += (Math.random() - 0.5) * 0.02
          fly.vy += (Math.random() - 0.5) * 0.02

          // Clamp speed
          const speed = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy)
          if (speed < 0.4) { fly.vx *= 1.5; fly.vy *= 1.5 }
          if (speed > 1.2) { fly.vx *= 0.95; fly.vy *= 0.95 }

          fly.dir = fly.vx > 0 ? 1 : -1
        }

        if (posRef.current) {
          posRef.current.style.left = `${fly.x}px`
          posRef.current.style.top  = `${fly.y}px`
        }
        if (flipRef.current) flipRef.current.style.transform = fly.dir > 0 ? "scaleX(1)" : "scaleX(-1)"
      }
      flyAnim = requestAnimationFrame(tick)
    }

    flyAnim = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(flyAnim)
  }, [])

  // Bubble carousel — show max 3 user bubbles at a time, rotate every 15s
  const MAX_USER_BUBBLES = 3
  const [carouselOffset, setCarouselOffset] = useState(0)

  useEffect(() => {
    if (userWishes.length <= MAX_USER_BUBBLES) return
    const interval = setInterval(() => {
      setCarouselOffset(prev => (prev + MAX_USER_BUBBLES) % userWishes.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [userWishes.length])

  // Pick which user bubbles to show
  const visibleUserWishes = userWishes.length <= MAX_USER_BUBBLES
    ? userWishes
    : (() => {
        const result: typeof userWishes = []
        // Always include own bubble if it exists
        const ownIdx = userWishes.findIndex(w => w.owner?.toLowerCase() === address?.toLowerCase())
        if (ownIdx >= 0) result.push(userWishes[ownIdx])
        // Fill remaining slots with carousel rotation
        for (let k = 0; result.length < MAX_USER_BUBBLES && k < userWishes.length; k++) {
          const idx = (carouselOffset + k) % userWishes.length
          if (!result.includes(userWishes[idx])) result.push(userWishes[idx])
        }
        return result
      })()

  // Apply responsive scaling: limit bubble count and scale sizes
  const scaledWishes = WISHES.slice(0, screenCfg.maxBubbles).map(w => ({
    ...w, size: Math.round(w.baseSize * screenCfg.scale),
  }))
  const scaledUserWishes = visibleUserWishes.map(w => ({
    ...w, size: Math.round(w.baseSize * screenCfg.scale),
  }))
  const allWishes = [...scaledWishes, ...scaledUserWishes]
  const allWishesRef = useRef(allWishes)
  allWishesRef.current = allWishes

  // ── Wish bubbles: physics simulation with collision ──
  const bubblesRef = useRef<BubbleState[]>([])
  const particlesRef = useRef<Particle[]>([])
  const particleContainerRef = useRef<HTMLDivElement>(null)
  const collisionCooldown = useRef<Set<string>>(new Set())

  // Sync physics bubbles to match allWishes count
  useEffect(() => {
    const totalNeeded = allWishes.length
    if (typeof window === "undefined") return

    // Trim excess bubbles
    if (bubblesRef.current.length > totalNeeded) {
      bubblesRef.current = bubblesRef.current.slice(0, totalNeeded)
    }

    // Add missing bubbles
    while (bubblesRef.current.length < totalNeeded) {
      const i = bubblesRef.current.length
      const r = (allWishes[i]?.size || 100) / 2
      const speed = 0.3 + Math.random() * 0.4
      const angle = Math.random() * Math.PI * 2
      bubblesRef.current.push({
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * (0.2 + Math.random() * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r,
      })
    }

    // Update radii in case sizes changed (carousel swap)
    for (let i = 0; i < totalNeeded; i++) {
      bubblesRef.current[i].r = (allWishes[i]?.size || 100) / 2
    }
  }, [allWishes.length, carouselOffset, screenCfg.scale])

  useEffect(() => {
    let W = window.innerWidth
    let H = window.innerHeight
    if (bubblesRef.current.length === 0) {
      bubblesRef.current = initBubbles(W, H, screenCfg.maxBubbles, screenCfg.scale)
    }
    const balls = bubblesRef.current
    let animId: number

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      // Clamp any bubbles that are now out of bounds
      for (const b of balls) {
        b.x = Math.max(b.r + 10, Math.min(W - b.r - 10, b.x))
        b.y = Math.max(b.r + 10, Math.min(H - b.r - 10, b.y))
      }
    }
    window.addEventListener("resize", onResize)

    const tick = () => {
      const t = Date.now()
      const pad = 10 // padding from screen edges

      if (pausedRef.current) {
        animId = requestAnimationFrame(tick)
        return
      }

      // Update positions
      for (const b of balls) {
        b.x += b.vx
        b.y += b.vy
      }

      // Bubble-bubble collision — separation + bounce + particle spawn
      for (let iter = 0; iter < 6; iter++) {
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], b = balls[j]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const distSq = dx * dx + dy * dy
            const minDist = a.r + b.r + 8
            if (distSq < minDist * minDist && distSq > 0.001) {
              const dist = Math.sqrt(distSq)
              const nx = dx / dist
              const ny = dy / dist

              // Push apart — strong separation
              const overlap = (minDist - dist) / 2 + 3
              a.x -= nx * overlap
              a.y -= ny * overlap
              b.x += nx * overlap
              b.y += ny * overlap

              // Velocity exchange + forced bounce — first iteration only
              if (iter === 0) {
                const dvx = a.vx - b.vx
                const dvy = a.vy - b.vy
                const dot = dvx * nx + dvy * ny

                // Only trigger real collision when bubbles are approaching
                if (dot > 0) {
                  // Elastic swap
                  a.vx -= dot * nx
                  a.vy -= dot * ny
                  b.vx += dot * nx
                  b.vy += dot * ny

                  // Ensure minimum separation velocity
                  const minBounce = 0.5
                  const aDot = a.vx * (-nx) + a.vy * (-ny)
                  if (aDot < minBounce) {
                    a.vx += (-nx) * (minBounce - aDot)
                    a.vy += (-ny) * (minBounce - aDot)
                  }
                  const bDot = b.vx * nx + b.vy * ny
                  if (bDot < minBounce) {
                    b.vx += nx * (minBounce - bDot)
                    b.vy += ny * (minBounce - bDot)
                  }

                  // Spawn +1 particles — only on real approach collision
                  const pairKey = `${i}-${j}`
                  if (!collisionCooldown.current.has(pairKey)) {
                    collisionCooldown.current.add(pairKey)
                    setTimeout(() => collisionCooldown.current.delete(pairKey), 2500)

                    const midX = (a.x + b.x) / 2
                    const midY = (a.y + b.y) / 2
                    const colorA = allWishesRef.current[i]?.rgb || "255,255,255"
                    const colorB = allWishesRef.current[j]?.rgb || "255,255,255"
                    const count = 2 + Math.floor(Math.random() * 2)
                    for (let p = 0; p < count; p++) {
                      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
                      const speed = 2.5 + Math.random() * 2
                      particlesRef.current.push({
                        x: midX + (Math.random() - 0.5) * 6,
                        y: midY + (Math.random() - 0.5) * 6,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0,
                        color: p % 2 === 0 ? colorA : colorB,
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Maintain minimum speed so bubbles never stop
      for (const b of balls) {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
        if (speed < 0.4) {
          const angle = Math.atan2(b.vy, b.vx) || Math.random() * Math.PI * 2
          b.vx = Math.cos(angle) * 0.5
          b.vy = Math.sin(angle) * 0.5
        }
        if (speed > 1.5) {
          b.vx *= 1.2 / speed
          b.vy *= 1.2 / speed
        }
      }

      // ── Center column exclude — keeps bubbles away from all center content ──
      // Single unified zone: covers center 36% width, from 20% to 100% height
      // This protects: title, text, door, möbius, pools, gods
      const bW = typeof window !== "undefined" ? window.innerWidth : 800
      const bH = typeof window !== "undefined" ? window.innerHeight : 600
      const centerLeft = bW * 0.35
      const centerRight = bW * 0.65
      const centerTop = bH * 0.2

      for (const b of balls) {
        // Check if bubble center is inside the protected column
        if (b.x + b.r > centerLeft && b.x - b.r < centerRight && b.y + b.r > centerTop) {
          // Push left or right depending on which side is closer
          const midX = (centerLeft + centerRight) / 2
          if (b.x < midX) {
            // Push left
            b.vx -= 0.3
            if (b.x + b.r > centerLeft) {
              b.x = centerLeft - b.r - 2
              b.vx = -Math.abs(b.vx) - 0.1
            }
          } else {
            // Push right
            b.vx += 0.3
            if (b.x - b.r < centerRight) {
              b.x = centerRight + b.r + 2
              b.vx = Math.abs(b.vx) + 0.1
            }
          }
        }
      }

      // Wall constraints — FINAL hard clamp, runs AFTER collision separation
      for (const b of balls) {
        if (b.x - b.r < pad)     { b.x = b.r + pad; b.vx = Math.abs(b.vx) }
        if (b.x + b.r > W - pad) { b.x = W - b.r - pad; b.vx = -Math.abs(b.vx) }
        if (b.y - b.r < pad)     { b.y = b.r + pad; b.vy = Math.abs(b.vy) }
        if (b.y + b.r > H - pad) { b.y = H - b.r - pad; b.vy = -Math.abs(b.vy) }
      }

      // Apply to DOM — floatY is visual-only via transform, not position
      bubbleRefs.current.forEach((el, i) => {
        if (!el) return
        const b = balls[i]
        const period = (3.0 + i * 0.42) * 1000
        const phase  = i * 580
        const floatY = Math.sin(((t + phase) / period) * Math.PI * 2) * 5
        const scale  = hoveredRef.current === i ? 2 : 1
        el.style.left = `${b.x - b.r}px`
        el.style.top  = `${b.y - b.r}px`
        el.style.transform = `translateY(${floatY}px) scale(${scale})`
      })

      // Update and render +1 particles
      const container = particleContainerRef.current
      if (container) {
        const particles = particlesRef.current
        // Update particles
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.98 // air friction
          p.vy *= 0.98
          p.vy += 0.03 // slight gravity
          p.life += 0.012 // slower fade = visible longer (~83 frames ≈ 1.4s)
        }
        // Remove dead particles
        particlesRef.current = particles.filter(p => p.life < 1)

        // Sync DOM — create/remove elements as needed
        const active = particlesRef.current
        while (container.children.length > active.length) {
          container.removeChild(container.lastChild!)
        }
        while (container.children.length < active.length) {
          const el = document.createElement("span")
          el.textContent = "+1"
          el.style.position = "absolute"
          el.style.fontFamily = "'Righteous', cursive"
          el.style.fontWeight = "400"
          el.style.pointerEvents = "none"
          el.style.whiteSpace = "nowrap"
          container.appendChild(el)
        }
        for (let k = 0; k < active.length; k++) {
          const p = active[k]
          const el = container.children[k] as HTMLElement
          const opacity = 1 - p.life
          const scale = 0.6 + (1 - p.life) * 0.6
          el.style.left = `${p.x}px`
          el.style.top = `${p.y}px`
          el.style.fontSize = "22px"
          el.style.color = `rgb(${p.color})`
          el.style.textShadow = `0 0 16px rgba(${p.color}, ${opacity * 0.8}), 0 0 32px rgba(${p.color}, ${opacity * 0.4})`
          el.style.opacity = `${Math.min(1, opacity * 1.5)}`
          el.style.transform = `translate(-50%, -50%) scale(${scale})`
        }
      }
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize) }
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
      style={paused ? { animationPlayState: "paused" } : undefined}
    >

      {/* ── Sky: nebula + stars + shooting stars ── */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="neb1" cx="22%" cy="30%" r="52%">
            <stop offset="0%"   stopColor="#0d2248" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#040f1c" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="neb2" cx="75%" cy="55%" r="42%">
            <stop offset="0%"   stopColor="#091830" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#040f1c" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="neb3" cx="50%" cy="100%" r="55%">
            <stop offset="0%"   stopColor="#06122a" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#040f1c" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="neb4" cx="50%" cy="40%" r="30%">
            <stop offset="0%"   stopColor="#1a1040" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#040f1c" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#neb1)"/>
        <rect width="100%" height="100%" fill="url(#neb2)"/>
        <rect width="100%" height="100%" fill="url(#neb3)"/>
        <rect width="100%" height="100%" fill="url(#neb4)"/>

        {/* Stars */}
        {STARS.map(s => (
          <circle
            key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="white"
            style={{ opacity: Number(s.op), animation: `star-twinkle ${s.dur} ${s.del} ease-in-out infinite` }}
          />
        ))}

        {/* Shooting stars + Comets — homepage only */}
        {!skyOnly && <>
          <g style={{ animation: "shoot1 11s 1.5s linear infinite" }}>
            <line x1="18%" y1="20%" x2="30%" y2="28%" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="18%" cy="20%" r="2.5" fill="white" opacity="0.6"/>
          </g>
          <g style={{ animation: "shoot2 16s 7s linear infinite" }}>
            <line x1="54%" y1="8%" x2="64%" y2="14%" stroke="white" strokeWidth="1" strokeLinecap="round"/>
            <circle cx="54%" cy="8%" r="1.8" fill="white" opacity="0.5"/>
          </g>
          <g style={{ animation: "shoot3 14s 4s linear infinite" }}>
            <line x1="82%" y1="12%" x2="68%" y2="22%" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="82%" cy="12%" r="2" fill="white" opacity="0.55"/>
          </g>
          <g style={{ animation: "shoot4 18s 10s linear infinite" }}>
            <line x1="35%" y1="45%" x2="48%" y2="52%" stroke="white" strokeWidth="0.8" strokeLinecap="round"/>
            <circle cx="35%" cy="45%" r="1.5" fill="white" opacity="0.4"/>
          </g>
          <g style={{ animation: "comet1 22s 3s linear infinite" }}>
            <line x1="10%" y1="30%" x2="18%" y2="34%" stroke="rgba(170,204,255,0.4)" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="10%" cy="30%" r="3.5" fill="rgba(170,204,255,0.5)"/>
            <circle cx="10%" cy="30%" r="1.5" fill="white"/>
          </g>
          <g style={{ animation: "comet2 28s 12s linear infinite" }}>
            <line x1="75%" y1="15%" x2="65%" y2="22%" stroke="rgba(255,220,130,0.35)" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="75%" cy="15%" r="3" fill="#ffd880" opacity="0.8"/>
            <circle cx="75%" cy="15%" r="1.2" fill="white"/>
          </g>
        </>}

      </svg>

      {/* Aurora overlay — vivid multi-color aurora, unique per user */}
      {auroraColor && (() => {
        // Home page — dedicated green aurora, top 2/3 only
        if (auroraPreset === "home") {
          return (
            <div className="aurora-container">
              {/* Main green burst — covers most of screen */}
              <div className="aurora-band aurora-band-1" style={{
                background: "radial-gradient(ellipse 140% 100% at 50% 20%, #00ff88cc 0%, #00cc66aa 25%, #00ff8844 50%, transparent 80%)",
              }}/>
              {/* Green sweep left — wider */}
              <div className="aurora-band aurora-band-2" style={{
                background: "radial-gradient(ellipse 120% 90% at 15% 15%, #22ffaa99 0%, #00dd7766 35%, transparent 70%)",
              }}/>
              {/* Green sweep right — wider */}
              <div className="aurora-band aurora-band-3" style={{
                background: "radial-gradient(ellipse 110% 80% at 85% 25%, #44ffbb88 0%, #00ee8855 40%, transparent 70%)",
              }}/>
              {/* Blue accent — larger spread */}
              <div className="aurora-band aurora-band-4" style={{
                background: "radial-gradient(ellipse 90% 70% at 60% 40%, #0088ff33 0%, #0066cc22 35%, transparent 65%)",
              }}/>
              {/* Full height wash */}
              <div className="aurora-band aurora-band-5" style={{
                background: "linear-gradient(180deg, #00ff8877 0%, #00ff8844 25%, #00ff8822 50%, transparent 75%)",
              }}/>
            </div>
          )
        }

        const auroraIntensity = skyOnly ? 1 : 0.35
        // Generate aurora palette from address hash
        const seed = auroraColor.split(",").reduce((a, b) => a + parseInt(b), 0)
        const AURORA_PALETTES = [
          ["#ff44aa", "#aa00ff", "#ff66cc"],   // pink → purple → rose
          ["#00ff88", "#00aaff", "#44ffcc"],   // green → blue → cyan
          ["#cc44ff", "#ff2288", "#aa44ff"],   // violet → pink → purple
          ["#22ff66", "#0066ff", "#00ccaa"],   // green → deep blue → teal
          ["#ff66bb", "#8844ff", "#ff44dd"],   // rose → indigo → magenta
          ["#00ffcc", "#0088ff", "#33ff88"],   // cyan → blue → green
          ["#dd44ff", "#00ddff", "#bb22ff"],   // purple → teal → violet
          ["#00ff66", "#ff3399", "#00ccff"],   // green → pink → cyan
          ["#ff44cc", "#00aaff", "#ff88dd"],   // magenta → blue → light pink
          ["#44ff44", "#9944ff", "#00ff99"],   // lime → purple → mint
          ["#aa22ff", "#00ff88", "#cc66ff"],   // deep purple → green → lavender
          ["#00eebb", "#ff55aa", "#0077ff"],   // teal → pink → blue
        ]
        const pal = AURORA_PALETTES[seed % AURORA_PALETTES.length]
        const shift = (seed * 37) % 60 - 30 // random horizontal offset

        return (
          <div className="aurora-container" style={{ opacity: auroraIntensity }}>
            {/* Band 1 — dominant sweep */}
            <div className="aurora-band aurora-band-1" style={{
              background: `linear-gradient(${160 + shift}deg, transparent 15%, ${pal[0]}aa 30%, ${pal[1]}88 48%, transparent 65%)`,
            }}/>
            {/* Band 2 — secondary sweep */}
            <div className="aurora-band aurora-band-2" style={{
              background: `linear-gradient(${200 - shift}deg, transparent 20%, ${pal[1]}88 35%, ${pal[2]}aa 52%, transparent 70%)`,
            }}/>
            {/* Band 3 — top glow wash */}
            <div className="aurora-band aurora-band-3" style={{
              background: `radial-gradient(ellipse 130% 45% at ${45 + shift/3}% 5%, ${pal[0]}66 0%, ${pal[2]}44 35%, transparent 65%)`,
            }}/>
            {/* Band 4 — vertical pillar */}
            <div className="aurora-band aurora-band-4" style={{
              background: `radial-gradient(ellipse 35% 90% at ${65 + shift/2}% 15%, ${pal[2]}88 0%, ${pal[0]}44 45%, transparent 75%)`,
            }}/>
            {/* Band 5 — ambient fill */}
            <div className="aurora-band aurora-band-5" style={{
              background: `radial-gradient(ellipse 110% 70% at ${35 - shift/4}% 25%, ${pal[1]}44 0%, ${pal[0]}22 40%, transparent 65%)`,
            }}/>
          </div>
        )
      })()}

      {!skyOnly && <>
      {/* ── Wallet Sprite — click to connect any Web3 wallet ── */}
      <div
        onClick={() => {
          if (isConnected) {
            disconnect()
          } else {
            onConnectWallet?.()
          }
        }}
        style={{
          position:       "absolute",
          right:          "5%",
          top:            "4%",
          cursor:         "pointer",
          pointerEvents:  "auto",
          zIndex:         20,
          animation:      "moon-float 5s ease-in-out infinite",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            "6px",
        }}
      >
        <svg
          width="40" height="32" viewBox="0 0 16 13"
          style={{ imageRendering: "pixelated", display: "block" }}
        >
          {/* Sparkle above */}
          <rect x="7" y="0" width="2" height="1" fill={isConnected ? "#44ff88" : "#ffee66"} style={{ animation: "star-twinkle 1s ease-in-out infinite" }}/>

          {/* Wallet flap — top fold */}
          <rect x="2" y="1" width="12" height="1" fill="#ffaa33"/>
          <rect x="1" y="2" width="14" height="1" fill="#ffcc55"/>
          {/* Flap clasp — center button */}
          <rect x="7" y="2" width="2" height="1" fill="#ffe088"/>

          {/* Wallet body — bright orange/gold */}
          <rect x="1" y="3" width="14" height="1" fill="#ffbb44"/>
          {/* Eyes row */}
          <rect x="1" y="4" width="14" height="1" fill="#ffbb44"/>
          <rect x="3" y="4" width="2" height="1" fill="white"/>
          <rect x="11" y="4" width="2" height="1" fill="white"/>
          <rect x="4" y="4" width="1" height="1" fill={isConnected ? "#22dd66" : "#1a1a2e"}/>
          <rect x="12" y="4" width="1" height="1" fill={isConnected ? "#22dd66" : "#1a1a2e"}/>
          {/* Cheeks + body */}
          <rect x="1" y="5" width="14" height="1" fill="#ffbb44"/>
          <rect x="3" y="5" width="1" height="1" fill="#ff9988" opacity="0.7"/>
          <rect x="12" y="5" width="1" height="1" fill="#ff9988" opacity="0.7"/>
          {/* Smile */}
          <rect x="6" y="5" width="1" height="1" fill="#cc7733"/>
          <rect x="9" y="5" width="1" height="1" fill="#cc7733"/>
          <rect x="7" y="6" width="2" height="1" fill="#cc7733"/>

          {/* Mid body */}
          <rect x="1" y="6" width="5" height="1" fill="#ffaa33"/>
          <rect x="10" y="6" width="5" height="1" fill="#ffaa33"/>
          {/* Card slot — wallet signature detail */}
          <rect x="1" y="7" width="14" height="1" fill="#ffaa33"/>
          <rect x="10" y="7" width="5" height="1" fill="#ffe888"/>
          <rect x="14" y="7" width="1" height="1" fill="#ffcc44"/>
          {/* Card slot inner */}
          <rect x="11" y="8" width="4" height="1" fill="#fff4cc"/>
          <rect x="10" y="8" width="1" height="1" fill="#ffaa33"/>

          {/* Lower body */}
          <rect x="1" y="8" width="9" height="1" fill="#ff9922"/>
          <rect x="1" y="9" width="14" height="1" fill="#ff9922"/>
          {/* Coin — $ symbol */}
          <rect x="5" y="9" width="1" height="1" fill="#ffe066"/>
          <rect x="6" y="8" width="2" height="1" fill="#ffe066"/>
          <rect x="7" y="9" width="1" height="1" fill="#ffe066"/>

          {/* Bottom edge */}
          <rect x="2" y="10" width="12" height="1" fill="#ee8811"/>
          {/* Bottom stitching detail */}
          <rect x="3" y="10" width="2" height="1" fill="#ffaa33"/>
          <rect x="7" y="10" width="2" height="1" fill="#ffaa33"/>
          <rect x="11" y="10" width="2" height="1" fill="#ffaa33"/>
        </svg>

        {/* Address or "connect" label */}
        <span style={{
          fontFamily:    "'Righteous', cursive",
          fontSize:      "9px",
          color:         isConnected ? "rgba(68,255,136,0.8)" : "rgba(255,255,255,0.9)",
          letterSpacing: "0.05em",
          textShadow:    isConnected ? "0 0 8px rgba(68,255,136,0.4)" : "none",
          userSelect:    "none",
        }}>
          {isConnected && address
            ? `${address.slice(0, 4)}...${address.slice(-4)}`
            : walletModalOpen
              ? ""
              : "connect"}
        </span>
      </div>

      {/* ── Collision +1 particles ── */}
      <div ref={particleContainerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}/>

      {/* ── Wish Bubbles ── */}
      {allWishes.map((w, i) => (
        <div
          key={i}
          ref={el => { bubbleRefs.current[i] = el }}
          className="absolute pointer-events-auto wish-bubble"
          style={{
            color:          `rgb(${w.rgb})`,
            width:          w.size,
            height:         w.size,
            borderRadius:   "50%",
            background:     "radial-gradient(circle at 40% 38%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.04) 70%, transparent 100%)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "default",
            transition:     "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          onMouseEnter={() => {
            setHoveredBubble(i)
            const el = bubbleRefs.current[i]
            if (!el) return
            const label  = el.querySelector("[data-role='label']") as HTMLElement
            const text   = el.querySelector("[data-role='text']") as HTMLElement
            const action = el.querySelector("[data-role='action']") as HTMLElement
            if (label)  { label.style.animation = "none"; label.style.opacity = "0" }
            if (text)   { text.style.opacity = "1"; text.style.transform = "translateY(0)"; text.style.color = "rgba(255,255,255,0.95)"; text.style.textShadow = "0 1px 3px rgba(0,0,0,0.4)" }
            if (action) { action.style.opacity = "1"; action.style.transform = "translateY(0)" }
          }}
          onMouseLeave={() => {
            setHoveredBubble(null)
            const el = bubbleRefs.current[i]
            if (!el) return
            const label  = el.querySelector("[data-role='label']") as HTMLElement
            const text   = el.querySelector("[data-role='text']") as HTMLElement
            const action = el.querySelector("[data-role='action']") as HTMLElement
            if (label)  { label.style.opacity = "1"; label.style.animation = "" }
            if (text)   { text.style.opacity = "0"; text.style.transform = "translateY(5px)"; text.style.color = `rgb(${w.rgb})`; text.style.textShadow = `0 0 12px rgb(${w.rgb})` }
            if (action) { action.style.opacity = "0"; action.style.transform = "translateY(4px)" }
          }}
        >
          {/* Avatar label — PixelAvatar or +1 for user bubbles */}
          <div
            data-role="label"
            style={{
              position:      "absolute",
              opacity:       1,
              transition:    "opacity 0.3s",
              userSelect:    "none",
            }}
          >
            {"avatarId" in w ? (
              <PixelAvatar avatarId={(w as { avatarId: number }).avatarId} size={Math.round(w.size * 0.22)} />
            ) : (
              <span style={{
                fontSize:      `${Math.round(w.size * 0.35)}px`,
                fontWeight:    400,
                fontFamily:    "'Righteous', cursive",
                color:         `rgb(${w.rgb})`,
                letterSpacing: "0.02em",
                animation:     `plus-one-shimmer ${(2.5 + i * 0.4).toFixed(1)}s ease-in-out infinite`,
              }}>+1</span>
            )}
          </div>

          {/* Wish text — revealed on hover */}
          <p
            data-role="text"
            style={{
              fontFamily:    "'Caveat', cursive",
              fontSize:      `${Math.max(13, Math.round(w.size * 0.11))}px`,
              fontWeight:    700,
              color:         "currentColor",
              textAlign:     "center",
              whiteSpace:    "pre-line",
              lineHeight:    1.55,
              letterSpacing: "0.02em",
              padding:       "0 14px",
              textShadow:    "0 0 12px currentColor",
              opacity:       0,
              transform:     "translateY(6px)",
              transition:    "opacity 0.25s, transform 0.3s",
              pointerEvents: "none",
            }}
          >
            {w.text}
          </p>

          {/* +1 action button — only for user bubbles with an owner address */}
          {"owner" in w && (w as { owner?: string }).owner && (
            <button
              data-role="action"
              onClick={(e) => {
                e.stopPropagation()
                const ownerAddr = (w as { owner?: string }).owner!
                window.location.href = `/${ownerAddr}`
              }}
              style={{
                position:      "absolute",
                bottom:        "12%",
                fontFamily:    "'Righteous', cursive",
                fontSize:      "11px",
                letterSpacing: "0.08em",
                color:         "#1a1a2e",
                background:    "rgba(255,255,255,0.7)",
                border:        "1.5px solid rgba(255,255,255,0.9)",
                borderRadius:  "20px",
                padding:       "4px 16px",
                cursor:        "pointer",
                opacity:       0,
                transition:    "opacity 0.25s, transform 0.2s",
                transform:     "translateY(4px)",
                pointerEvents: "auto",
              }}
            >
              +1
            </button>
          )}
        </div>
      ))}

      {/* ── Flying Character on Shooting Star ── */}
      <div
        ref={posRef}
        style={{
          position:      "absolute",
          top:           0,
          left:          "50px",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          pointerEvents: "auto",
          cursor:        "pointer",
          zIndex:        20,
        }}
        onMouseEnter={() => {
          setCharHovered(true)
          charStoppedRef.current = true
          // Show input for everyone, except those who already shared
          const alreadyShared = isConnected && address && localStorage.getItem(`plusone_wish_${address}`)
          if (!alreadyShared) {
            setWishInput(true)
          }
        }}
        onMouseLeave={() => {
          setCharHovered(false)
          // Only close and resume walking if nothing typed
          if (!wishText.trim()) {
            setWishInput(false)
            charStoppedRef.current = false
          }
        }}
        onClick={() => {
          if (!isConnected) {
            onConnectWallet?.()
          }
        }}
      >
        {/* Prompt bubble + input panel side by side above character */}
        <div style={{
          marginBottom: "2px",
          display:      "flex",
          alignItems:   "flex-end",
          gap:          "10px",
        }}>
          {/* Thought bubble — always visible */}
          <div
            ref={thoughtRef}
            style={{
              opacity:      wishInput ? 0 : 1,
              transform:    charHovered && !wishInput ? "scale(1.05) translateY(-2px)" : "scale(1) translateY(0)",
              transition:   "all 0.35s ease-out",
              pointerEvents: wishInput ? "none" : "auto",
            }}
          >
            <div style={{
              background:   charHovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              border:       charHovered ? "2px solid rgba(255,220,180,0.35)" : "2px solid rgba(255,255,255,0.15)",
              borderRadius: "14px",
              padding:      "10px 14px",
              maxWidth:     "160px",
              textAlign:    "center",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              transition:   "all 0.35s ease",
            }}>
              <p style={{
                fontFamily:    "'Righteous', cursive",
                fontSize:      "10px",
                fontWeight:    700,
                color:         charHovered ? "rgba(255,220,180,0.95)" : "rgba(255,210,60,0.9)",
                lineHeight:    1.7,
                letterSpacing: "0.06em",
                textShadow:    charHovered ? "0 0 8px rgba(255,200,140,0.3)" : "0 0 8px rgba(255,200,60,0.3)",
                transition:    "all 0.35s ease",
              }}>
                {!charHovered
                  ? "CLICK ME"
                  : !isConnected
                    ? "CLICK ME"
                    : address && localStorage.getItem(`plusone_wish_${address}`)
                      ? "You already shared yours"
                      : "I'd love to hear yours"}
              </p>
            </div>
          </div>

          {/* Input panel — appears on hover next to bubble */}
          {wishInput && (
            <div
              style={{ animation: "bubble-in 0.3s ease-out" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                background:     "linear-gradient(135deg, #d4c8f0 0%, #b8d8f8 30%, #c8e8ee 50%, #bbe8d8 70%, #f0d0c0 85%, #f0c0d8 95%, #dcc0e8 100%)",
                border:         "2px solid rgba(200,180,240,0.4)",
                borderRadius:   "14px",
                padding:        "12px 14px",
                width:          "200px",
              }}>
                <textarea
                  value={wishText}
                  onChange={(e) => setWishText(e.target.value.slice(0, 100))}
                  onKeyDown={(e) => { if (e.key === "Escape") { setWishInput(false); setWishText(""); charStoppedRef.current = false; setCharHovered(false) } }}
                  placeholder="Your wish..."
                  autoFocus
                  style={{
                    width:          "100%",
                    height:         "52px",
                    background:     "transparent",
                    border:         "none",
                    outline:        "none",
                    resize:         "none",
                    fontFamily:     "'Caveat', cursive",
                    fontSize:       "14px",
                    fontWeight:     700,
                    color:          "#3a2860",
                    lineHeight:     1.5,
                    letterSpacing:  "0.02em",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                  <span style={{
                    fontFamily: "'Righteous', cursive",
                    fontSize:   "9px",
                    color:      "rgba(255,255,255,0.35)",
                  }}>
                    {wishText.length}/100
                  </span>
                  <button
                    onClick={() => {
                      if (!wishText.trim() || !address) return
                      const colors = ["255,148,72", "255,218,55", "75,205,118", "168,120,255", "78,162,255", "95,228,182", "255,168,210"]
                      const rgb = colors[Math.floor(Math.random() * colors.length)]
                      localStorage.setItem(`plusone_wish_${address}`, JSON.stringify({
                        text: wishText.trim(),
                        color: rgb,
                        createdAt: Date.now(),
                      }))
                      setUserWishes(prev => [...prev, { text: wishText.trim(), rgb, baseSize: 100, owner: address }])
                      setWishText("")
                      setWishInput(false)
                      charStoppedRef.current = false
                      setCharHovered(false)
                    }}
                    disabled={!wishText.trim() || !isConnected}
                    style={{
                      fontFamily:     "'Righteous', cursive",
                      fontSize:       "11px",
                      letterSpacing:  "0.1em",
                      color:          wishText.trim() && isConnected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.25)",
                      background:     "none",
                      border:         "none",
                      cursor:         wishText.trim() && isConnected ? "pointer" : "default",
                      padding:        "4px 8px",
                      transition:     "color 0.2s",
                      opacity:        wishText.trim() && isConnected ? 1 : 0.4,
                    }}
                  >
                    Share
                  </button>
                </div>
                {!isConnected && (
                  <p
                    onClick={() => onConnectWallet?.()}
                    style={{
                      fontFamily:    "'Righteous', cursive",
                      fontSize:      "9px",
                      color:         "rgba(255,220,180,0.6)",
                      textAlign:     "center",
                      marginTop:     "8px",
                      cursor:        "pointer",
                      letterSpacing: "0.04em",
                      transition:    "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,220,180,1)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,220,180,0.6)" }}
                  >
                    Connect wallet to share →
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Direction flip wrapper */}
        <div ref={flipRef} style={{ transform: "scaleX(1)", transformOrigin: "center center" }}>
          <svg
            ref={charRef}
            width="140" height="60" viewBox="0 0 42 16"
            style={{ display: "block", imageRendering: "pixelated" }}
          >
            {/* === Comet Trail — long dense sparkling tail === */}
            {/* Extreme far — barely visible dust */}
            <rect x="-20" y="10" width="1" height="1" fill="#ffee88" opacity="0.03" style={{ animation: "star-twinkle 1.5s ease-in-out infinite" }}/>
            <rect x="-18" y="11" width="1" height="1" fill="#ffdd44" opacity="0.04" style={{ animation: "star-twinkle 1.2s 0.8s ease-in-out infinite" }}/>
            <rect x="-16" y="9" width="1" height="1" fill="#ffcc44" opacity="0.04" style={{ animation: "star-twinkle 1.4s 0.3s ease-in-out infinite" }}/>
            <rect x="-15" y="11" width="1" height="1" fill="#ffee66" opacity="0.05" style={{ animation: "star-twinkle 1.1s 0.6s ease-in-out infinite" }}/>
            <rect x="-14" y="10" width="1" height="1" fill="#ffe088" opacity="0.05" style={{ animation: "star-twinkle 1.3s ease-in-out infinite" }}/>
            <rect x="-13" y="12" width="1" height="1" fill="#ffdd44" opacity="0.05" style={{ animation: "star-twinkle 0.9s 0.4s ease-in-out infinite" }}/>
            <rect x="-12" y="9" width="1" height="1" fill="#ffee88" opacity="0.06" style={{ animation: "star-twinkle 1.2s 0.7s ease-in-out infinite" }}/>
            <rect x="-11" y="11" width="1" height="1" fill="#ffcc44" opacity="0.06" style={{ animation: "star-twinkle 1s 0.2s ease-in-out infinite" }}/>
            <rect x="-10" y="10" width="1" height="1" fill="#ffdd66" opacity="0.07" style={{ animation: "star-twinkle 1.4s 0.5s ease-in-out infinite" }}/>
            {/* Far tail */}
            <rect x="-9" y="11" width="1" height="1" fill="#ffee88" opacity="0.07" style={{ animation: "star-twinkle 1.1s 0.1s ease-in-out infinite" }}/>
            <rect x="-8" y="9" width="1" height="1" fill="#ffee88" opacity="0.08" style={{ animation: "star-twinkle 1.3s ease-in-out infinite" }}/>
            <rect x="-8" y="11" width="1" height="1" fill="#ffdd44" opacity="0.07" style={{ animation: "star-twinkle 0.9s 0.7s ease-in-out infinite" }}/>
            <rect x="-7" y="10" width="1" height="1" fill="#ffcc44" opacity="0.08" style={{ animation: "star-twinkle 1.1s 0.3s ease-in-out infinite" }}/>
            <rect x="-6" y="12" width="1" height="1" fill="#ffe088" opacity="0.08" style={{ animation: "star-twinkle 1.4s 0.1s ease-in-out infinite" }}/>
            <rect x="-5" y="9" width="1" height="1" fill="#ffee88" opacity="0.09" style={{ animation: "star-twinkle 0.8s 0.5s ease-in-out infinite" }}/>
            <rect x="-4" y="11" width="1" height="1" fill="#ffdd66" opacity="0.1" style={{ animation: "star-twinkle 1.2s 0.2s ease-in-out infinite" }}/>
            <rect x="-3" y="10" width="1" height="1" fill="#ffcc44" opacity="0.1" style={{ animation: "star-twinkle 1s 0.6s ease-in-out infinite" }}/>
            <rect x="-2" y="11" width="1" height="1" fill="#ffee88" opacity="0.12" style={{ animation: "star-twinkle 1.1s 0.4s ease-in-out infinite" }}/>
            <rect x="-1" y="9" width="1" height="1" fill="#ffdd44" opacity="0.13" style={{ animation: "star-twinkle 0.9s ease-in-out infinite" }}/>
            <rect x="-1" y="11" width="1" height="1" fill="#ffcc88" opacity="0.12" style={{ animation: "star-twinkle 1.3s 0.3s ease-in-out infinite" }}/>
            {/* Mid-far */}
            <rect x="0" y="10" width="1" height="1" fill="#ffee66" opacity="0.15" style={{ animation: "star-twinkle 1s 0.1s ease-in-out infinite" }}/>
            <rect x="0" y="12" width="1" height="1" fill="#ffdd44" opacity="0.13" style={{ animation: "star-twinkle 1.2s 0.5s ease-in-out infinite" }}/>
            <rect x="1" y="9" width="1" height="1" fill="#ffe088" opacity="0.16" style={{ animation: "star-twinkle 0.8s 0.2s ease-in-out infinite" }}/>
            <rect x="1" y="11" width="1" height="1" fill="#ffee88" opacity="0.18" style={{ animation: "star-twinkle 1.1s 0.7s ease-in-out infinite" }}/>
            <rect x="2" y="10" width="1" height="1" fill="#ffdd66" opacity="0.18" style={{ animation: "star-twinkle 1s 0.4s ease-in-out infinite" }}/>
            <rect x="2" y="12" width="1" height="1" fill="#ffcc44" opacity="0.16" style={{ animation: "star-twinkle 1.3s 0.1s ease-in-out infinite" }}/>
            <rect x="3" y="9" width="1" height="1" fill="#ffee88" opacity="0.2" style={{ animation: "star-twinkle 0.9s 0.6s ease-in-out infinite" }}/>
            <rect x="3" y="11" width="2" height="1" fill="#ffdd44" opacity="0.22" style={{ animation: "star-twinkle 1.2s 0.3s ease-in-out infinite" }}/>
            {/* Mid */}
            <rect x="4" y="10" width="1" height="1" fill="#ffe088" opacity="0.24" style={{ animation: "star-twinkle 1s ease-in-out infinite" }}/>
            <rect x="4" y="12" width="1" height="1" fill="#ffcc44" opacity="0.2" style={{ animation: "star-twinkle 1.1s 0.5s ease-in-out infinite" }}/>
            <rect x="5" y="9" width="1" height="1" fill="#ffee66" opacity="0.28" style={{ animation: "star-twinkle 0.8s 0.2s ease-in-out infinite" }}/>
            <rect x="5" y="11" width="2" height="1" fill="#ffdd66" opacity="0.3" style={{ animation: "star-twinkle 1.3s 0.4s ease-in-out infinite" }}/>
            <rect x="6" y="10" width="1" height="1" fill="#ffee88" opacity="0.32" style={{ animation: "star-twinkle 1s 0.1s ease-in-out infinite" }}/>
            <rect x="7" y="9" width="1" height="1" fill="#ffdd44" opacity="0.35" style={{ animation: "star-twinkle 0.9s 0.6s ease-in-out infinite" }}/>
            <rect x="7" y="11" width="2" height="1" fill="#ffee88" opacity="0.36" style={{ animation: "star-twinkle 1.1s 0.3s ease-in-out infinite" }}/>
            {/* Near */}
            <rect x="8" y="10" width="2" height="1" fill="#ffe066" opacity="0.4"/>
            <rect x="8" y="12" width="1" height="1" fill="#ffcc44" opacity="0.35" style={{ animation: "star-twinkle 1.2s 0.2s ease-in-out infinite" }}/>
            <rect x="9" y="9" width="1" height="1" fill="#ffee88" opacity="0.42" style={{ animation: "star-twinkle 1s 0.5s ease-in-out infinite" }}/>
            <rect x="10" y="10" width="2" height="1" fill="#ffdd66" opacity="0.48"/>
            <rect x="10" y="11" width="2" height="1" fill="#ffee88" opacity="0.5"/>
            <rect x="11" y="9" width="1" height="1" fill="#ffe088" opacity="0.45"/>
            {/* Close — brightest */}
            <rect x="12" y="10" width="2" height="2" fill="#ffee88" opacity="0.6"/>
            <rect x="12" y="9" width="1" height="1" fill="#ffdd44" opacity="0.55"/>
            <rect x="12" y="12" width="1" height="1" fill="#ffcc44" opacity="0.5"/>
            <rect x="13" y="9" width="1" height="1" fill="#ffee66" opacity="0.6"/>

            {/* Star body — glowing */}
            <rect x="14" y="9" width="6" height="3" fill="#ffee88"/>
            <rect x="15" y="8" width="4" height="1" fill="#ffdd44"/>
            <rect x="15" y="12" width="4" height="1" fill="#ffcc44"/>
            <rect x="13" y="10" width="1" height="1" fill="#ffdd66"/>
            <rect x="20" y="10" width="1" height="1" fill="#fff4aa"/>
            {/* Star core highlight */}
            <rect x="16" y="9" width="2" height="2" fill="#fffbe0"/>

            {/* === Rider — sitting on star === */}
            {/* Head */}
            <rect x="16" y="3" width="4" height="1" fill="#f8d8b8"/>
            <rect x="15" y="4" width="6" height="1" fill="#f8d8b8"/>
            <rect x="15" y="5" width="6" height="2" fill="#f8d8b8"/>
            {/* Eyes */}
            <rect x="16" y="4" width="1" height="1" fill="#2a1a40"/>
            <rect x="19" y="4" width="1" height="1" fill="#2a1a40"/>
            {/* Blush */}
            <rect x="15" y="5" width="1" height="1" fill="#ffaaaa" opacity="0.5"/>
            <rect x="20" y="5" width="1" height="1" fill="#ffaaaa" opacity="0.5"/>
            {/* Smile */}
            <rect x="17" y="6" width="2" height="1" fill="#d88878"/>
            {/* Hair */}
            <rect x="15" y="2" width="6" height="1" fill="#5c3d1a"/>
            <rect x="16" y="1" width="4" height="1" fill="#5c3d1a"/>
            {/* Ahoge */}
            <rect x="19" y="0" width="1" height="1" fill="#5c3d1a"/>

            {/* Body — cape/robe */}
            <rect x="15" y="7" width="6" height="2" fill="#5577cc"/>
            <rect x="16" y="7" width="4" height="1" fill="#6688dd"/>
            {/* Cape flowing behind */}
            <rect x="13" y="6" width="2" height="2" fill="#5577cc" opacity="0.7"/>
            <rect x="12" y="5" width="1" height="2" fill="#4466aa" opacity="0.5"/>

            {/* Arms — one holding star edge, one reaching forward */}
            <rect x="21" y="7" width="1" height="2" fill="#f8d8b8"/>
            <rect x="14" y="7" width="1" height="1" fill="#f8d8b8"/>

            {/* +1 sparkle above rider */}
            <rect x="22" y="3" width="1" height="1" fill="#ffee88" style={{ animation: "star-twinkle 1.5s ease-in-out infinite" }}/>
            <rect x="24" y="5" width="1" height="1" fill="#aaccff" style={{ animation: "star-twinkle 2s 0.5s ease-in-out infinite" }}/>
          </svg>
        </div>
      </div>
      </>}
    </div>
  )
}
