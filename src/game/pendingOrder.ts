import type { Intent } from "../types";

export type PendingOrder = {
  matchId: string;
  round: number;
  houseId: number;
  action: number;
  targetType: number;
  targetId: number;
  nonce: string;
  deadline: string;
  signer: string;
  signature: string;
};

const ORDER_KEY = "oaths-ashes-pending-order";

export function savePendingOrder(order: PendingOrder) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

export function loadPendingOrder(): PendingOrder | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingOrder;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  localStorage.removeItem(ORDER_KEY);
}

export function orderMatchesRound(order: PendingOrder | null, matchId: bigint, round: number): boolean {
  if (!order) return false;
  return order.matchId === matchId.toString() && order.round === round;
}

export function toContractIntent(order: PendingOrder): Intent {
  return {
    matchId: BigInt(order.matchId),
    round: order.round,
    houseId: order.houseId,
    action: order.action,
    targetType: order.targetType,
    targetId: order.targetId,
    nonce: BigInt(order.nonce),
    deadline: BigInt(order.deadline),
    signer: order.signer,
    signature: order.signature,
  };
}

export function fromSignedIntent(intent: Intent): PendingOrder {
  return {
    matchId: intent.matchId.toString(),
    round: intent.round,
    houseId: intent.houseId,
    action: intent.action,
    targetType: intent.targetType,
    targetId: intent.targetId,
    nonce: intent.nonce.toString(),
    deadline: intent.deadline.toString(),
    signer: intent.signer,
    signature: intent.signature,
  };
}
