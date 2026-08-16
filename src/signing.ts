import { Signer, TypedDataDomain, toBeHex } from "ethers";
import { MONAD_CONFIG, GAME_CONFIG, Intent } from "./types";

// EIP-712 Types matching INTENT_SIGNING_SPEC.md exactly
export const EIP712_TYPES = {
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

// EIP-712 Domain
export function getDomain(chainId?: number): TypedDataDomain {
  return {
    name: "OathsAndAshes",
    version: "1",
    chainId: chainId || MONAD_CONFIG.chainId,
    verifyingContract: MONAD_CONFIG.contractAddress,
  };
}

// Create intent message
export interface IntentMessage {
  matchId: bigint;
  round: number;
  houseId: number;
  action: number;
  targetType: number;
  targetId: number;
  nonce: bigint;
  deadline: bigint;
  signer: string;
}

export function createIntentMessage(
  matchId: bigint,
  round: number,
  houseId: number,
  action: number,
  targetType: number,
  targetId: number,
  nonce: bigint,
  deadline: bigint,
  signer: string
): IntentMessage {
  return {
    matchId,
    round,
    houseId,
    action,
    targetType,
    targetId,
    nonce,
    deadline,
    signer,
  };
}

// Sign intent using EIP-712
export async function signIntent(
  signer: Signer,
  message: IntentMessage,
  chainId?: number
): Promise<string> {
  const domain = getDomain(chainId);

  const signature = await signer.signTypedData(domain, EIP712_TYPES, message);

  return signature;
}

// Create deadline (current time + buffer in seconds)
export function createDeadline(bufferSeconds: number = 30): bigint {
  const now = Math.floor(Date.now() / 1000);
  return BigInt(now + bufferSeconds);
}

// Validate intent before signing
export async function validateIntent(
  message: IntentMessage,
  provider: any
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check deadline is in future
  const now = Math.floor(Date.now() / 1000);
  if (Number(message.deadline) <= now) {
    errors.push("Deadline is in the past");
  }

  // Check signer address format
  if (!message.signer.match(/^0x[0-9a-fA-F]{40}$/)) {
    errors.push("Invalid signer address");
  }

  // Check nonce is positive
  if (message.nonce <= 0n) {
    errors.push("Nonce must be positive");
  }

  // Check action is valid
  if (message.action < 0 || message.action > 6) {
    errors.push("Invalid action");
  }

  // Check target type is valid
  if (message.targetType < 0 || message.targetType > 4) {
    errors.push("Invalid target type");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
