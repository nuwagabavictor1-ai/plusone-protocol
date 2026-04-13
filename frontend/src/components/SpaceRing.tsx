"use client"

/**
 * SpaceRing — full-viewport elliptical ring that frames the homepage like a space station porthole.
 * Pure CSS, no Canvas, no physics. pointer-events: none.
 */
export function SpaceRing() {
  return (
    <div className="space-ring-container">
      {/* Main ring — ellipse that overflows the viewport, only edges visible */}
      <div className="space-ring" />

      {/* Inner subtle glow ring */}
      <div className="space-ring-inner" />

      {/* Gold coins orbiting along the ring */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="space-ring-coin"
          style={{
            animationDelay: `${-i * 10}s`,
          }}
        />
      ))}
    </div>
  )
}
