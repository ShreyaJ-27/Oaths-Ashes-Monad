# Phase 3 — Monad Integration

## Objective

Prove that the frontend/integration layer can communicate with the LIVE deployed Oaths & Ashes contract on Monad Testnet.

Demonstrate the complete onchain flow:
1. Connect wallet to Monad Testnet
2. Create a match on the contract
3. Join a house as a player
4. Sign an EIP-712 intent
5. Submit the intent to the contract
6. Settle the round
7. Read resulting state
8. Read emitted events

## Live Deployment

- **Network**: Monad Testnet
- **Chain ID**: 10143
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Contract Address**: `0xa3B8028dd4B0905b3c16ef9CffDDA487AAb6265f`
- **Deployment TX**: `0xb5eb571ed36fbe0215325bfea9449f1ed4f2967a13f95ff25701d71f41175fc3`

## Architecture

### Frontend Stack

```
src/
├── main.tsx           # React entry point
├── App.tsx            # Main orchestration component
├── types.ts           # Type definitions + game constants
├── contract.ts        # Ethers.js contract interaction
├── signing.ts         # EIP-712 signing utilities
└── components/
    ├── WalletConnect.tsx   # MetaMask connection
    ├── MatchCreate.tsx     # Match creation
    ├── HouseJoin.tsx       # House selection
    ├── IntentSigning.tsx   # Action + EIP-712 signing
    ├── ContractState.tsx   # State reading
    └── Events.tsx          # Event decoding + display
```

### Stack

- **React 18.2.0** — UI framework
- **TypeScript 5.3** — Type safety
- **ethers.js 6.11.0** — Blockchain library
- **Vite 5.0** — Build tool
- **Vitest 1.0** — Testing framework
- **MetaMask** — Wallet provider

### Contract Interaction Flow

```
Client
  ↓
  MetaMask (injected provider)
  ↓
  Ethers.js BrowserProvider
  ↓
  Monad RPC
  ↓
  Smart Contract (0xa3B...65f)
```

## Wallet Connection

### Setup

1. Install MetaMask extension
2. Add Monad Testnet:
   - Chain ID: 10143
   - RPC URL: https://testnet-rpc.monad.xyz
   - Currency: MON
3. Get testnet MON from faucet
4. Import a test account

### Flow

```
User clicks "Connect MetaMask"
  ↓
Check if window.ethereum exists
  ↓
Request accounts (eth_requestAccounts)
  ↓
Validate chain ID (eth_chainId)
  ↓
If wrong chain:
  → Try wallet_switchEthereumChain
  → Fall back to wallet_addEthereumChain
  ↓
Get BrowserProvider + Signer
  ↓
Initialize gameContract with provider + signer
```

**File**: `src/components/WalletConnect.tsx`

## Match Creation

### Flow

```
User clicks "Create Match"
  ↓
Call gameContract.createMatch()
  ↓
Wait for receipt
  ↓
Read matchCounter from contract
  ↓
matchId = matchCounter (newly created)
  ↓
Display match ID and proceed to house joining
```

**File**: `src/components/MatchCreate.tsx`

**Contract Method**:
```solidity
function createMatch() external returns (uint256)
```

## House Joining

### Flow

```
User selects house from 6-house grid
  ↓
Click "Join House"
  ↓
Call gameContract.joinMatch(matchId, houseId)
  ↓
Wait for receipt
  ↓
Display success
  ↓
Proceed to intent signing
```

**File**: `src/components/HouseJoin.tsx`

**Contract Method**:
```solidity
function joinMatch(uint256 matchId, uint8 houseId) external
```

**Constraints**:
- 6 houses, IDs 1–6
- House already joined by another player → error
- Player already joined to match → error

## EIP-712 Signing

### Specification

**Domain**:
```json
{
  "name": "OathsAndAshes",
  "version": "1",
  "chainId": 10143,
  "verifyingContract": "0xa3B8028dd4B0905b3c16ef9CffDDA487AAb6265f"
}
```

**Intent Type**:
```
Intent(
  uint256 matchId,
  uint8 round,
  uint8 houseId,
  uint8 action,
  uint8 targetType,
  uint8 targetId,
  uint256 nonce,
  uint256 deadline,
  address signer
)
```

**Actions**:
- 0: None
- 1: Attack
- 2: Fortify
- 3: Dragonstrike
- 4: Diplomacy
- 5: Sabotage
- 6: Tax

**Target Types**:
- 0: None
- 1: Territory
- 2: House
- 3: Dragon
- 4: Throne

**Nonce**:
- Strictly increasing per house per match
- Starts at 1, increments by 1 each submission
- Prevents replay attacks
- Read from contract: `usedNonce[matchId][houseId]`

**Deadline**:
- Unix timestamp (seconds)
- Must be in future (verified by contract)
- Typical: current time + 30–60 seconds

### Flow

