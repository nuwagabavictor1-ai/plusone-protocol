# +1 User Guide

## What is +1?

+1 is an attention protocol on Base. Every $1 USDC transfer is a "+1" — a way to say "I see you." Users publish their dreams, and the community supports them with $1 at a time.

---

## Getting Started

### 1. Visit the Homepage

The homepage features a starry sky with floating dream bubbles, a comet-riding character, three wealth gods (Caishen, Ganesha, Hermes), and the Dream Pool.

### 2. Connect Your Wallet

Click the **Wallet Sprite** (top-right corner) or any action that requires a wallet. Supported wallets:
- MetaMask
- OKX Wallet
- Coinbase Wallet
- WalletConnect (mobile wallets)
- Any EIP-1193 compatible browser extension

### 3. Enter the Dream World

Click the **door** ("I'm in.") to enter the Discover page. No wallet connection required to browse — you only need a wallet when you want to interact.

---

## Core Actions

### Publishing a Dream

1. Hover over the **Starrider** (the comet-riding character on the homepage)
2. A message board appears — type your dream (max 100 characters, English only)
3. Click **Share** (wallet required)
4. Your dream becomes a floating bubble on the homepage
5. Cost: **$1 USDC** → goes to **Dream Fund**
6. One address can publish multiple dreams

### Giving +1

1. Go to **Discover** (click the door)
2. Browse dreams in **Explore** view (scroll/swipe to navigate)
3. Three options for each dream:
   - 💔 **Dislike** — skip to next
   - **+1** — transfer $1 USDC to the dreamer
   - 💚 **Like** — save to your favorites
4. When you give +1:
   - The dreamer receives a portion of your $1
   - **$0.2** drops into the **Merit Pool** (visible as a coin falling into the merit box)
   - The dream's "+1 seen" count increases

### Liking a Dream

- Click 💚 to like a dream
- After liking, you'll be asked: "Send +1 ($1 USDC) now?"
  - **Yes, +1** — transfers $1 USDC
  - **Maybe later** — skips to next dream
- Liked dreams are saved and visible in:
  - **Dreams** tab → **Liked** filter
  - Your **Personal Page** → Liked Dreams section

---

## Pages

### Homepage `/`

| Element | Description |
|---------|-------------|
| +1 USDC | Main title |
| "what if everyone give you 1 usdc?" | Core question |
| Door ("I'm in.") | Enter Discover page |
| Wallet Sprite | Connect/disconnect wallet (top-right) |
| Starrider | Comet-riding character — click to publish a dream |
| Dream Bubbles | 7 preset + user-created dreams floating with physics |
| Three Guardians | Caishen, Ganesha, Hermes — decorative, guarding the pools |
| Merit Pool | Merit box (red) — accumulates $0.2 from each +1 |
| Dream Fund | Treasure bowl (gold) — accumulates $1 from each dream |
| Mobius Ring | Rotating ring with gold coins — visual representation of circulation |
| Aurora | Green aurora background, breathing animation |

### Discover `/discover`

Three tabs:
- **Explore** — Full-screen dream browsing with swipe/scroll navigation
- **Dreams** — List view of all dreams, sorted by Hot / New / Liked
- **About** — Character guide and pool descriptions

Features:
- **Info strip**: Avatar · Name · Address · 💚 Liked · +N Seen
- **Merit Box**: Always visible at bottom, receives $0.2 coins on each +1
- **Dream Fairy**: Top-right sprite, click to go to your personal page
- **Shuffle ↻**: Randomize dream order

### Personal Page `/[address]`

- **Pixel Avatar**: 154 unique avatars (11 types × 14 colors), click to change
- **Name + Address**: Editable name (✎ icon, English + symbols only, max 20 chars)
- **Dream**: Editable dream text (✎ icon, max 200 chars)
- **+N Seen You**: Total +1 count received
- **Stats**: Given / Received / Transactions / Balance
- **Liked Dreams**: With +1 buttons for quick giving
- **Given / Received**: Transaction history (left/right columns)
- **Withdraw**: Available when balance > 0 (owner only)
- **Aurora**: Unique color per user (pink/purple/blue/green mix)

### Dream Pool `/pool`

- Total pool amount
- Stats: Total pool / Dreamers / Used
- All contributions list: Amount + Name + Address + Time
- Activities & Impact — coming soon

### About `/about`

Character introductions:
- **Starrider** — The Dreamer (comet-riding character)
- **Wallet Sprite** — The Keeper (wallet connection)
- **Three Guardians** — Keepers of the Dream Pool (Caishen, Ganesha, Hermes)
- **Dream Fairy** — The Guide (personal page navigation)
- **154 Pixel Souls** — Your Identity (avatar system)
- **Merit Pool** — The Merit Box (weekly raffle fund)
- **Dream Fund** — The Treasure Bowl (public good fund)

---

## The Two Pools

### Merit Pool (Merit Box)

- **Source**: $0.2 from every +1 transfer
- **Purpose**: Weekly raffle rewards
- **Visual**: Red pixel merit box with coin slot
- **Philosophy**: "Every +1 is an act of goodness — merit accumulates"

### Dream Fund (Treasure Bowl)

- **Source**: $1 from every dream published
- **Allocation**: 80% public good activities / 20% developers
- **Visual**: Gold pixel treasure bowl with overflowing coins
- **Philosophy**: "Your dream doesn't just float — it funds change"

---

## Weekly Raffle (Coming Soon)

- **When**: Every Saturday, UTC+0
- **Three tiers** based on weekly +1 count:
  - Tier 1: 7 times in a week
  - Tier 2: 77 times in a week
  - Tier 3: 777 times in a week
- **How it works**:
  1. Reach the threshold → automatically whitelisted
  2. Participation window: 1 hour to click and join
  3. Drawing: 1 hour after window closes
  4. Winners claim the pool
- **Prize source**: Merit Pool funds
- **Note**: You must actively click to participate during the window — being whitelisted is not enough

---

## Wallet Connection Rules

**No wallet needed:**
- Viewing the homepage
- Entering Discover
- Browsing dreams (Explore + Dreams views)
- Reading About page

**Wallet required:**
- Publishing a dream (Share)
- Giving +1
- Liking 💚 / Disliking 💔
- Viewing personal pages
- Withdrawing balance

---

## Avatar System

- **154 unique pixel avatars**
- 11 character types: Wizard, Knight, Cat, Robot, Ghost, Alien, Fairy, Pirate, Ninja, Astronaut, Jester
- 14 color palettes: Blue, Red, Green, Purple, Orange, Teal, Rose, Mint, Copper, Indigo, Magenta, Lime, Mauve, Steel
- Default avatar is auto-generated from your wallet address
- Click your avatar on your personal page to choose a different one
- Stored locally (localStorage)

---

## Input Rules

- **Dream name**: English letters + numbers + common symbols, max 20 characters
- **Dream text**: English letters + numbers + common symbols (including `,;:'"?/`), max 200 characters
- **Wish (homepage)**: Max 100 characters

---

## Technical Details

- **Blockchain**: Base (Base Sepolia for testnet)
- **Token**: USDC (6 decimals)
- **Smart Contract**: PlusOne.sol (Solidity 0.8.24)
- **Randomness**: Chainlink VRF v2
- **Frontend**: Next.js 16 + React 19 + Wagmi 3
- **Data**: On-chain (profiles, transfers) + localStorage (names, avatars, likes)
