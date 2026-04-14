# Code4rena Audit Submission — PlusOne Protocol

## Project Info
- **Name**: PlusOne (+1) — 一块钱计划
- **Website**: https://dreamone-app.vercel.app
- **GitHub**: https://github.com/nuwagabavictor1-ai/plusone-protocol
- **Category**: DeFi / Social / Attention Protocol
- **Chains**: Base + BNB Chain (EVM)

## Scope
- **Contract**: `contracts/src/PlusOne.sol` (~300 lines)
- **Solidity**: 0.8.24
- **Dependencies**: OpenZeppelin 4.9.6 (ReentrancyGuard, SafeERC20), Chainlink VRF v2
- **Mock contracts** (out of scope): `contracts/src/mocks/MockUSDC.sol`, `contracts/src/mocks/VRFCoordinatorV2_5Mock.sol`

## Contract Summary
PlusOne is an attention protocol where users send $1 USDC to support dreamers. Each +1 costs $1.20 ($1 to recipient, $0.20 to Merit Pool). Features:

- **register()** — Register with a dream, costs $1 → Dream Fund
- **publishDream()** — Publish additional dreams, $1 each
- **give()** — Send +1, costs $1.20 ($1 to recipient balance, $0.20 to Merit Pool)
- **withdraw()** — Withdraw accumulated balance (works even when paused)
- **Weekly Raffle** — 7/77/777 tier thresholds, Chainlink VRF winner selection
- **Emergency pause** — Owner can pause all operations except withdraw
- **cancelRaffle()** — Cancel stuck raffle after 24h VRF timeout

## Key Concerns
1. **USDC handling** — SafeERC20 transfers, reentrancy protection
2. **Raffle fairness** — VRF randomness, no front-running opportunity
3. **Fund accounting** — Merit Pool vs Dream Fund vs user balances integrity
4. **Owner privilege** — Owner controls raffle timing, withdrawal fees, Dream Fund withdrawal
5. **Edge cases** — Week boundary calculations, empty raffle tiers, VRF timeout

## Test Suite
- 53 tests, all passing
- Covers: register, publishDream, give, withdraw, full raffle lifecycle, cancel, pause, admin functions, view functions, edge cases

## Deployed (Testnet)
- Base Sepolia: `0x502eE2A3743Ed50C3Cf30ccBffF17Db0593F112a` (Sourcify verified)
- BSC Testnet: `0x6C9c77327FC2a50553DEcECD214a1a13847EFd48`