```
User selects action and target
  ↓
Load current nonce from contract
  ↓
Read current block timestamp
  ↓
Calculate deadline = now + 30 seconds
  ↓
Create intent message with all fields
  ↓
Validate intent locally
  ↓
Call signer.signTypedData(domain, types, message)
  ↓
MetaMask shows EIP-712 signature dialog
  ↓
User approves in MetaMask
  ↓
Signature returned (65 bytes: r + s + v)
  ↓
Append signature to intent
  ↓
Submit to contract via submitIntent()
  ↓
Wait for receipt
  ↓
Increment local nonce
  ↓
Show success
```

**File**: `src/signing.ts` (utilities), `src/components/IntentSigning.tsx` (UI)

### Validation

Before signing, validate:
- Deadline is in future
- Nonce > 0
- Signer address is valid (checksum)
- Action is 0–6
- Target type is 0–4
- Match exists
- House is player's house

## Intent Submission

### Flow

```
Signature received from MetaMask
  ↓
Append signature to intent struct
  ↓
Call gameContract.submitIntent({
    matchId,
    round,
    houseId,
    action,
    targetType,
    targetId,
    nonce,
    deadline,
    signer,
    signature
  })
  ↓
Contract verifies signature using EIP-712
  ↓
Contract checks nonce (must match usedNonce[matchId][houseId] + 1)
  ↓
Contract increments usedNonce
  ↓
Contract emits IntentSubmitted event
  ↓
Receipt received
  ↓
UI updates with success
```

**File**: `src/contract.ts` (submitIntent), `src/components/IntentSigning.tsx` (UI)

## Round Settlement

### Manual Settlement

To settle a round manually:

```typescript
await gameContract.settleRound(matchId);
```

This:
1. Collects all submitted intents for the round
2. Applies game logic deterministically
3. Updates house/territory/dragon state
4. Emits RoundResolved event
5. Advances to next round (if < 10)

**Note**: Settlement is typically called by a relayer or bot. For testing, manual calls are supported.

## State Reading

### Match State

```typescript
const match = await gameContract.getMatchSummary(matchId);
// {
//   id: bigint,
//   status: 0 | 1 | 2,  // Created, Active, Finished
//   round: number,
//   roundStart: bigint,  // Unix timestamp
//   roundDeadline: bigint,
//   playersJoined: number,  // 0–6
//   winnerHouseId: number,
//   throneStreak: number
// }
```

### House State

```typescript
const house = await gameContract.getHouseState(matchId, houseId);
// {
//   houseId: number,
//   gold: number,
//   influence: number,
//   military: number,
//   reputation: number,
//   territoryId: number,
//   passive: boolean,
//   dragonId: number,
//   activeAlliance: number,
//   vengeanceUntil: number,
//   alive: boolean
// }
```

### Territory State

```typescript
const territory = await gameContract.getTerritoryState(matchId, territoryId);
// {
//   territoryId: number,
//   ownerHouseId: number,
//   resourceValue: number,
//   defensiveValue: number,
//   fortificationLevel: number,
//   isThrone: boolean,
//   sabotageUntil: number,
//   lastTaxRound: number
// }
```

### Dragon State

```typescript
const dragon = await gameContract.getDragonState(matchId, dragonId);
// {
//   dragonId: number,
//   ownerHouseId: number,
//   power: number,
//   armor: number,
//   speed: number,
//   loyalty: number,
//   wounds: number,
//   alive: boolean,
//   deathRound: number
// }
```

**File**: `src/contract.ts`, `src/components/ContractState.tsx`

## Event Decoding

The harness listens for and decodes events from the contract:

### Supported Events

- `MatchCreated(uint256 indexed matchId)`
- `IntentSubmitted(uint256 indexed matchId, uint8 round, uint8 houseId, uint256 nonce)`
- `RoundResolved(uint256 indexed matchId, uint8 round)`
- `TerritoryCaptured(uint256 indexed matchId, uint8 territoryId, uint8 houseId)`
- `TaxCollected(uint256 indexed matchId, uint8 houseId, uint8 territoryId, uint256 amount)`
- `AllianceFormed(uint256 indexed matchId, uint8 houseId1, uint8 houseId2)`
- `Betrayal(uint256 indexed matchId, uint8 houseId1, uint8 houseId2)`
- `SabotageResolved(uint256 indexed matchId, uint8 territoryId)`
- `DragonStrike(uint256 indexed matchId, uint8 dragonId, uint8 targetTerritory)`
- `DragonWounded(uint256 indexed matchId, uint8 dragonId, uint8 wounds)`
- `DragonCaptured(uint256 indexed matchId, uint8 dragonId, uint8 houseId)`
- `ReputationChanged(uint256 indexed matchId, uint8 houseId, int8 delta)`
- `MatchEnded(uint256 indexed matchId, uint8 winnerHouseId)`

### Flow

```
User views "Events" tab
  ↓
UI fetches last 1000 blocks
  ↓
Calls provider.getLogs() for each event filter
  ↓
Parses logs using contract.interface
  ↓
Filters for current match
  ↓
Displays events in chronological order
  ↓
Auto-refreshes every 10 seconds
```

**File**: `src/components/Events.tsx`

