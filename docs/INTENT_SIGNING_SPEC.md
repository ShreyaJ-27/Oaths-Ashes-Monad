# OATHS & ASHES — INTENT SIGNING SPECIFICATION

**For:** Frontend developers using viem/wagmi or ethers.js  
**Purpose:** Exact EIP-712 signing specification for Oaths & Ashes intents  
**Version:** Phase 2  
**Date:** 2026-08-14

---

## OVERVIEW

The Oaths & Ashes contract uses EIP-712 structured data signing to ensure that intents are:

- **Cryptographically authentic** — Only signed by authorized player wallets
- **Tamper-proof** — Cannot be modified after signing
- **Non-replayable** — Nonces and round binding prevent reuse
- **Chain-specific** — Cannot be replayed across different chains
- **Match-specific** — Cannot be replayed across different matches

This document provides the exact fields, types, and signing procedure so frontend developers can integrate with standard EIP-712 tooling.

---

## EIP-712 DOMAIN

The EIP-712 domain for Oaths & Ashes is:

```json
{
  "name": "OathsAndAshes",
  "version": "1",
  "chainId": <MONAD_CHAIN_ID>,
  "verifyingContract": "0x<CONTRACT_ADDRESS>"
}
```

### Domain fields explained

| Field | Type | Value | Example |
|---|---|---|---|
| `name` | string | Contract name | `"OathsAndAshes"` |
| `version` | string | Specification version | `"1"` |
| `chainId` | uint256 | Network ID | `9001` (Monad) |
| `verifyingContract` | address | Contract address | `0x1234...abcd` |

### Generating the domain separator

The contract computes the domain separator as:

```solidity
keccak256(
  abi.encode(
    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
    keccak256("OathsAndAshes"),
    keccak256("1"),
    block.chainid,
    address(this)
  )
)
```

### Querying the domain separator

To verify your domain separator matches the contract, call:

```solidity
function getDomainSeparator() external view returns (bytes32)
```

**You may call this at any time to validate your domain setup.**

---

## PRIMARY TYPE: INTENT

Every action in Oaths & Ashes is submitted as a signed Intent.

### Intent struct definition

```typescript
// TypeScript / frontend representation
interface Intent {
  matchId: BigNumberish;        // uint256
  round: number;                // uint8
  houseId: number;              // uint8
  action: Action;               // uint8 (enum)
  targetType: TargetType;       // uint8 (enum)
  targetId: number;             // uint8
  nonce: BigNumberish;          // uint256
  deadline: BigNumberish;       // uint256
  signer: string;               // address
}

// Enums
enum Action {
  None = 0,
  Attack = 1,
  Fortify = 2,
  Dragonstrike = 3,
  Diplomacy = 4,
  Sabotage = 5,
  Tax = 6
}

enum TargetType {
  None = 0,
  Territory = 1,
  House = 2,
  Dragon = 3,
  Throne = 4
}
```

### Intent type hash

```solidity
keccak256("Intent(uint256 matchId,uint8 round,uint8 houseId,uint8 action,uint8 targetType,uint8 targetId,uint256 nonce,uint256 deadline,address signer)")
```

**This is a constant.** Use this exact string (no spaces after commas).

---

## SIGNING PROCEDURE

### Step 1: Prepare the intent

```typescript
import { viem } from "viem";

const intent = {
  matchId: BigInt("1"),           // matchId from contract
  round: 1,                       // current round
  houseId: 1,                     // your house ID
  action: 1,                      // Action.Attack
  targetType: 1,                  // TargetType.Territory
  targetId: 2,                    // target territory ID
  nonce: BigInt("1"),             // incremental nonce (never reuse)
  deadline: BigInt(Math.floor(Date.now() / 1000) + 30), // current time + 30 sec buffer
  signer: "0x...",                // player wallet address (msg.sender)
};
```

### Step 2: Construct the types object

```typescript
const types = {
  Intent: [
    { name: "matchId", type: "uint256" },
    { name: "round", type: "uint8" },
    { name: "houseId", type: "uint8" },
    { name: "action", type: "uint8" },
    { name: "targetType", type: "uint8" },
    { name: "targetId", type: "uint8" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "signer", type: "address" },
  ],
};
```

### Step 3: Construct the domain

```typescript
import { getPublicClient } from "viem";

const publicClient = getPublicClient();
const chainId = await publicClient.getChainId();

const domain = {
  name: "OathsAndAshes",
  version: "1",
  chainId: chainId,
  verifyingContract: CONTRACT_ADDRESS, // deployed contract address
};
```

### Step 4: Sign the intent

**Using viem:**

```typescript
import { signTypedData } from "viem/accounts";

const signature = await signTypedData({
  account: userAccount,
  domain,
  types,
  primaryType: "Intent",
  message: intent,
});
```

**Using wagmi (React):**

