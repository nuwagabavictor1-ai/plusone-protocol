// Contract addresses — fill in after deployment per chain
export const PLUS_ONE_ADDRESS: Record<number, `0x${string}`> = {
  8453:    "0x0000000000000000000000000000000000000000", // Base mainnet
  84532:   "0x502eE2A3743Ed50C3Cf30ccBffF17Db0593F112a", // Base Sepolia
  56:      "0x0000000000000000000000000000000000000000", // BNB Chain mainnet
  97:      "0x6C9c77327FC2a50553DEcECD214a1a13847EFd48", // BNB Chain testnet
} as const

// USDC addresses per chain
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  8453:    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet
  84532:   "0x9A37B1C96DACbbf90BF550d7Fb0D3C0Ab70Ec64e", // Base Sepolia (MockUSDC)
  56:      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // BNB Chain mainnet (USDC)
  97:      "0x821E7a04EeDf28f434A8af196ADf052F306a5608", // BNB Chain testnet (MockUSDC)
} as const

// USDC amounts (6 decimals)
export const ONE_DOLLAR  = 1_000_000n  // $1.00
export const GIVE_COST   = 1_200_000n  // $1.20 per +1 ($1 to dreamer + $0.20 to Merit Pool)
export const DREAM_COST  = 1_000_000n  // $1.00 per dream (→ Dream Fund)
export const MERIT_SHARE = 200_000n    // $0.20 Merit Pool contribution per +1

export const PLUS_ONE_ABI = [
  // ── Core write functions ──
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "thought", type: "string" }],
    outputs: [],
  },
  {
    name: "publishDream",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "thought", type: "string" }],
    outputs: [],
  },
  {
    name: "give",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ── Raffle write functions ──
  {
    name: "participateRaffle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [],
  },
  {
    name: "claimPrize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ── View functions ──
  {
    name: "getProfile",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "totalReceived", type: "uint256" },
          { name: "totalGiven",    type: "uint256" },
          { name: "balance",       type: "uint256" },
          { name: "dreamCount",    type: "uint256" },
          { name: "registered",    type: "bool"    },
        ],
      },
    ],
  },
  {
    name: "getDreams",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "thought",   type: "string"  },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getDream",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user",  type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "thought",   type: "string"  },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getUserCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getWeekNumber",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getWeeklyGivenCount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user",    type: "address" },
      { name: "weekNum", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isQualifiedForTier",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "tier", type: "uint8"   },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "meritPool",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "dreamFund",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "raffleState",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "getRaffleParticipants",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getRaffleWinner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getRafflePrize",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ──
  {
    name: "Registered",
    type: "event",
    inputs: [
      { name: "user",       type: "address", indexed: true  },
      { name: "dreamIndex", type: "uint256", indexed: false },
      { name: "thought",    type: "string",  indexed: false },
    ],
  },
  {
    name: "DreamPublished",
    type: "event",
    inputs: [
      { name: "user",       type: "address", indexed: true  },
      { name: "dreamIndex", type: "uint256", indexed: false },
      { name: "thought",    type: "string",  indexed: false },
    ],
  },
  {
    name: "PlusOneGiven",
    type: "event",
    inputs: [
      { name: "from",                  type: "address", indexed: true  },
      { name: "to",                    type: "address", indexed: true  },
      { name: "recipientNewCount",     type: "uint256", indexed: false },
      { name: "meritPoolContribution", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Withdrawn",
    type: "event",
    inputs: [
      { name: "user",   type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fee",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "RaffleStarted",
    type: "event",
    inputs: [
      { name: "weekNumber",      type: "uint256", indexed: true  },
      { name: "meritPoolBalance", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RaffleWinnerSelected",
    type: "event",
    inputs: [
      { name: "weekNumber", type: "uint256", indexed: true  },
      { name: "tier",       type: "uint8",   indexed: false },
      { name: "winner",     type: "address", indexed: true  },
      { name: "prize",      type: "uint256", indexed: false },
    ],
  },
  {
    name: "PrizeClaimed",
    type: "event",
    inputs: [
      { name: "user",   type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const
