import { createConfig, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    // Coinbase Smart Wallet — "I'm in" experience, no seed phrase
    coinbaseWallet({
      appName: "一块钱计划",
      preference: "smartWalletOnly",
    }),
    // All other injected wallets (MetaMask, Rainbow, etc.)
    injected(),
    // WalletConnect for mobile wallets
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]:        http(),
    [baseSepolia.id]: http(),
  },
})
