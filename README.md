# ⚔️ Oaths & Ashes

> **Six houses. One throne. No mercy between rounds.**

A fast multiplayer 2D tactical dynasty-war game built on Monad blockchain. Coordinate simultaneous actions, negotiate alliances, exploit betrayal, manage reputation, and fight for control of the realm in a fully deterministic on-chain game engine.

🎮 **[Play Now](https://oathsandashes.netlify.app/)** | 📜 **Contract**: `0x478643bE5f1CdB85010454f00c795cB24e0d3010` | 🔗 **[Monad Testnet](https://testnet-rpc.monad.xyz)**

---

## 🎯 Game Overview

Oaths & Ashes is a strategic multiplayer game where up to 6 players compete for throne control. Each player commands a house with territories, allies, and reputation. The game combines:

- **Simultaneous Decisions**: All players submit actions each round (attack, fortify, tax, etc.)
- **Betrayal Mechanics**: Form and break alliances for strategic advantage
- **Dragon Control**: Legendary units that can shift the balance of power
- **Reputation System**: Your word matters—breaking alliances has consequences
- **Deterministic Resolution**: All game logic runs on-chain; results are final and verifiable

## 🌐 Live Deployment

**Website**: [https://oathsandashes.netlify.app/](https://oathsandashes.netlify.app/)

**Smart Contract Details**:
- **Network**: Monad Testnet
- **Chain ID**: 10143
- **Contract Address**: `0x478643bE5f1CdB85010454f00c795cB24e0d3010`
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Deployment TX**: `0xfac4375b83164d389f2f169760d3408d475abb43e8010730a31363c087681984`

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- MetaMask browser extension
- MON testnet tokens from [Monad Faucet](https://testnet-faucet.monad.xyz)

### 1️⃣ Setup MetaMask for Monad Testnet
```
Chain ID: 10143
RPC URL: https://testnet-rpc.monad.xyz
Currency: MON
```

### 2️⃣ Run Locally
```bash
git clone <repo>
cd Oaths-Ashes-Monad
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

### 3️⃣ Play the Game
1. Click **"Connect MetaMask"** → Approve connection
2. Click **"New Game"** → Create a match
3. Wait for other players or use test accounts
4. Select a house and click **"Join Match"**
5. Each round:
   - Choose an action (Attack, Fortify, Tax, Ally, etc.)
   - Sign intent with MetaMask (EIP-712)
   - Transaction submits to Monad
   - Wait for settlement (~10 seconds)
6. View results on **"Contract State"** and **"Events"** tabs

## 🎮 Features

### ✅ Core Gameplay
- **6 Houses**: House Drakesblood, House Stormborn, House Goldleaf, House Shadowborn, House Emberhold, House Starwhisper
- **3 Dragons**: Powerful units that shift territorial control
- **Territories**: Strategic map control with resource generation (taxes)
- **Simultaneous Actions**: All players decide simultaneously, then settlement occurs
- **Reputation System**: Track alliance history and betrayal consequences
- **Alliance Mechanics**: Form, maintain, and break alliances for strategic advantage

### ✅ Technical Features
- **Fully On-Chain**: All game logic is deterministic and immutable
- **EIP-712 Intent Signing**: Cryptographically signed player actions
- **Optimistic UI**: Instant feedback with chain settlement confirmation
- **Event Logging**: Full audit trail of all game events on-chain
- **Multi-House Support**: Extensible design for future game modes

### ✅ Built With
- **Solidity**: Deterministic game engine
- **Monad Blockchain**: High-performance testnet
- **React + TypeScript**: Modern frontend
- **ethers.js**: Contract interaction
- **MetaMask**: Wallet integration

## 🏗️ Full Development Setup

### Clone & Install
```bash
git clone <repo>
cd Oaths-Ashes-Monad
npm install
```

### Frontend Development
```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run unit tests
npm run integration-test  # Integration tests
```

### Smart Contract Development
```bash
forge build          # Compile contracts
forge test -vvv      # Run contract tests with verbose output
forge test -m "testName"  # Run specific test
anvil                # Start local Ethereum simulator
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Environment Variables
Create `.env` in root (never commit):
```bash
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_MONAD_CHAIN_ID=10143
VITE_CONTRACT_ADDRESS=0x478643bE5f1CdB85010454f00c795cB24e0d3010
```

## 🔍 Testing

The project includes comprehensive test coverage:

```bash
# Unit tests
npm test

# Integration tests (with deployed contract)
npm run integration-test

# End-to-end tests (full game flow)
npm run monad-e2e

# Contract tests
forge test -vvv
```

## 🎯 How It Works

### Game Flow
```
1. Player connects MetaMask to Monad Testnet
2. Player creates or joins a match (1-6 players)
3. Each player joins a house (unique per match)
4. Round begins: 10-second decision window
5. Each player signs intent with MetaMask (EIP-712)
6. Intents submitted to contract (batched)
7. Settlement phase: contract executes all intents deterministically
8. Results published on-chain with events
9. Game loop repeats until throne is conquered
```

### Action Types
- **Attack**: Seize an opponent's territory
- **Fortify**: Strengthen a territory's defense
- **Tax**: Generate gold from your territories
- **Dragon Summon**: Control a dragon for territory advantage
- **Ally**: Form an alliance with another house
- **Revoke Alliance**: Break an alliance
- **Throne Claim**: Declare intent to control the center

### Deterministic Settlement
- All actions are submitted as signed intents
- The contract reads intents in strict order
- Game logic applies exactly the same way every time
- No randomness; all outcomes are verifiable
- Players can audit results by checking events

## 🔐 Architecture

### Smart Contract Layer
- **Game Engine**: Solidity contract storing all game state
- **House State**: Territories, alliances, reputation for each house
- **Intent Validation**: Ensures all signed actions are authentic and on-time
- **Atomic Settlement**: All intents for a round settle in one transaction
- **Event Emission**: Full game history logged as contract events

### Frontend Layer
- **Wallet Connection**: MetaMask integration with network switching
- **Intent Signing**: EIP-712 signing for provable player actions
- **Optimistic UI**: Shows actions as "pending" before chain confirmation
- **State Queries**: Real-time reading of contract state
- **Event Decoding**: Parses contract events to show game history

### Data Flow
```
Player Action → MetaMask Sign (EIP-712) → Frontend Submission
  → Monad RPC Call → Contract Storage → Event Emission
  → Frontend Listens → UI Updates
```

### Optimistic UI / Hybrid Architecture
1. **Player chooses action** → UI shows "INTENT SEALED"
2. **MetaMask signing** → User signs EIP-712 message
3. **Submission** → Action sent to contract
4. **Monad confirmation** → Transaction included in block
5. **Chain state update** → Contract state changes
6. **UI confirmation** → Result displayed to user

Only after blockchain confirmation does the UI claim definitive outcomes (territory captured, alliance formed, etc.). Pending states show "⏳ Awaiting Monad..." or similar.

## 🛡️ Security Model

### Private Key Protection
- ✅ Private keys **never** transmitted to browser
- ✅ MetaMask handles all signing (hardware wallet compatible)
- ✅ `.env` stored locally only, never committed
- ✅ Environment variables validate RPC endpoints

### Contract Validation
- ✅ EIP-712 signature verification (ensures player authenticity)
- ✅ Nonce tracking (prevents replay attacks)
- ✅ Round deadline enforcement (prevents late submissions)
- ✅ House ownership validation (proves player authorization)
- ✅ Deterministic settlement (all outcomes are auditable)

### Frontend Security
- ✅ Chain-of-truth: blockchain is authoritative, not UI
- ✅ No local storage of private keys
- ✅ All state reads directly from contract
- ✅ Events used only for UI hints, contract state as source-of-truth

## 📊 Project Status

**Phase 3 — Monad Integration (Complete)** ✅
- ✅ Smart contract deployed on Monad Testnet
- ✅ Full game logic implemented and tested
- ✅ Frontend integration harness complete
- ✅ MetaMask wallet connection
- ✅ EIP-712 intent signing
- ✅ Real-time state queries and event decoding
- ✅ Optimistic UI with chain settlement
- ✅ Comprehensive test coverage

**Phase 4 — Planned Enhancements**
- Polished UI with animations
- Multiplayer lobby and matchmaking
- Social features (replay history, rankings)
- Audio and visual effects
- Mobile-responsive design

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [Game State Specification](./docs/GAME_STATE_SPEC.md) | Complete game rules, mechanics, and state machine |
| [Intent Signing Specification](./docs/INTENT_SIGNING_SPEC.md) | EIP-712 specification and signature verification |
| [Phase 2 Audit](./docs/PHASE2_COMPLETION_AUDIT.md) | Implementation verification and testing results |
| [Phase 3 Integration](./docs/PHASE3_INTEGRATION.md) | Frontend integration guide and API reference |
| [Contract Requirements](./docs/CONTRACT_REQUIREMENTS.md) | Smart contract interface and function signatures |

## 💡 Innovation Highlights

### Why Oaths & Ashes?
- **First On-Chain Dynasty Game**: Simultaneous multiplayer game with full on-chain resolution
- **Deterministic Gameplay**: No RNG, all outcomes verifiable by anyone
- **Real Economic Model**: Resources and alliances have actual value
- **Trust Through Cryptography**: Actions are cryptographically signed, not based on central server
- **Monad's Speed**: Leverages Monad's high-throughput to enable rapid round settlement
- **Cultural Depth**: Strategy game combines diplomacy, betrayal, and cooperation

### Technical Innovation
- **EIP-712 Intent Model**: Players sign structured data, not raw transactions
- **Optimistic UI Pattern**: Instant feedback with eventual on-chain confirmation
- **Extensible Architecture**: Game rules can be upgraded through contract versioning
- **Scalable Design**: Multiple simultaneous matches, hundreds of players

## 🤝 Contributing

Contributions are welcome! Areas for contribution:
- UI/UX improvements
- Additional game mechanics
- Performance optimizations
- Documentation enhancements
- Bug reports and fixes

Please open an issue before submitting large PRs.

## 📄 License

Apache License 2.0 — See [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- Built for [Monad Blitz Bangalore V5](https://monad-foundation.notion.site/Monad-Blitz-Bangalore-V5-3bd6367594f280a7a575e414813ab045)
- Monad Foundation for providing testnet and support
- OpenZeppelin for Solidity libraries
- Vite, React, and TypeScript communities

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/Oaths-Ashes-Monad/issues)
- **Monad Support**: https://monad.xyz
- **Contract on Monad Explorer**: Search `0x478643bE5f1CdB85010454f00c795cB24e0d3010`

---

**Made with ⚔️ and 🔥 on Monad**
