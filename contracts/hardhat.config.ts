import { HardhatUserConfig, task } from "hardhat/config"
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names"
import "@nomicfoundation/hardhat-toolbox"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config()

// Use local solcjs (npm package) instead of downloading native binary.
// This is needed when soliditylang.org is unreachable (e.g. SSL blocking).
task(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: any, hre, runSuper) => {
  // Only intercept for 0.8.24 — let other versions fall through
  if (args.solcVersion === "0.8.24") {
    const solcPath = path.join(__dirname, "node_modules", "solc")
    return {
      compilerPath: path.join(solcPath, "soljson.js"),
      isSolcJs:     true,
      version:      "0.8.24",
      longVersion:  "0.8.24+commit.e11b9ed9.Emscripten.clang",
    }
  }
  return runSuper()
})

const config: HardhatUserConfig = {
  paths: {
    sources: "./src",
    tests:   "./test",
    cache:   "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      "base-sepolia": process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
}

export default config
