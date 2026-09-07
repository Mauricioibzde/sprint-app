import type { CSSProperties } from "react";
import type { FrameRect, Guide, GuideAxis, SheetPreset } from "@/types";

let uidSeq = 0;

export function uid(prefix = "g"): string {
  uidSeq += 1;
  return prefix + "-" + uidSeq;
}

export function percents(guides: Guide[], axis: GuideAxis): number[] {
  return guides
    .filter((g) => g.axis === axis)
    .map((g) => g.percent)
    .sort((a, b) => a - b);
}

export function cutsToGuides(xCuts: number[], yCuts: number[], w: number, h: number): Guide[] {
  const out: Guide[] = [];
  xCuts.forEach((px) => out.push({ id: uid("v"), axis: "v", percent: (px / w) * 100 }));
  yCuts.forEach((px) => out.push({ id: uid("h"), axis: "h", percent: (px / h) * 100 }));
  return out;
}

export function buildPresetCuts(
  w: number,
  h: number,
  labelW: number,
  cellW: number,
  cellH: number,
  nCols: number,
  nRows: number
) {
  return buildLockedGrid({
    originX: labelW,
    originY: 0,
    cellW,
    cellH,
    cols: nCols,
    rows: nRows,
    imageW: w,
    imageH: h,
    snapLastToEdge: true
  });
}

export function scaledPromptCells(
  promptWidth: number,
  promptHeight: number,
  cellW: number,
  cellH: number,
  labelW: number,
  imageW: number,
  imageH: number
) {
  const sx = promptWidth > 0 ? imageW / promptWidth : 1;
  const sy = promptHeight > 0 ? imageH / promptHeight : 1;
  const sameLayout = Math.abs(sx - sy) < 0.02 || (imageW === promptWidth && imageH === promptHeight);
  if (sameLayout) {
    return {
      cellW: Math.max(8, Math.round(cellW * sx)),
      cellH: Math.max(8, Math.round(cellH * sy)),
      defaultOriginX: Math.round(labelW * sx),
      defaultOriginY: 0
    };
  }
  return {
    cellW: Math.max(8, Math.round(cellW)),
    cellH: Math.max(8, Math.round(cellH)),
    defaultOriginX: Math.round(imageW * (labelW / Math.max(1, promptWidth))),
    defaultOriginY: 0
  };
}

export function buildLockedGrid(opts: {
  originX: number;
  originY: number;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  imageW: number;
  imageH: number;
  snapLastToEdge?: boolean;
}) {
  const cellW = Math.max(8, Math.round(opts.cellW));
  const cellH = Math.max(8, Math.round(opts.cellH));
  const cols = Math.max(1, opts.cols);
  const rows = Math.max(1, opts.rows);
  const xCuts: number[] = [];
  const yCuts: number[] = [];
  for (let i = 0; i <= cols; i++) xCuts.push(Math.round(opts.originX + i * cellW));
  for (let i = 0; i <= rows; i++) yCuts.push(Math.round(opts.originY + i * cellH));
  if (opts.snapLastToEdge) {
    if (Math.abs(xCuts[xCuts.length - 1] - opts.imageW) <= 2) xCuts[xCuts.length - 1] = opts.imageW;
    if (Math.abs(yCuts[yCuts.length - 1] - opts.imageH) <= 2) yCuts[yCuts.length - 1] = opts.imageH;
  }
  return { xCuts, yCuts, cellW, cellH };
}

export function lockedGridOrigin(guides: Guide[], imageW: number, imageH: number) {
  const xs = percents(guides, "v").map((p) => Math.round((p / 100) * imageW));
  const ys = percents(guides, "h").map((p) => Math.round((p / 100) * imageH));
  return { originX: xs[0] ?? 0, originY: ys[0] ?? 0 };
}

export function shiftLockedAxis(guides: Guide[], axis: GuideAxis, deltaPercent: number): Guide[] {
  const same = guides.filter((g) => g.axis === axis);
  if (!same.length || !deltaPercent) return guides;
  return guides.map((g) => (g.axis === axis ? { ...g, percent: g.percent + deltaPercent } : g));
}

export function nudgeLockedGrid(guides: Guide[], axis: GuideAxis, deltaPx: number, imageSize: number): Guide[] {
  if (imageSize <= 0 || !deltaPx) return guides;
  return shiftLockedAxis(guides, axis, (deltaPx / imageSize) * 100);
}

export function buildUniformCuts(start: number, end: number, count: number): number[] {
  const cuts: number[] = [];
  for (let i = 0; i <= count; i++) {
    cuts.push(Math.round(start + ((end - start) * i) / count));
  }
  return cuts;
}

export function evenlySpaced(
  count: number,
  start: number,
  end: number,
  gapPx: number,
  size: number
): number[] {
  const positions: number[] = [];
  const gapPct = size > 0 ? (gapPx / size) * 100 : 0;
  const span = end - start - gapPct * Math.max(0, count - 1);
  const step = count > 0 ? span / count : 0;
  for (let i = 0; i <= count; i++) positions.push(start + i * (step + gapPct));
  return positions;
}

export function guidesFromPreset(preset: SheetPreset, imageW: number, imageH: number, gapX: number, gapY: number): Guide[] {
  const originX = (preset.labelW / preset.width) * 100;
  const xs = evenlySpaced(preset.cols, originX, 100, gapX, imageW);
  const ys = evenlySpaced(preset.rows, 0, 100, gapY, imageH);
  const out: Guide[] = [];
  xs.forEach((p) => out.push({ id: uid("v"), axis: "v", percent: p }));
  ys.forEach((p) => out.push({ id: uid("h"), axis: "h", percent: p }));
  return out;
}

export function frameRects(guides: Guide[], imageW: number, imageH: number): FrameRect[] {
  const xs = percents(guides, "v").map((p) => Math.round((p / 100) * imageW));
  const ys = percents(guides, "h").map((p) => Math.round((p / 100) * imageH));
  const rects: FrameRect[] = [];
  if (xs.length < 2 || ys.length < 2) return rects;
  let index = 1;
  for (let r = 0; r < ys.length - 1; r++) {
    for (let c = 0; c < xs.length - 1; c++) {
      rects.push({
        index,
        row: r + 1,
        col: c + 1,
        x: xs[c],
        y: ys[r],
        w: Math.max(1, xs[c + 1] - xs[c]),
        h: Math.max(1, ys[r + 1] - ys[r])
      });
      index += 1;
    }
  }
  return rects;
}

export function gridStyle(guides: Guide[]): CSSProperties | null {
  const xs = percents(guides, "v");
  const ys = percents(guides, "h");
  if (xs.length < 2 || ys.length < 2) return null;
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const y0 = ys[0];
  const y1 = ys[ys.length - 1];
  return {
    left: x0 + "%",
    top: y0 + "%",
    right: 100 - x1 + "%",
    bottom: 100 - y1 + "%",
    gridTemplateColumns: xs
      .slice(0, -1)
      .map((_, i) => Math.max(0.0001, xs[i + 1] - xs[i]) + "fr")
      .join(" "),
    gridTemplateRows: ys
      .slice(0, -1)
      .map((_, i) => Math.max(0.0001, ys[i + 1] - ys[i]) + "fr")
      .join(" ")
  };
}

export function minContentPadForImage(w: number, h: number): number {
  return Math.max(10, Math.round(Math.min(w, h) * 0.012));
}
