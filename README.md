# Oaths & Ashes

Oaths & Ashes is a fast multiplayer 2D tactical dynasty-war game for Monad, built around six houses, six territories, three dragons, and a single throne. Players coordinate simultaneous round actions, negotiate alliances, exploit betrayal, manage reputation, and fight for control of the center of the realm in a deterministic onchain game engine.

## Current Build Phase

Phase 3 — Monad Integration (Live Testnet)

## Live Deployment

The Oaths & Ashes contract is deployed on **Monad Testnet**:

- **Network**: Monad Testnet
- **Chain ID**: 10143
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Contract Address**: `0x478643bE5f1CdB85010454f00c795cB24e0d3010`
- **Deployment TX**: `0xfac4375b83164d389f2f169760d3408d475abb43e8010730a31363c087681984`

## Phase 3 — Integration Harness

Phase 3 includes a minimal integration harness that demonstrates the complete flow:

1. **Wallet Connection**: Connect MetaMask to Monad Testnet
2. **Match Creation**: Create a match on the live contract
3. **House Joining**: Join a house as a player
4. **EIP-712 Signing**: Sign intents using the exact specification
5. **Intent Submission**: Submit signed intents to the contract
6. **Round Settlement**: Settle rounds and read results
7. **State Reading**: Query match/house/territory/dragon state
8. **Event Decoding**: Read and display emitted events

### Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Configuration

The harness uses environment variables for configuration. Create a `.env` file locally (never commit):

```bash
# .env (local only, DO NOT COMMIT)
MONAD_TEST_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_TEST_CHAIN_ID=10143
```

Alternatively, provide your own Monad RPC URL if using a different endpoint.

### MetaMask Setup

Before using the harness:

1. Install MetaMask browser extension
2. Add Monad Testnet network:
   - Chain ID: 10143
   - RPC URL: https://testnet-rpc.monad.xyz
   - Currency: MON

3. Get testnet tokens from the Monad faucet
4. Open the harness and click "Connect MetaMask"

### Using the Harness

1. **Connect Wallet**
   - Click "Connect MetaMask"
   - Approve the connection
   - Confirm you're on Monad Testnet (Chain ID 10143)

2. **Create Match**
   - Click "Create Match"
   - Wait for Monad confirmation
   - Match ID will display

3. **Join House**
   - Select one of the 6 houses
   - Click "Join House"
   - Confirm transaction

4. **Submit Action**
   - Select an action (Attack, Fortify, Tax, etc.)
   - Configure target
   - Click "Sign & Submit Intent"
   - MetaMask will request signature (EIP-712)
   - Transaction submits automatically

5. **View State**
   - "Contract State" tab shows live match/house/territory/dragon state
   - "Events" tab shows emitted events from the contract

## Local Development

### Solidity Contract

```bash
# Build the contract
forge build

# Run tests
forge test -vvv

# Deploy locally
anvil
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

## Commands

### Frontend

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run unit tests
npm run integration-test  # Run integration tests
```

### Solidity

```bash
forge build
forge test
forge test -vvv
anvil
forge script script/Deploy.s.sol --rpc-url $MONAD_RPC_URL --broadcast
```

## Architecture

### Smart Contract

The smart contract stores authoritative match state for houses, territories, dragons, alliances, reputation, throne control, round timing, and signed intents. Resolution is deterministic and follows the Phase 1 lifecycle, using block timestamp for the authoritative 10-second decision window.

### Frontend Integration

The harness uses:

- **ethers.js** for contract interaction
- **MetaMask** for wallet connection
- **EIP-712** for intent signing
- **React** for UI
- **Vite** for bundling

### Security Model

- The contract enforces valid signed intents, house ownership, nonce uniqueness, round deadlines, and deterministic settlement
- Frontend state is not authoritative; **the chain is the source of truth** for game outcomes
- Private keys are **never** exposed to the browser; only MetaMask handles signing
- The `.env` file contains sensitive configuration and must never be committed

### Optimistic UI / Hybrid Architecture

When a player submits an action:

1. **Local state**: "INTENT SEALED" (immediate feedback)
2. **Signing**: EIP-712 signature via MetaMask
3. **Submission**: Intent sent to contract
4. **Monad confirmation**: Transaction confirmed on chain
5. **Chain state**: Read authoritative result from contract

The UI only claims confirmed outcomes (territory captured, alliance formed, etc.) AFTER the blockchain confirms them. Pending states show "awaiting Monad..." or similar.

## Security & Privacy

### Environment Variables

- `.env` is local only and never committed
- `.env.example` contains placeholder names only (no secrets)
- Private keys are stored in `.env` and never appear in source code
- The frontend NEVER accesses private keys

### Deployment

- The contract is already deployed on Monad Testnet
- DO NOT redeploy unless critical bugfix is required
- Deployment requires a valid private key in `.env`

## Documentation

- [Phase 1 Specification](./docs/GAME_STATE_SPEC.md) — Game rules and mechanics
- [Phase 2 Audit](./docs/PHASE2_COMPLETION_AUDIT.md) — Implementation verification
- [Intent Signing Spec](./docs/INTENT_SIGNING_SPEC.md) — EIP-712 specification
- [Phase 3 Integration](./docs/PHASE3_INTEGRATION.md) — Frontend integration details

## Next Phase

Phase 4 — Full Game Frontend (polished UI, animations, multiplayer lobby)

## License

Apache License 2.0
