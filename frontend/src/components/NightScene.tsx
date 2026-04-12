"use client"

import { useRef, useEffect, useState } from "react"

// Deterministic star positions — golden ratio distribution, no hydration mismatch
const STARS = Array.from({ length: 110 }, (_, i) => ({
  id:  i,
  cx:  `${((i * 137.508) % 100).toFixed(2)}%`,
  cy:  `${((i * 97.31)   % 75).toFixed(2)}%`,
  r:   (0.45 + (i % 4) * 0.48).toFixed(1),
  dur: `${(1.6 + (i % 6) * 0.65).toFixed(1)}s`,
  del: `${((i * 0.41)    % 5.5).toFixed(2)}s`,
  op:  (0.18 + (i % 8) * 0.1).toFixed(2),
}))

// 7 wishes — what to do after collecting 1 USDC from everyone
const WISHES = [
  { left: "6%",   top: "12%",  size: 130, rgb: "255,148,72",  icon: "🧡", text: "give orphan kids\na happy childhood" },
  { left: "48%",  top: "2%",   size: 115, rgb: "255,218,55",  icon: "🌟", text: "help mountain kids\nsee the world" },
  { left: "86%",  top: "14%",  size: 122, rgb: "75,205,118",  icon: "🐾", text: "build a shelter\nfor stray animals" },
  { left: "1%",   top: "46%",  size: 110, rgb: "168,120,255", icon: "🎵", text: "let indie artists\nkeep creating" },
  { left: "89%",  top: "44%",  size: 120, rgb: "78,162,255",  icon: "💙", text: "travel the world\nwith a lonely elder" },
  { left: "19%",  top: "72%",  size: 115, rgb: "95,228,182",  icon: "🌱", text: "plant a forest\nin the desert" },
  { left: "75%",  top: "68%",  size: 128, rgb: "255,168,210", icon: "✨", text: "fund the next\nworld-changer" },
]

