import { createConfig, http } from "wagmi"
import { base, baseSepolia, bsc, bscTestnet } from "wagmi/chains"
import { coinbaseWallet, injected, walletConnect, metaMask } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""

export const config = createConfig({
  chains: [base, baseSepolia, bsc, bscTestnet],
  connectors: [
    // MetaMask — always listed as standalone option
    metaMask(),
    // Binance Web3 Wallet — explicit injected target
    injected({
      target: {
        id: "binanceWallet",
        name: "Binance Wallet",
        provider: (window?: any) => {
          if (typeof window === "undefined") return undefined
          return (window as any).BinanceChain ?? undefined
        },
      },
    }),
    // Other injected wallets — auto-detects OKX, Phantom, etc.
    injected(),
    // Coinbase — both extension and Smart Wallet
    coinbaseWallet({
      appName: "一块钱计划",
      preference: "all",
    }),
    // WalletConnect — mobile wallets via QR code
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]:        http(),
    [baseSepolia.id]: http(),
    [bsc.id]:         http(),
    [bscTestnet.id]:  http(),
  },
})
