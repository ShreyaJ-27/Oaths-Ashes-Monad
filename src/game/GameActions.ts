import type { Signer } from "ethers";
import { createIntentMessage, signIntent, validateIntent } from "../signing";
import { monadAdapter } from "./MonadAdapter";
import type { ActionRequest, GameState, TxPhase } from "./types";
import type { PendingOrder } from "./pendingOrder";
import { fromSignedIntent } from "./pendingOrder";
import { GAME_CONFIG, type Intent } from "../types";

export type ActionCallbacks = {
  onPhase: (phase: TxPhase) => void;
};

export async function signMonadOrder(
  state: GameState,
  signer: Signer,
  playerAddress: string,
  request: ActionRequest,
  callbacks: ActionCallbacks
): Promise<PendingOrder> {
  if (state.mode !== "MONAD") throw new Error("Not in Monad mode");
  if (state.match.status !== 1) throw new Error("Match finished");

  const now = Math.floor(Date.now() / 1000);
  if (state.match.roundDeadline - now < 2) {
    throw new Error("Round deadline too close — wait for settlement");
  }

  const matchId = state.match.id;
  const [match, usedNonce] = await Promise.all([
    monadAdapter.getMatchSummary(matchId),
    monadAdapter.getUsedNonce(matchId, state.playerHouseId),
  ]);

  const round = Number(match.round);
  const nonce = usedNonce + 1n;
  const deadline = BigInt(Number(match.roundDeadline) + 120);

  const message = createIntentMessage(
    matchId,
    round,
    state.playerHouseId,
    request.action,
    request.targetType,
    request.targetId,
    nonce,
    deadline,
    playerAddress
  );

  const validation = await validateIntent(message, null);
  if (!validation.valid) {
    throw new Error(validation.errors.join(", "));
  }

  callbacks.onPhase("signing");
  const signature = await signIntent(signer, message);
  callbacks.onPhase("locked");

  const intent: Intent = { ...message, signature };
  return fromSignedIntent(intent);
}

export function validateActionTarget(
  state: GameState,
  request: ActionRequest
): string | null {
  const actor = state.houses.find((h) => h.houseId === state.playerHouseId);
  if (!actor) return "House unavailable";

  if (request.action === GAME_CONFIG.actions.Attack) {
    const target = state.territories.find((t) => t.territoryId === request.targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId === actor.houseId) return "Cannot attack your own province";
  }

  if (request.action === GAME_CONFIG.actions.Fortify || request.action === GAME_CONFIG.actions.Tax) {
    const target = state.territories.find((t) => t.territoryId === request.targetId);
    if (!target || target.ownerHouseId !== actor.houseId) return "Can only act on owned provinces";
  }

  if (request.action === GAME_CONFIG.actions.Sabotage) {
    const target = state.territories.find((t) => t.territoryId === request.targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId === actor.houseId) return "Cannot sabotage your own province";
  }

  if (request.action === GAME_CONFIG.actions.Dragonstrike) {
    const target = state.territories.find((t) => t.territoryId === request.targetId);
    if (!target) return "Invalid target";
    if (target.ownerHouseId === actor.houseId) return "Choose an enemy province";
    const dragon = state.dragons.find((d) => d.ownerHouseId === actor.houseId && d.alive);
    if (!dragon) return "No bonded dragon available";
  }

  if (request.action === GAME_CONFIG.actions.Diplomacy) {
    if (request.targetId < 1 || request.targetId > 6 || request.targetId === actor.houseId) {
      return "Invalid house target";
    }
  }

  return null;
}