export function NightScene() {
  const [hoveredBubble, setHoveredBubble] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  hoveredRef.current = hoveredBubble

  // Character refs
  const posRef     = useRef<HTMLDivElement>(null)   // horizontal position wrapper
  const flipRef    = useRef<HTMLDivElement>(null)   // scaleX flip
  const charRef    = useRef<SVGSVGElement>(null)    // animation-play-state
  const thoughtRef = useRef<HTMLDivElement>(null)   // thought bubble

  // Wish bubble refs
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── Character: walk → stop & think → walk, plus walk-to-hovered-bubble ──
  useEffect(() => {
    const walk = { x: 50, dir: 1 as 1 | -1 }
    let thinking = false
    let walkAnim: number
    let thinkTimer: ReturnType<typeof setTimeout>

    const enterThink = () => {
      // Don't think while pursuing a bubble
      if (hoveredRef.current !== null) {
        thinkTimer = setTimeout(enterThink, 4000)
        return
      }
      thinking = true
      if (charRef.current)    charRef.current.style.animationPlayState = "paused"
      if (thoughtRef.current) {
        thoughtRef.current.style.opacity   = "1"
        thoughtRef.current.style.transform = "scale(1) translateY(0)"
      }
      thinkTimer = setTimeout(exitThink, 2800 + Math.random() * 2000)
    }

    const exitThink = () => {
      thinking = false
      if (charRef.current)    charRef.current.style.animationPlayState = "running"
      if (thoughtRef.current) {
        thoughtRef.current.style.opacity   = "0"
        thoughtRef.current.style.transform = "scale(0.92) translateY(4px)"
      }
      thinkTimer = setTimeout(enterThink, 7000 + Math.random() * 5000)
    }

    // First think after 3 seconds
    thinkTimer = setTimeout(enterThink, 3000)

    const tick = () => {
      // If hovering a bubble while thinking, snap out of think mode
      if (hoveredRef.current !== null && thinking) {
        thinking = false
        if (charRef.current)    charRef.current.style.animationPlayState = "running"
        if (thoughtRef.current) {
          thoughtRef.current.style.opacity   = "0"
          thoughtRef.current.style.transform = "scale(0.92) translateY(4px)"
        }
      }

      if (!thinking) {
        if (hoveredRef.current !== null) {
          // Walk toward hovered bubble
          const bubbleEl = bubbleRefs.current[hoveredRef.current]
          if (bubbleEl) {
            const rect    = bubbleEl.getBoundingClientRect()
            const targetX = rect.left + rect.width / 2 - 40
            const diff    = targetX - walk.x
            if (Math.abs(diff) > 4) {
              walk.dir = diff > 0 ? 1 : -1
              walk.x  += walk.dir * 0.95
            }
          }
        } else {
          // Normal bounce walk
          walk.x += walk.dir * 0.55
          const max = (typeof window !== "undefined" ? window.innerWidth : 400) - 110
          if (walk.x >= max) { walk.x = max; walk.dir = -1 }
          if (walk.x <= 30)  { walk.x = 30;  walk.dir = 1  }
        }

        if (posRef.current)  posRef.current.style.left      = `${walk.x}px`
        if (flipRef.current) flipRef.current.style.transform = walk.dir > 0 ? "scaleX(1)" : "scaleX(-1)"
      }
      walkAnim = requestAnimationFrame(tick)
    }

    walkAnim = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(walkAnim)
      clearTimeout(thinkTimer)
    }
  }, [])

  // ── Wish bubbles: gentle float + mouse proximity drift ──
  useEffect(() => {
    let animId: number
    let mx = typeof window !== "undefined" ? window.innerWidth  / 2 : 200
    let my = typeof window !== "undefined" ? window.innerHeight / 2 : 400

    const tick = () => {
      const t = Date.now()
      bubbleRefs.current.forEach((el, i) => {
        if (!el) return
        const rect  = el.getBoundingClientRect()
        const cx    = rect.left + rect.width  / 2
        const cy    = rect.top  + rect.height / 2
        const dx    = mx - cx
        const dy    = my - cy
        const dist  = Math.sqrt(dx * dx + dy * dy)
        const pull  = Math.max(0, 1 - dist / 280) * 0.11
        const period = (3.0 + i * 0.42) * 1000
        const phase  = i * 580
        const floatY = Math.sin(((t + phase) / period) * Math.PI * 2) * 6
        const scale  = hoveredRef.current === i ? 1.22 : 1
        el.style.transform = `translate(${dx * pull}px, ${dy * pull + floatY}px) scale(${scale})`
      })
      animId = requestAnimationFrame(tick)
    }

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }

    animId = requestAnimationFrame(tick)
    window.addEventListener("mousemove", onMove)
    return () => { cancelAnimationFrame(animId); window.removeEventListener("mousemove", onMove) }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">

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

        {/* Shooting star 1 */}
        <g style={{ animation: "shoot1 11s 1.5s linear infinite" }}>
          <line x1="18%" y1="20%" x2="30%" y2="28%" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="18%" cy="20%" r="2.5" fill="white" opacity="0.6"/>
        </g>
        {/* Shooting star 2 */}
        <g style={{ animation: "shoot2 16s 7s linear infinite" }}>
          <line x1="54%" y1="8%" x2="64%" y2="14%" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          <circle cx="54%" cy="8%" r="1.8" fill="white" opacity="0.5"/>
        </g>
      </svg>

      {/* ── Thin golden crescent moon (CSS two-circle trick) ── */}
      <div
        style={{
          position:     "absolute",
          right:        "16%",
          top:          "7%",
          width:        "44px",
          height:       "44px",
          borderRadius: "50%",
          background:   "#f0d060",
          opacity:      0.88,
          overflow:     "hidden",
          animation:    "moon-float 7s ease-in-out infinite",
        }}
      >
        {/* Inner circle offset to create thin crescent — matches sky bg color */}
        <div style={{
          position:     "absolute",
          top:          "-4px",
          left:         "6px",
          width:        "42px",
          height:       "42px",
          borderRadius: "50%",
          background:   "#040f1c",
        }}/>
      </div>

      {/* ── 7 Wish Bubbles (more translucent) ── */}
      {WISHES.map((w, i) => (
        <div
          key={i}
          ref={el => { bubbleRefs.current[i] = el }}
          className="absolute pointer-events-auto"
          style={{
            color:          `rgb(${w.rgb})`,
            left:           w.left,
            top:            w.top,
            width:          w.size,
            height:         w.size,
            borderRadius:   "50%",
            background:     "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.28) 30%, rgba(255,255,255,0.11) 70%, rgba(255,255,255,0.02) 100%)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "default",
            animation:      `border-flicker 2.4s ${i * 0.35}s ease-in-out infinite`,
          }}
          onMouseEnter={() => {
            setHoveredBubble(i)
            const el = bubbleRefs.current[i]
            if (!el) return
            const icon = el.querySelector("[data-role='icon']") as HTMLElement
            const text = el.querySelector("[data-role='text']") as HTMLElement
            if (icon) icon.style.opacity = "0"
            if (text) { text.style.opacity = "1"; text.style.transform = "translateY(0)" }
          }}
          onMouseLeave={() => {
            setHoveredBubble(null)
            const el = bubbleRefs.current[i]
            if (!el) return
            const icon = el.querySelector("[data-role='icon']") as HTMLElement
            const text = el.querySelector("[data-role='text']") as HTMLElement
            if (icon) icon.style.opacity = "0.85"
            if (text) { text.style.opacity = "0"; text.style.transform = "translateY(5px)" }
          }}
        >
          {/* Icon */}
          <span
            data-role="icon"
            style={{
              fontSize:   `${Math.round(w.size * 0.26)}px`,
              lineHeight:  1,
              position:   "absolute",
              opacity:    0.9,
              transition: "opacity 0.22s",
            }}
          >
            {w.icon}
          </span>

          {/* Wish text — bold Caveat, colorful, revealed on hover */}
          <p
            data-role="text"
            style={{
              fontFamily:    "'Caveat', cursive",
              fontSize:      "15px",
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
              transition:    "opacity 0.22s, transform 0.26s",
              pointerEvents: "none",
            }}
          >
            {w.text}
          </p>
        </div>
      ))}

      {/* ── Walking Character ── */}
      <div
        ref={posRef}
        style={{
          position:      "absolute",
          bottom:        0,
          left:          "50px",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
        }}
      >
        {/* Thought bubble */}
        <div
          ref={thoughtRef}
          style={{
            marginBottom: "2px",
            opacity:      0,
            transform:    "scale(0.92) translateY(4px)",
            transition:   "opacity 0.45s ease-out, transform 0.45s ease-out",
          }}
        >
          <div style={{
            background:   "rgba(255,255,255,0.05)",
            border:       "1px solid rgba(255,255,255,0.10)",
            borderRadius: "16px",
            padding:      "9px 13px",
            maxWidth:     "190px",
            textAlign:    "center",
          }}>
            <p style={{
              fontSize:      "9.5px",
              color:         "rgba(255,255,255,0.58)",
              lineHeight:    1.75,
              letterSpacing: "0.04em",
            }}>
              if everyone gave me 1 USDC... what would I do?
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "3px", paddingTop: "4px" }}>
            {[7, 5, 3].map((sz, j) => (
              <div key={j} style={{
                width:      sz,
                height:     sz,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                border:     "1px solid rgba(255,255,255,0.10)",
                marginTop:  j * 2,
              }}/>
            ))}
          </div>
        </div>

        {/* Direction flip wrapper */}
        <div ref={flipRef} style={{ transform: "scaleX(1)", transformOrigin: "center bottom" }}>
          {/*
            Chibi character — big head, small body, periwinkle hoodie.
            Legs pivot at hip joints (28,76) and (52,76).
            Arms pivot at shoulder joints (16,54) and (64,54).
          */}
          <svg
            ref={charRef}
            width="80" height="112" viewBox="0 0 80 112"
            style={{ display: "block" }}
          >
            {/* Ground shadow */}
            <ellipse cx="40" cy="110" rx="21" ry="3" fill="rgba(255,255,255,0.04)"/>

            {/* Left leg */}
            <g className="char-leg-l">
              <path d="M 28 76 Q 22 90 18 106" stroke="#8890aa" strokeWidth="9" strokeLinecap="round" fill="none"/>
              <ellipse cx="15" cy="106" rx="10" ry="4.5" fill="#5555a0"/>
            </g>

            {/* Right leg */}
            <g className="char-leg-r">
              <path d="M 52 76 Q 58 90 62 106" stroke="#8890aa" strokeWidth="9" strokeLinecap="round" fill="none"/>
              <ellipse cx="65" cy="106" rx="10" ry="4.5" fill="#5555a0"/>
            </g>

            {/* Body — chibi hoodie (periwinkle/lavender) */}
            <path
              d="M 14 50 Q 11 78 16 78 Q 40 84 64 78 Q 69 78 66 50 Q 52 44 40 44 Q 28 44 14 50Z"
              fill="#b8a8e0"
            />
            {/* Hood/collar rim (darker) */}
            <path
              d="M 14 50 Q 18 41 28 39 Q 40 37 52 39 Q 62 41 66 50 Q 57 35 40 35 Q 23 35 14 50Z"
              fill="#a898d0"
            />
            {/* Kangaroo pocket */}
            <path d="M 26 60 Q 40 66 54 60 Q 52 72 40 73 Q 28 72 26 60Z" fill="#a898d0"/>
            {/* Small star on pocket */}
            <text x="38" y="68" fontSize="7" fill="rgba(255,255,255,0.5)" textAnchor="middle">★</text>

            {/* Left arm */}
            <g className="char-arm-l">
              <path d="M 16 54 Q 8 66 5 76" stroke="#b8a8e0" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <circle cx="5" cy="78" r="5.5" fill="#f5e8de"/>
            </g>

            {/* Right arm */}
            <g className="char-arm-r">
              <path d="M 64 54 Q 72 66 75 76" stroke="#b8a8e0" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <circle cx="75" cy="78" r="5.5" fill="#f5e8de"/>
            </g>

            {/* Neck */}
            <rect x="34" y="42" width="12" height="7" rx="4" fill="#f5e8de"/>

            {/* Head (big chibi head) */}
            <circle cx="40" cy="24" r="22" fill="#f5e8de"/>

            {/* Hair — layered bangs */}
            <path
              d="M 20 19 Q 22 2 40 2 Q 58 2 60 19 Q 54 6 40 7 Q 26 6 20 19Z"
              fill="#3a2510"
            />
            {/* Side hair pieces */}
            <path d="M 20 19 Q 15 26 17 32 Q 20 25 22 21Z" fill="#3a2510"/>
            <path d="M 60 19 Q 65 26 63 32 Q 60 25 58 21Z" fill="#3a2510"/>
            {/* Ahoge — single wisp pointing up */}
            <path d="M 40 2 Q 43 -5 45 -1" stroke="#3a2510" strokeWidth="2.2" strokeLinecap="round" fill="none"/>

            {/* Eyes — big oval eyes with purple iris */}
            <ellipse cx="31" cy="23" rx="7" ry="7.5" fill="white"/>
            <ellipse cx="49" cy="23" rx="7" ry="7.5" fill="white"/>
            {/* Iris */}
            <ellipse cx="31" cy="24" rx="5" ry="5.5" fill="#7060b0"/>
            <ellipse cx="49" cy="24" rx="5" ry="5.5" fill="#7060b0"/>
            {/* Pupil */}
            <ellipse cx="31" cy="25" rx="3.2" ry="3.8" fill="#1a0a28"/>
            <ellipse cx="49" cy="25" rx="3.2" ry="3.8" fill="#1a0a28"/>
            {/* Shine */}
            <circle cx="33" cy="22" r="1.6" fill="white"/>
            <circle cx="51" cy="22" r="1.6" fill="white"/>
            <circle cx="32" cy="27" r="0.8" fill="white"/>
            <circle cx="50" cy="27" r="0.8" fill="white"/>
            {/* Eyelashes (upper arc) */}
            <path d="M 25 17 Q 28 14 31 15" stroke="#3a2510" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            <path d="M 43 17 Q 46 14 49 15" stroke="#3a2510" strokeWidth="1.2" strokeLinecap="round" fill="none"/>

            {/* Eyebrows */}
            <path d="M 24 13 Q 31 10 37 12" stroke="#3a2510" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M 43 12 Q 49 10 56 13" stroke="#3a2510" strokeWidth="2" strokeLinecap="round" fill="none"/>

            {/* Nose (tiny) */}
            <circle cx="40" cy="30" r="1.2" fill="#e0b8a0" opacity="0.7"/>

            {/* Mouth — small happy smile */}
            <path d="M 35 35 Q 40 39 45 35" stroke="#d89080" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

            {/* Blush */}
            <ellipse cx="23" cy="31" rx="7" ry="4" fill="#ffaabb" opacity="0.38"/>
            <ellipse cx="57" cy="31" rx="7" ry="4" fill="#ffaabb" opacity="0.38"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