```typescript
import { useSignTypedData } from "wagmi";

const { signTypedDataAsync } = useSignTypedData();

const signature = await signTypedDataAsync({
  domain,
  types,
  primaryType: "Intent",
  message: intent,
});
```

**Using ethers.js (v6):**

```typescript
import { TypedDataDomain, TypedDataField } from "ethers";

const signature = await signer.signTypedData(domain, types, intent);
```

### Step 5: Submit the signature and intent to the contract

```typescript
import { publicClient } from "viem";

const txHash = await publicClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: OathsAndAshesABI,
  functionName: "submitIntent",
  args: [
    {
      matchId: intent.matchId,
      round: intent.round,
      houseId: intent.houseId,
      action: intent.action,
      targetType: intent.targetType,
      targetId: intent.targetId,
      nonce: intent.nonce,
      deadline: intent.deadline,
      signer: intent.signer,
      signature: signature,
    },
  ],
  account: userAccount,
});
```

---

## CRITICAL SIGNING RULES

### Rule 1: Nonce must be unique per house per match

Each house in each match must use strictly increasing, non-repeating nonces:

- First intent: `nonce = 1`
- Second intent: `nonce = 2`
- Third intent: `nonce = 3`
- ...

**If you reuse a nonce, the contract will reject your intent as a duplicate.**

### Rule 2: Deadline must be in the future

```typescript
const deadline = Math.floor(Date.now() / 1000) + buffer; // current time + buffer (30-60 sec recommended)
```

**If you submit after the deadline, the contract will reject your intent as expired.**

### Rule 3: Deadline must be after current block timestamp

The contract checks:

```solidity
require(block.timestamp <= intent.deadline, "intent expired");
```

**Always add a buffer (30-60 seconds) to account for block time variance.**

### Rule 4: Round must match the current match round

The contract checks:

```solidity
require(intent.round == matchState.round, "wrong round");
```

**Do not submit a round-1 intent during round 3; it will be rejected.**

### Rule 5: Signer must match msg.sender

```solidity
require(intent.signer == msg.sender, "signer mismatch");
```

**The address that signed the intent must be the address submitting the transaction.**

### Rule 6: Signer must own the house

```solidity
require(houseToPlayer[intent.matchId][intent.houseId] == msg.sender, "unauthorized house");
```

**You can only sign intents for houses you control in this match.**

### Rule 7: Do not modify intent after signing

EIP-712 signatures are **cryptographically binding** to the exact intent data.

If you change:
- `matchId`
- `round`
- `houseId`
- `action`
- `targetType`
- `targetId`
- `nonce`
- `deadline`
- `signer`

...after signing, the signature will be **invalid** and the contract will reject it.

### Rule 8: Action and target must be legal

The contract validates:

- **ATTACK:** target must be enemy territory, cost 2 gold + 1 influence
- **FORTIFY:** target must be own territory, cost 1 gold
- **DRAGONSTRIKE:** target must be enemy territory or dragon, cost 2 gold + 1 influence
- **DIPLOMACY:** target must be another house, cost 1 influence
- **SABOTAGE:** target must be enemy house or territory, cost 1 gold + 1 influence
- **TAX:** target must be own territory, cost 0

**If the action is invalid or resources are insufficient, the contract will reject the intent.**

---

## SECURITY CHECKLIST

Before submitting an intent, verify:

- [ ] `matchId` is the current match ID
- [ ] `round` is the current match round
- [ ] `houseId` is your house ID for this match
- [ ] `action` is a valid action (1-6)
- [ ] `targetType` is valid for your action (see table below)
- [ ] `targetId` is a valid territory (1-6), house (1-6), or dragon (1-3)
- [ ] `nonce` is unique and has never been used by this house in this match
- [ ] `deadline` is after current timestamp
- [ ] `signer` is your wallet address (msg.sender)
- [ ] Domain chainId matches Monad
- [ ] Domain verifyingContract matches the deployed contract
- [ ] Signature was generated by the correct wallet

---

## ACTION / TARGET COMPATIBILITY TABLE

| Action | Valid targetType | Valid targetId range | Example |
|---|---|---|---|
| ATTACK | Territory | 1-6 | targetId=2 (attack Briarfen) |
| FORTIFY | Territory | 1-6 | targetId=1 (fortify Ashenmere) |
| DRAGONSTRIKE | Territory, Dragon | 1-6 (territory), 1-3 (dragon) | targetId=2, targetType=Territory OR targetId=1, targetType=Dragon |
| DIPLOMACY | House | 1-6 | targetId=3 (propose to Gloam Reed) |
| SABOTAGE | House, Territory | 1-6 (both) | targetId=4, targetType=House OR targetId=1, targetType=Territory |
| TAX | Territory | 1-6 | targetId=1 (collect taxes from Ashenmere) |

---

