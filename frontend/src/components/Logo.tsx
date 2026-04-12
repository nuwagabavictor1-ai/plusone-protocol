"use client"

import { useRouter } from "next/navigation"

export function Logo() {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push("/")}
      style={{
        position: "fixed",
        top: "20px",
        left: "24px",
        zIndex: 20,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      {/* Pixel comet + star core + pixel +1 */}
      <svg width="120" height="40" viewBox="0 0 60 20" style={{ imageRendering: "pixelated" }}>
        {/* ── Comet tail (pixel blocks, fading in) ── */}
        <rect x="0" y="9" width="2" height="2" fill="#ffdd66" opacity="0.12"/>
        <rect x="3" y="8" width="2" height="3" fill="#ffdd66" opacity="0.2"/>
        <rect x="6" y="8" width="3" height="4" fill="#ffcc44" opacity="0.3"/>
        <rect x="10" y="7" width="3" height="5" fill="#ffcc44" opacity="0.45"/>

        {/* ── Star core (4-point pixel star, bright) ── */}
        <rect x="15" y="4" width="2" height="2" fill="#ffee88" opacity="0.5"/>
        <rect x="14" y="6" width="4" height="2" fill="#ffee88" opacity="0.75"/>
        <rect x="13" y="8" width="6" height="3" fill="#ffee88"/>
        <rect x="15" y="8" width="2" height="3" fill="#fffbe8"/>
        <rect x="14" y="11" width="4" height="2" fill="#ffee88" opacity="0.75"/>
        <rect x="15" y="13" width="2" height="2" fill="#ffee88" opacity="0.5"/>
        {/* Horizontal star arms */}
        <rect x="11" y="8" width="2" height="3" fill="#ffee88" opacity="0.6"/>
        <rect x="19" y="8" width="2" height="3" fill="#ffee88" opacity="0.6"/>

        {/* ── Sparkle pixels ── */}
        <rect x="22" y="3" width="1" height="1" fill="#ffee88" opacity="0.5"/>
        <rect x="21" y="13" width="1" height="1" fill="#ffdd66" opacity="0.35"/>
        <rect x="23" y="8" width="1" height="1" fill="#ffee88" opacity="0.3"/>

        {/* ── "+1" pixel text ── */}
        {/* Plus sign */}
        <rect x="28" y="5" width="2" height="9" fill="#ffdd44"/>
        <rect x="25" y="8" width="8" height="3" fill="#ffdd44"/>
        {/* Bright center */}
        <rect x="28" y="8" width="2" height="3" fill="#ffee88"/>
        <rect x="27" y="9" width="4" height="1" fill="#ffee88"/>

        {/* Number 1 */}
        <rect x="36" y="5" width="3" height="9" fill="#ffdd44"/>
        <rect x="35" y="6" width="1" height="2" fill="#ffdd44"/>
        <rect x="34" y="13" width="6" height="1" fill="#ffdd44"/>
        {/* Bright edge */}
        <rect x="37" y="5" width="1" height="9" fill="#ffee88"/>
      </svg>
    </div>
  )
}
