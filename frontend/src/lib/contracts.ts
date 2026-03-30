// Contract addresses — fill in after deployment
export const PLUS_ONE_ADDRESS = {
  baseSepolia: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  base:        "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const

// USDC on Base
export const USDC_ADDRESS = {
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  base:        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
} as const

export const ONE_DOLLAR = 1_000_000n // $1 USDC (6 decimals)

export const PLUS_ONE_ABI = [
  // register
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "thought", type: "string" }],
    outputs: [],
  },
  // give
  {
    name: "give",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  // withdraw
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // getProfile
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
          { name: "thought",    type: "string"  },
          { name: "count",      type: "uint256" },
          { name: "balance",    type: "uint256" },
          { name: "registered", type: "bool"    },
        ],
      },
    ],
  },
  // getUserCount
  {
    name: "getUserCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // events
  {
    name: "Registered",
    type: "event",
    inputs: [
      { name: "user",    type: "address", indexed: true },
      { name: "thought", type: "string",  indexed: false },
    ],
  },
  {
    name: "PlusOneGiven",
    type: "event",
    inputs: [
      { name: "from",     type: "address", indexed: true  },
      { name: "to",       type: "address", indexed: true  },
      { name: "newCount", type: "uint256", indexed: false },
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
] as const