## EXAMPLE: COMPLETE SIGNING FLOW

```typescript
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signTypedData } from "viem/accounts";

// Setup
const CHAIN_ID = 9001; // Monad
const CONTRACT_ADDRESS = "0x..."; // Deployed address
const PLAYER_PRIVATE_KEY = "0x...";

const account = privateKeyToAccount(PLAYER_PRIVATE_KEY);
const client = createWalletClient({
  account,
  chain: defineChain({ id: CHAIN_ID, name: "Monad", network: "monad", rpcUrls: { default: { http: ["..."] } } }),
  transport: http(),
});

// 1. Query current match state
const matchSummary = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: OathsAndAshesABI,
  functionName: "getMatchSummary",
  args: [1n], // matchId = 1
});

const currentRound = matchSummary[2]; // round from return tuple

// 2. Prepare intent
const intent = {
  matchId: 1n,
  round: currentRound,
  houseId: 1,
  action: 1, // Attack
  targetType: 1, // Territory
  targetId: 2, // Briarfen
  nonce: 1n, // First intent for this house
  deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
  signer: account.address,
};

// 3. Define types
const types = {
  Intent: [
    { name: "matchId", type: "uint256" },
    { name: "round", type: "uint8" },
    { name: "houseId", type: "uint8" },
    { name: "action", type: "uint8" },
    { name: "targetType", type: "uint8" },
    { name: "targetId", type: "uint8" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "signer", type: "address" },
  ],
};

// 4. Define domain
const domain = {
  name: "OathsAndAshes",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT_ADDRESS,
};

// 5. Sign
const signature = await signTypedData({
  account,
  domain,
  types,
  primaryType: "Intent",
  message: intent,
});

// 6. Submit
const txHash = await client.writeContract({
  address: CONTRACT_ADDRESS,
  abi: OathsAndAshesABI,
  functionName: "submitIntent",
  args: [{ ...intent, signature }],
});

console.log("Intent submitted:", txHash);
```

---

## TROUBLESHOOTING

### Signature verification failed

**Cause:** Signature does not match the intent.

**Solution:**
- Verify all intent fields match exactly
- Ensure `signer` matches `msg.sender`
- Check domain chainId and verifyingContract
- Regenerate the signature

### Intent expired

**Cause:** `deadline < block.timestamp`

**Solution:**
- Use current time + 30-60 second buffer
- Ensure transaction is submitted before deadline
- Account for network latency

### Nonce already used

**Cause:** You submitted a duplicate nonce for this house in this match.

**Solution:**
- Increment nonce for each new intent
- Track nonces per house, not globally
- Never reuse a nonce

### Wrong round

**Cause:** `intent.round != matchState.round`

**Solution:**
- Query current match round before signing
- Do not pre-sign multiple rounds in advance
- Update round in intent when submitting

### Unauthorized house

**Cause:** `houseToPlayer[matchId][houseId] != msg.sender`

**Solution:**
- Ensure you joined the match with this house
- Use correct houseId for this player
- Verify `houseToPlayer` mapping in contract

---

## FAQ

**Q: Can I sign multiple intents in advance?**

A: No. Each intent must be signed for the specific round being played. Pre-signing future rounds will fail because the round will not match.

**Q: Can I modify an intent after signing?**

A: No. EIP-712 signatures are cryptographically bound to the exact data. Any modification invalidates the signature.

**Q: What if my deadline expires before I submit?**

A: The transaction will be rejected. Add a 30-60 second buffer to account for network latency and block time.

**Q: Can the same nonce be used in different matches?**

A: Yes. Nonces are tracked per house per match. You can use nonce `1` in match `1` and nonce `1` again in match `2`.

**Q: What if I lose access to my wallet?**

A: Your house is controlled by your wallet. If you lose access, you cannot submit intents and will fall back to the default action (FORTIFY on home territory) each round.

**Q: Is the signature stored onchain?**

A: Yes. The signature is stored in `submittedIntents[matchId][houseId]` and verified during settlement. It is part of the authoritative onchain state.

---

## IMPLEMENTATION CHECKLIST

- [ ] Wallet connected to Monad (chainId 9001)
- [ ] Contract address obtained from deployment
- [ ] Domain separator verified against `getDomainSeparator()`
- [ ] EIP-712 signing library integrated (viem/wagmi/ethers)
- [ ] Intent struct defined with exact field types
- [ ] Action/TargetType enums defined (0-6, 0-4 respectively)
- [ ] Nonce tracking implemented (per house, per match)
- [ ] Deadline calculation implemented (current time + buffer)
- [ ] Signature submission implemented
- [ ] Error handling for rejected intents
- [ ] User feedback for successful submission

---

Generated: 2026-08-14  
For questions: Refer to CONTRACT_REQUIREMENTS.md and GAME_STATE_SPEC.md
