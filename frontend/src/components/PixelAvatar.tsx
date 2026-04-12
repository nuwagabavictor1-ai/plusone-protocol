"use client"

// 77 pixel avatars: 11 character types × 7 color variants
// Each rendered as a 10x12 pixel SVG grid

const COLOR_PALETTES = [
  { primary: "#5577cc", secondary: "#4466aa", accent: "#ffcc44" }, // blue
  { primary: "#cc5544", secondary: "#aa3333", accent: "#ffdd66" }, // red
  { primary: "#55aa77", secondary: "#448866", accent: "#ffe088" }, // green
  { primary: "#aa55aa", secondary: "#884488", accent: "#ffaadd" }, // purple
  { primary: "#dd8833", secondary: "#bb6622", accent: "#fff088" }, // orange
  { primary: "#5599aa", secondary: "#447788", accent: "#aaeeff" }, // teal
  { primary: "#aa5566", secondary: "#884455", accent: "#ffbbcc" }, // rose
  { primary: "#44bb88", secondary: "#339966", accent: "#ddffcc" }, // mint
  { primary: "#cc7744", secondary: "#aa5533", accent: "#ffeedd" }, // copper
  { primary: "#6666cc", secondary: "#5555aa", accent: "#ccccff" }, // indigo
  { primary: "#cc44aa", secondary: "#aa3388", accent: "#ffccee" }, // magenta
  { primary: "#88aa44", secondary: "#669933", accent: "#eeffaa" }, // lime
  { primary: "#bb6688", secondary: "#994466", accent: "#ffddee" }, // mauve
  { primary: "#4488aa", secondary: "#336688", accent: "#bbddff" }, // steel
]

type CharType = "wizard" | "knight" | "cat" | "robot" | "ghost" | "alien" | "fairy" | "pirate" | "ninja" | "astro" | "jester"

const CHAR_TYPES: CharType[] = ["wizard", "knight", "cat", "robot", "ghost", "alien", "fairy", "pirate", "ninja", "astro", "jester"]

// Generate all 154 avatar IDs (11 types × 14 colors), shuffled deterministically
export const ALL_AVATARS = CHAR_TYPES.flatMap((type, ti) =>
  COLOR_PALETTES.map((_, ci) => ({ id: ti * 14 + ci, type, colorIdx: ci }))
)

function hashByte(address: string, idx: number): number {
  const hex = address.replace("0x", "").toLowerCase()
  const c1 = parseInt(hex[(idx * 2) % hex.length] || "0", 16)
  const c2 = parseInt(hex[(idx * 2 + 1) % hex.length] || "0", 16)
  return (c1 * 16 + c2) % 256
}

interface PixelAvatarProps {
  address?: string   // auto-generate from address
  avatarId?: number  // or use specific preset (0-76)
  size?: number
}

