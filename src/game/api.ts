import { apiBaseUrl } from "./session";

export async function bootstrapAiHouses(matchId: bigint, excludeHouseId: number) {
  const base = apiBaseUrl();
  if (!base) return { ok: false, reason: "API not configured" };
  const res = await fetch(`${base}/api/match/${matchId.toString()}/bootstrap-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ excludeHouseId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "AI bootstrap failed");
  }
  return res.json();
}

export async function requestAiRound(matchId: bigint) {
  const base = apiBaseUrl();
  if (!base) return null;
  const res = await fetch(`${base}/api/match/${matchId.toString()}/ai-round`, {
    method: "POST",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function requestSettle(matchId: bigint) {
  const base = apiBaseUrl();
  if (!base) return null;
  const res = await fetch(`${base}/api/match/${matchId.toString()}/settle`, {
    method: "POST",
  });
  if (!res.ok) return null;
  return res.json();
}
