import type { ChainEvent } from "./types";

export class EventManager {
  private seen = new Set<string>();

  merge(events: ChainEvent[]): ChainEvent[] {
    const merged: ChainEvent[] = [];
    for (const event of events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      merged.push(event);
    }
    return merged.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return b.blockNumber - a.blockNumber;
      return b.logIndex - a.logIndex;
    });
  }

  reset() {
    this.seen.clear();
  }
}

export const eventManager = new EventManager();