export function PixelAvatar({ address, avatarId, size = 48 }: PixelAvatarProps) {
  let type: CharType
  let palette: typeof COLOR_PALETTES[0]

  if (avatarId != null && avatarId >= 0 && avatarId < 154) {
    type = CHAR_TYPES[Math.floor(avatarId / 14)]
    palette = COLOR_PALETTES[avatarId % 14]
  } else if (address) {
    type = CHAR_TYPES[hashByte(address, 0) % CHAR_TYPES.length]
    palette = COLOR_PALETTES[hashByte(address, 1) % COLOR_PALETTES.length]
  } else {
    type = "wizard"
    palette = COLOR_PALETTES[0]
  }

  const { primary, secondary, accent } = palette
  const skin = "#f8d8b8"

  return (
    <svg width={size} height={size} viewBox="0 0 10 12" style={{ imageRendering: "pixelated", display: "block" }}>
      {type === "wizard" && <>
        <rect x="4" y="0" width="2" height="1" fill={primary}/>
        <rect x="3" y="1" width="4" height="1" fill={primary}/>
        <rect x="2" y="2" width="6" height="1" fill={secondary}/>
        <rect x="3" y="2" width="4" height="1" fill={accent} opacity="0.5"/>
        <rect x="2" y="3" width="6" height="3" fill={skin}/>
        <rect x="3" y="3" width="1" height="1" fill="#1a1a2a"/>
        <rect x="6" y="3" width="1" height="1" fill="#1a1a2a"/>
        <rect x="4" y="5" width="2" height="1" fill="#d88878"/>
        <rect x="1" y="6" width="8" height="2" fill={primary}/>
        <rect x="4" y="6" width="2" height="1" fill={accent} opacity="0.5"/>
        <rect x="0" y="8" width="10" height="2" fill={secondary}/>
        <rect x="2" y="10" width="2" height="2" fill={secondary}/>
        <rect x="6" y="10" width="2" height="2" fill={secondary}/>
      </>}

      {type === "knight" && <>
        <rect x="2" y="0" width="6" height="2" fill="#888899"/>
        <rect x="3" y="0" width="4" height="1" fill="#aaaabb"/>
        <rect x="1" y="2" width="8" height="1" fill="#888899"/>
        <rect x="2" y="3" width="6" height="3" fill={skin}/>
        <rect x="3" y="3" width="1" height="1" fill="#1a1a2a"/>
        <rect x="6" y="3" width="1" height="1" fill="#1a1a2a"/>
        <rect x="4" y="5" width="2" height="1" fill="#d88878"/>
        <rect x="1" y="6" width="8" height="2" fill={primary}/>
        <rect x="4" y="7" width="2" height="1" fill={accent}/>
        <rect x="0" y="8" width="10" height="2" fill={secondary}/>
        <rect x="2" y="10" width="2" height="2" fill={primary}/>
        <rect x="6" y="10" width="2" height="2" fill={primary}/>
      </>}

      {type === "cat" && <>
        <rect x="1" y="0" width="2" height="2" fill={primary}/>
        <rect x="7" y="0" width="2" height="2" fill={primary}/>
        <rect x="1" y="2" width="8" height="1" fill={primary}/>
        <rect x="1" y="3" width="8" height="3" fill={primary}/>
        <rect x="3" y="3" width="1" height="1" fill="#2a2a2a"/>
        <rect x="6" y="3" width="1" height="1" fill="#2a2a2a"/>
        <rect x="4" y="4" width="2" height="1" fill="#ffaaaa"/>
        <rect x="3" y="5" width="1" height="1" fill={accent}/>
        <rect x="6" y="5" width="1" height="1" fill={accent}/>
        <rect x="2" y="6" width="6" height="2" fill={secondary}/>
        <rect x="2" y="8" width="6" height="2" fill={primary}/>
        <rect x="3" y="10" width="1" height="2" fill={secondary}/>
        <rect x="6" y="10" width="1" height="2" fill={secondary}/>
      </>}

      {type === "robot" && <>
        <rect x="4" y="0" width="2" height="1" fill={accent}/>
        <rect x="2" y="1" width="6" height="2" fill="#888899"/>
        <rect x="3" y="1" width="1" height="1" fill={accent}/>
        <rect x="6" y="1" width="1" height="1" fill={accent}/>
        <rect x="2" y="3" width="6" height="3" fill="#aaaabb"/>
        <rect x="3" y="3" width="1" height="1" fill={primary}/>
        <rect x="6" y="3" width="1" height="1" fill={primary}/>
        <rect x="4" y="5" width="2" height="1" fill="#666"/>
        <rect x="1" y="6" width="8" height="2" fill={primary}/>
        <rect x="0" y="8" width="10" height="2" fill={secondary}/>
        <rect x="2" y="10" width="2" height="2" fill="#888899"/>
        <rect x="6" y="10" width="2" height="2" fill="#888899"/>
      </>}

      {type === "ghost" && <>
        <rect x="2" y="0" width="6" height="1" fill="white" opacity="0.9"/>
        <rect x="1" y="1" width="8" height="5" fill="white" opacity="0.85"/>
        <rect x="3" y="2" width="1" height="2" fill={primary}/>
        <rect x="6" y="2" width="1" height="2" fill={primary}/>
        <rect x="4" y="5" width="2" height="1" fill="#aaa" opacity="0.5"/>
        <rect x="1" y="6" width="8" height="3" fill="white" opacity="0.8"/>
        <rect x="1" y="9" width="2" height="2" fill="white" opacity="0.7"/>
        <rect x="4" y="9" width="2" height="2" fill="white" opacity="0.7"/>
        <rect x="7" y="9" width="2" height="2" fill="white" opacity="0.7"/>
        <rect x="3" y="10" width="1" height="1" fill="transparent"/>
        <rect x="6" y="10" width="1" height="1" fill="transparent"/>
      </>}

      {type === "alien" && <>
        <rect x="1" y="0" width="8" height="1" fill={primary}/>
        <rect x="0" y="1" width="10" height="3" fill={primary}/>
        <rect x="2" y="1" width="2" height="2" fill="#111"/>
        <rect x="6" y="1" width="2" height="2" fill="#111"/>
        <rect x="3" y="1" width="1" height="1" fill={accent}/>
        <rect x="7" y="1" width="1" height="1" fill={accent}/>
        <rect x="4" y="3" width="2" height="1" fill={secondary}/>
        <rect x="2" y="4" width="6" height="2" fill={secondary}/>
        <rect x="1" y="6" width="8" height="3" fill={primary}/>
        <rect x="2" y="9" width="2" height="2" fill={secondary}/>
        <rect x="6" y="9" width="2" height="2" fill={secondary}/>
      </>}

      {type === "fairy" && <>
        <rect x="3" y="0" width="4" height="1" fill={accent}/>
        <rect x="2" y="1" width="6" height="2" fill={skin}/>
        <rect x="0" y="2" width="2" height="3" fill={accent} opacity="0.4"/>
        <rect x="8" y="2" width="2" height="3" fill={accent} opacity="0.4"/>
        <rect x="3" y="1" width="1" height="1" fill={primary}/>
        <rect x="6" y="1" width="1" height="1" fill={primary}/>
        <rect x="2" y="3" width="6" height="2" fill={skin}/>
        <rect x="4" y="4" width="2" height="1" fill="#e8a090"/>
        <rect x="1" y="5" width="8" height="3" fill={primary}/>
        <rect x="4" y="5" width="2" height="1" fill={accent} opacity="0.4"/>
        <rect x="1" y="8" width="8" height="2" fill={secondary}/>
        <rect x="3" y="10" width="2" height="2" fill={skin}/>
        <rect x="5" y="10" width="2" height="2" fill={skin}/>
      </>}

      {type === "pirate" && <>
        <rect x="1" y="0" width="8" height="2" fill="#222"/>
        <rect x="2" y="0" width="6" height="1" fill={primary}/>
        <rect x="4" y="0" width="2" height="1" fill={accent}/>
        <rect x="2" y="2" width="6" height="4" fill={skin}/>
        <rect x="3" y="2" width="2" height="2" fill="#111"/>
        <rect x="6" y="2" width="1" height="1" fill="#1a1a2a"/>
        <rect x="4" y="5" width="3" height="1" fill="#d88878"/>
        <rect x="1" y="6" width="8" height="2" fill={primary}/>
        <rect x="0" y="8" width="10" height="2" fill={secondary}/>
        <rect x="2" y="10" width="2" height="2" fill="#222"/>
        <rect x="6" y="10" width="2" height="2" fill="#222"/>
      </>}

      {type === "ninja" && <>
        <rect x="2" y="0" width="6" height="3" fill="#222"/>
        <rect x="3" y="1" width="4" height="1" fill={primary}/>
        <rect x="3" y="2" width="1" height="1" fill="white"/>
        <rect x="6" y="2" width="1" height="1" fill="white"/>
        <rect x="2" y="3" width="6" height="2" fill="#222"/>
        <rect x="7" y="3" width="2" height="1" fill="#222"/>
        <rect x="1" y="5" width="8" height="3" fill={primary}/>
        <rect x="4" y="5" width="2" height="1" fill={accent} opacity="0.3"/>
        <rect x="0" y="8" width="10" height="2" fill={secondary}/>
        <rect x="2" y="10" width="2" height="2" fill="#222"/>
        <rect x="6" y="10" width="2" height="2" fill="#222"/>
      </>}

      {type === "astro" && <>
        <rect x="2" y="0" width="6" height="1" fill="white" opacity="0.9"/>
        <rect x="1" y="1" width="8" height="4" fill="white" opacity="0.85"/>
        <rect x="2" y="1" width="6" height="3" fill="#aaddff" opacity="0.3"/>
        <rect x="3" y="2" width="1" height="1" fill="#222"/>
        <rect x="6" y="2" width="1" height="1" fill="#222"/>
        <rect x="4" y="4" width="2" height="1" fill="#ccc"/>
        <rect x="1" y="5" width="8" height="3" fill={primary}/>
        <rect x="4" y="5" width="2" height="1" fill={accent}/>
        <rect x="0" y="8" width="10" height="2" fill={secondary}/>
        <rect x="2" y="10" width="2" height="2" fill="white" opacity="0.8"/>
        <rect x="6" y="10" width="2" height="2" fill="white" opacity="0.8"/>
      </>}

      {type === "jester" && <>
        <rect x="1" y="0" width="3" height="1" fill={primary}/>
        <rect x="6" y="0" width="3" height="1" fill={accent}/>
        <rect x="2" y="1" width="2" height="1" fill={primary}/>
        <rect x="6" y="1" width="2" height="1" fill={accent}/>
        <rect x="2" y="2" width="6" height="1" fill={primary}/>
        <rect x="2" y="3" width="6" height="3" fill={skin}/>
        <rect x="3" y="3" width="1" height="1" fill="#1a1a2a"/>
        <rect x="6" y="3" width="1" height="1" fill="#1a1a2a"/>
        <rect x="3" y="5" width="4" height="1" fill="#d88878"/>
        <rect x="1" y="6" width="4" height="2" fill={primary}/>
        <rect x="5" y="6" width="4" height="2" fill={accent}/>
        <rect x="0" y="8" width="5" height="2" fill={secondary}/>
        <rect x="5" y="8" width="5" height="2" fill={accent}/>
        <rect x="2" y="10" width="2" height="2" fill={primary}/>
        <rect x="6" y="10" width="2" height="2" fill={accent}/>
      </>}
    </svg>
  )
}
