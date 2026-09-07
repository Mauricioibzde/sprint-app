import type { FrameRect } from "@/types";
import { isArtPixel } from "@/lib/grid-detect";

export type ContentBBox = { x: number; y: number; w: number; h: number };

export type FrameOffset = { index: number; dx: number; dy: number };

export type MedianOffset = { dx: number; dy: number; count: number };

function bboxInData(
  data: Uint8ClampedArray,
  dataW: number,
  dataH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number
): ContentBBox | null {
  const xa = Math.max(0, Math.min(x0, x1));
  const xb = Math.min(dataW, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1));
  const yb = Math.min(dataH, Math.max(y0, y1));
  if (xb - xa < 1 || yb - ya < 1) return null;
  const s = Math.max(1, step | 0);
  let minX = xb;
  let minY = yb;
  let maxX = xa - 1;
  let maxY = ya - 1;
  for (let y = ya; y < yb; y += s) {
    for (let x = xa; x < xb; x += s) {
      if (!isArtPixel(data, dataW, x, y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function contentBBoxInRect(
  data: Uint8ClampedArray,
  imageW: number,
  imageH: number,
  rect: FrameRect,
  step = 2
): ContentBBox | null {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(imageW, rect.x + rect.w);
  const y1 = Math.min(imageH, rect.y + rect.h);
  const bbox = bboxInData(data, imageW, imageH, x0, y0, x1, y1, step);
  if (!bbox) return null;
  return { x: bbox.x - rect.x, y: bbox.y - rect.y, w: bbox.w, h: bbox.h };
}

export function frameOffsets(
  data: Uint8ClampedArray,
  imageW: number,
  imageH: number,
  rects: FrameRect[]
): FrameOffset[] {
  const out: FrameOffset[] = [];
  for (const rect of rects) {
    const bbox = contentBBoxInRect(data, imageW, imageH, rect, 2);
    if (!bbox) continue;
    const cellCx = rect.w / 2;
    const cellCy = rect.h / 2;
    const artCx = bbox.x + bbox.w / 2;
    const artCy = bbox.y + bbox.h / 2;
    out.push({
      index: rect.index,
      dx: Math.round(cellCx - artCx),
      dy: Math.round(cellCy - artCy)
    });
  }
  return out;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2) return s[mid];
  return Math.round((s[mid - 1] + s[mid]) / 2);
}

export function medianOffset(offsets: FrameOffset[]): MedianOffset | null {
  if (!offsets.length) return null;
  return {
    dx: median(offsets.map((o) => o.dx)),
    dy: median(offsets.map((o) => o.dy)),
    count: offsets.length
  };
}

export function signedPx(n: number): string {
  const v = Math.round(n);
  return (v < 0 ? "−" : "") + Math.abs(v);
}

export function formatAlignDelta(dx: number, dy: number): string {
  return `Δ ${signedPx(dx)}×${signedPx(dy)}`;
}

function copyCell(img: CanvasImageSource, rect: FrameRect): HTMLCanvasElement | null {
  const cell = document.createElement("canvas");
  cell.width = Math.max(1, rect.w);
  cell.height = Math.max(1, rect.h);
  const ctx = cell.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cell.width, cell.height);
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return cell;
}

export function drawAlignedFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  rect: FrameRect,
  destW = rect.w,
  destH = rect.h
) {
  const cell = copyCell(img, rect);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, destW, destH);
  if (!cell) return;
  let bbox: ContentBBox | null = null;
  try {
    const cellCtx = cell.getContext("2d");
    const pixels = cellCtx?.getImageData(0, 0, cell.width, cell.height).data;
    bbox = pixels ? bboxInData(pixels, cell.width, cell.height, 0, 0, cell.width, cell.height, 1) : null;
  } catch {
    bbox = null;
  }
  if (!bbox) {
    ctx.drawImage(cell, 0, 0, cell.width, cell.height, 0, 0, destW, destH);
    return;
  }
  const dx = Math.round((cell.width - bbox.w) / 2);
  const dy = Math.round((cell.height - bbox.h) / 2);
  if (destW === cell.width && destH === cell.height) {
    ctx.drawImage(cell, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, bbox.w, bbox.h);
    return;
  }
  const sx = destW / cell.width;
  const sy = destH / cell.height;
  ctx.drawImage(
    cell,
    bbox.x,
    bbox.y,
    bbox.w,
    bbox.h,
    Math.round(dx * sx),
    Math.round(dy * sy),
    Math.round(bbox.w * sx),
    Math.round(bbox.h * sy)
  );
}