## Optimistic UI / Hybrid Architecture

### Design Pattern

When a player submits an action:

1. **Immediate Feedback**: "Signing..." → "Submitting..." (local state)
2. **Signature**: MetaMask EIP-712 dialog
3. **Submission**: Transaction sent to Monad
4. **Confirmation**: Wait for Monad block inclusion
5. **Authoritative Outcome**: Read from contract state

### State Boundaries

**Optimistic (Local Only)**:
- "User signed intent" → shown immediately
- "Signature submitted to contract" → shown immediately
- Nonce incremented locally

**Confirmed (Chain Authoritative)**:
- "Territory captured" → only after RoundResolved event
- "Alliance formed" → only after AllianceFormed event
- House state (gold, military, etc.) → read from contract after settle
- Match outcome → read from contract

### Benefits

- **Responsiveness**: Users see immediate feedback
- **Correctness**: Game outcomes only confirmed after blockchain
- **UX**: No blank waiting screens, clear pending states

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:
- EIP-712 domain construction
- Intent message validation
- Deadline validation
- Action/target type enum validation
- Signer address format checking

**File**: `test/integration.test.ts`

### Integration Tests

```bash
npm run integration-test
```

These validate:
- Contract connection
- Chain ID validation
- Match creation
- House joining
- EIP-712 signing
- Intent submission
- State reading
- Event decoding

**Note**: Integration tests require a live Monad Testnet connection.

### Manual E2E Testing

1. Start the harness: `npm run dev`
2. Open http://localhost:5173
3. Connect MetaMask
4. Create match
5. Join house
6. Submit action with EIP-712 sign
7. Check "Contract State" tab for updated state
8. Check "Events" tab for emitted events

## Deployment

### Prerequisites

- Node.js 18+
- MetaMask extension
- Monad testnet MON tokens
- Valid Monad Testnet RPC URL

### Environment Variables

Create `.env` in the project root (never commit):

```
MONAD_TEST_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_TEST_CHAIN_ID=10143
```

### Build

```bash
npm run build
```

Outputs to `dist/`.

### Deployment Targets

- **Local Development**: `npm run dev` (port 5173)
- **Production**: Host `dist/` folder on static server
  - Vercel: `vercel deploy dist`
  - Netlify: `netlify deploy --prod --dir dist`
  - GitHub Pages: Push to `gh-pages` branch

## Security Checklist

- [ ] `.env` is in `.gitignore` and NOT committed
- [ ] `.env.example` contains placeholder values only
- [ ] No private keys in source code, docs, or comments
- [ ] No secrets in frontend code (all signing is via MetaMask)
- [ ] HTTPS in production (required for MetaMask)
- [ ] Contract address is correct (0xa3B...65f)
- [ ] Chain ID is correct (10143)
- [ ] RPC URL is correct (https://testnet-rpc.monad.xyz)

## Troubleshooting

### "MetaMask not detected"

- Install MetaMask extension
- Refresh the page
- Check browser console for errors

### "Wrong chain"

- Add Monad Testnet to MetaMask (Chain ID 10143)
- Click "Connect" and approve chain switch
- Ensure MetaMask is on Monad Testnet

### "Insufficient funds"

- Get MON from Monad faucet: https://faucet.monad.xyz/
- Wait a few minutes for tokens to arrive

### "Signature rejected"

- User canceled MetaMask dialog
- Click "Sign & Submit Intent" again
- Approve the EIP-712 dialog

### "Nonce mismatch"

- Refresh the page
- Load contract state again
- Ensure no competing transactions

### "Deadline expired"

- Signing took too long
- Create new intent with longer deadline buffer

## Performance

- **Match creation**: ~1–3 seconds (Monad block time)
- **House joining**: ~1–3 seconds
- **Intent signing**: <1 second (local)
- **Intent submission**: ~1–3 seconds
- **State reading**: <500ms
- **Event decoding**: ~500ms–1s

Monad Testnet has ~1-second block time, so confirmations are fast.

## Known Limitations

- **Single player per house**: Only one MetaMask account per house per match
- **No multiplayer lobby**: Matches must be created/joined manually
- **No replay prevention**: Signature reuse is prevented only by nonce (contract level)
- **No persistent storage**: All state is read from contract (no cache)
- **No account abstraction**: Requires ETH for gas (no account abstraction yet)
- **No cross-chain**: Only Monad Testnet (not mainnet, not other chains)

## Next Phase

Phase 4 — Full Game Frontend

- Polished UI with animations
- Multiplayer lobby and matchmaking
- Real-time state sync (WebSocket)
- Admin dashboard for relayer operations
- Analytics and event history

## References

- [Monad Testnet](https://monad.xyz/)
- [ethers.js Docs](https://docs.ethers.org/)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [MetaMask Developer Docs](https://docs.metamask.io/)
- [Oaths & Ashes Game Rules](./GAME_STATE_SPEC.md)
- [Intent Signing Spec](./INTENT_SIGNING_SPEC.md)

## License

Apache License 2.0