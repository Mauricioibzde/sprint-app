import type { LearnEntry } from "@/types";
import { LEARN_KEY } from "@/lib/constants";

export function learnMemory(): Record<string, LearnEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LEARN_KEY) || "{}") as Record<string, LearnEntry>;
  } catch {
    return {};
  }
}

export function saveLearnMemory(mem: Record<string, LearnEntry>) {
  localStorage.setItem(LEARN_KEY, JSON.stringify(mem));
}

export function clearLearnMemory() {
  localStorage.removeItem(LEARN_KEY);
}

export function learnStatusText(): string {
  const mem = learnMemory();
  const keys = Object.keys(mem);
  if (!keys.length) return "Memória: nenhum ajuste salvo ainda.";
  return (
    "Memória: " +
    keys
      .map((k) => {
        const n = mem[k].count || 0;
        return k + " (" + n + " ajuste" + (n === 1 ? "" : "s") + ")";
      })
      .join(" · ")
  );
}

export function mixLearn(
  currentX: number[],
  currentY: number[],
  entry: LearnEntry,
  safeMarginPx: number
): { x: number[]; y: number[]; weight: number; safeMarginPx: number } | null {
  if (!entry.x || entry.x.length !== currentX.length || entry.y.length !== currentY.length) return null;
  const wgt = Math.min(0.85, 0.35 + entry.count * 0.1);
  const mix = (a: number[], b: number[]) => a.map((v, i) => v * (1 - wgt) + b[i] * wgt);
  return {
    x: mix(currentX, entry.x),
    y: mix(currentY, entry.y),
    weight: wgt,
    safeMarginPx: Math.round(safeMarginPx * (1 - wgt) + (entry.safeMarginPx || safeMarginPx) * wgt)
  };
}

export function upsertLearn(
  key: string,
  snap: { x: number[]; y: number[]; safeMarginPx: number; gapX: number; gapY: number },
  reason: string
) {
  const mem = learnMemory();
  const prev = mem[key];
  if (!prev || prev.x.length !== snap.x.length || prev.y.length !== snap.y.length) {
    mem[key] = {
      count: 1,
      x: snap.x,
      y: snap.y,
      safeMarginPx: snap.safeMarginPx,
      gapX: snap.gapX,
      gapY: snap.gapY,
      lastReason: reason,
      updatedAt: Date.now()
    };
  } else {
    const n = prev.count || 1;
    const a = 1 / (n + 1);
    prev.x = prev.x.map((v, i) => v * (1 - a) + snap.x[i] * a);
    prev.y = prev.y.map((v, i) => v * (1 - a) + snap.y[i] * a);
    prev.safeMarginPx = Math.round(prev.safeMarginPx * (1 - a) + snap.safeMarginPx * a);
    prev.gapX = prev.gapX * (1 - a) + snap.gapX * a;
    prev.gapY = prev.gapY * (1 - a) + snap.gapY * a;
    prev.count = n + 1;
    prev.lastReason = reason;
    prev.updatedAt = Date.now();
    mem[key] = prev;
  }
  saveLearnMemory(mem);
}
