# +1 FAQ

## General

### What is +1?
An attention protocol where every $1 USDC transfer is a "+1" — meaning "I see you." Publish your dream, get seen by the community, receive $1 at a time.

### Why $1?
$1 is small enough that anyone can give, but meaningful enough that it's not spam. It's the minimum unit of "I care."

### What blockchain does +1 use?
Base (an Ethereum L2 by Coinbase). Low gas fees, fast transactions.

### Do I need crypto to use +1?
To browse and explore dreams: no. To give +1, publish a dream, or interact: yes, you need a wallet with USDC on Base.

---

## Dreams

### How do I publish a dream?
Hover over the comet-riding character (Starrider) on the homepage. A message board appears — type your dream and click Share. Costs $1 USDC.

### Can I publish multiple dreams?
Yes. Each dream costs $1 USDC. One address can have multiple dreams.

### Can I edit my dream after publishing?
Dreams published via the homepage message board are stored locally and can be edited on your personal page. On-chain dreams (via /create) cannot be modified.

### What language can I write my dream in?
Currently English only (letters, numbers, and common symbols). Max 200 characters.

### Where does my $1 go when I publish a dream?
100% goes to the **Dream Fund**: 80% for public good activities, 20% for developers.

---

## +1 Giving

### What happens when I give someone +1?
You transfer $1 USDC. A portion goes to the dreamer, and $0.2 goes to the **Merit Pool** (the merit box).

### Can I give +1 to the same person multiple times?
Yes. Each +1 is a separate $1 transfer.

### Do I need to approve USDC first?
The first time you give +1, you'll be asked to approve USDC spending. This is a one-time unlimited approval — subsequent +1s only require one transaction.

### What is the coin drop animation?
When you give +1, a gold coin labeled "$0.2" visually falls into the merit box at the bottom of the Discover page. This represents the portion going to the Merit Pool.

---

## Pools

### What is the Merit Pool?
A fund that accumulates $0.2 from every +1 transfer. Used for weekly raffle rewards. Think of it as "collective merit" — every act of giving builds the pool.

### What is the Dream Fund?
A fund that accumulates $1 from every dream published. 80% goes to public good activities, 20% to developers.

### Are they the same pool?
No. They have different sources and different purposes:
- Merit Pool ← +1 transfers → weekly raffles
- Dream Fund ← dream creation → public good + development

### Can I see the pool balances?
Yes. Both are displayed on the homepage bottom (Merit Pool in gold, Dream Fund in green). Click either to see the full `/pool` page with transaction details.

---

## Weekly Raffle (Coming Soon)

### How does the raffle work?
Every Saturday (UTC+0), users who gave enough +1s during the week can participate in a raffle.

### What are the tiers?
- **Tier 1**: 7 +1s in a week
- **Tier 2**: 77 +1s in a week
- **Tier 3**: 777 +1s in a week

### Do I automatically enter if I qualify?
No. You're added to a whitelist, but you must **actively click to participate** during a 1-hour window. If you miss it, you miss it — like forgetting to claim a lottery ticket.

### Where does the prize money come from?
From the Merit Pool — the accumulated $0.2 from each +1 transfer during the week.

### Is it competitive?
No. There's no ranking. You either hit the threshold or you don't. It's personal motivation, like buying lottery tickets.

---

## Wallet & Security

### Which wallets are supported?
MetaMask, OKX Wallet, Coinbase Wallet, WalletConnect (for mobile), and any EIP-1193 browser extension.

### Is my data stored on-chain?
- **On-chain**: Dream text (thought), +1 count, balance, registration status, transfer events
- **Local (localStorage)**: Name, avatar choice, liked dreams, wishes from homepage

### Can I withdraw my received +1s?
Yes. Go to your personal page and click Withdraw. A small fee may apply (configured in the smart contract).

### Is the smart contract audited?
Not yet. The contract uses OpenZeppelin standards and Chainlink VRF for randomness.

---

## Avatars

### How many avatars are there?
154 unique pixel avatars: 11 character types × 14 color palettes.

### How do I change my avatar?
Go to your personal page and click on your current avatar. A selection panel with all 154 options appears.

### What are the character types?
Wizard, Knight, Cat, Robot, Ghost, Alien, Fairy, Pirate, Ninja, Astronaut, Jester.

### Is my avatar stored on-chain?
No. Avatar selection is stored in localStorage (your browser). If you clear browser data or switch devices, you'll need to re-select.

---

## The Characters

### Who is the Starrider?
The comet-riding pixel character that flies across the homepage sky. Hover to see "CLICK ME" — click to publish a dream.

### Who is the Wallet Sprite?
The gold wallet icon in the top-right corner. Click to connect or disconnect your wallet.

### Who are the Three Guardians?
Caishen (Chinese god of wealth), Ganesha (Hindu deity), and Hermes (Greek messenger god). They guard the Merit Pool and Dream Fund at the bottom of the homepage.

### Who is the Dream Fairy?
The purple sprite with a star crown in the top-right of the Discover page. Click to go to your personal page.

---

## Multi-Chain (Planned)

### Will +1 support other chains?
Planned. The goal is to let users send $1 from any chain (Base, BSC, etc.). Current plan is to deploy the same contract on multiple chains with frontend aggregation.

### Will pools be unified across chains?
Under consideration. Options include per-chain pools with frontend aggregation, or cross-chain bridging to a single pool.
