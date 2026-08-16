import type { GameMode, PlayerSession } from "./types";

const STORAGE_KEY = "oaths-ashes-player-session";

export function loadSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSession;
    if (!parsed.matchId || !parsed.houseId || !parsed.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: PlayerSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function defaultMode(): GameMode {
  const envMode = import.meta.env.VITE_GAME_MODE as GameMode | undefined;
  if (envMode === "LOCAL") return "LOCAL";
  return "MONAD";
}
