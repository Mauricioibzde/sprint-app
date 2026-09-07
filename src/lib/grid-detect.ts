export type BgSample = { r: number; g: number; b: number };

export type SpriteBlob = { x: number; y: number; w: number; h: number; cx: number; cy: number };

export type SpriteLayout = {
  blobs: SpriteBlob[];
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  cellW: number;
  cellH: number;
  pad: number;
};

function lumOf(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isGuideColor(r: number, g: number, b: number) {
  const isGuideGreen = g > 150 && g > r + 40 && g > b + 40;
  const isGuideCyan = b > 150 && g > 120 && r < 80;
  return isGuideGreen || isGuideCyan;
}

export function sampleBackground(data: Uint8ClampedArray, w: number, h: number): BgSample {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    if (data[i + 3] < 28) {
      const key = -1;
      const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      cur.n += 1;
      buckets.set(key, cur);
      return;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const q = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(q) || { n: 0, r: 0, g: 0, b: 0 };
    cur.n += 1;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    buckets.set(q, cur);
  };

  const step = Math.max(2, Math.floor(Math.min(w, h) / 80));
  for (let x = 0; x < w; x += step) {
    push(x, 0);
    push(x, 1);
    push(x, h - 1);
    push(x, h - 2);
  }
  for (let y = 0; y < h; y += step) {
    push(0, y);
    push(1, y);
    push(w - 1, y);
    push(w - 2, y);
  }
  const corners = [
    [4, 4],
    [w - 5, 4],
    [4, h - 5],
    [w - 5, h - 5]
  ];
  for (const [cx, cy] of corners) {
    for (let y = cy - 6; y <= cy + 6; y += 2) {
      for (let x = cx - 6; x <= cx + 6; x += 2) push(x, y);
    }
  }

  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const cur of buckets.values()) {
    if (cur.n > best.n) best = cur;
  }
  if (best.n < 1) return { r: 0, g: 0, b: 0 };
  if (best.r === 0 && best.g === 0 && best.b === 0 && buckets.get(-1)) return { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(best.r / Math.max(1, best.n)),
    g: Math.round(best.g / Math.max(1, best.n)),
    b: Math.round(best.b / Math.max(1, best.n))
  };
}

export function isArtPixel(data: Uint8ClampedArray, w: number, x: number, y: number, bg?: BgSample): boolean {
  if (x < 0 || y < 0 || x >= w) return false;
  const i = (y * w + x) * 4;
  if (i < 0 || i + 3 >= data.length) return false;
  const a = data[i + 3];
  if (a < 28) return false;
  const r = data[i],
    g = data[i + 1],
    b = data[i + 2];
  if (isGuideColor(r, g, b)) return false;
  if (bg) {
    const dist = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
    return dist > 84;
  }
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  if (maxc <= 24) return false;
  const lum = lumOf(r, g, b);
  return lum > 26 || maxc - minc > 18;
}

export function bandHasArt(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  bg?: BgSample
): boolean {
  const xa = Math.max(0, Math.min(x0, x1));
  const xb = Math.min(w, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1));
  const yb = Math.min(h, Math.max(y0, y1));
  if (xb - xa < 1 || yb - ya < 1) return false;
  const step = Math.max(1, Math.floor(Math.min(xb - xa, yb - ya) / 40));
  for (let y = ya; y < yb; y += step) {
    for (let x = xa; x < xb; x += step) {
      if (isArtPixel(data, w, x, y, bg)) return true;
    }
  }
  return false;
}

export function protectCutsFromContent(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  xCuts: number[],
  yCuts: number[],
  minPad: number,
  bg?: BgSample
) {
  const sampled = bg || sampleBackground(data, w, h);
  const xs = xCuts.map((v) => Math.round(v));
  const ys = yCuts.map((v) => Math.round(v));
  const pad = Math.max(4, minPad | 0);

  for (let i = 1; i < xs.length - 1; i++) {
    let x = xs[i];
    const maxShift = Math.max(4, Math.floor((xs[i + 1] - xs[i - 1]) * 0.22));
    for (let s = 0; s < maxShift; s++) {
      const leftHit = bandHasArt(data, w, h, x - pad, x, 0, h, sampled);
      const rightHit = bandHasArt(data, w, h, x, x + pad, 0, h, sampled);
      if (!leftHit && !rightHit) break;
      if (leftHit && !rightHit) x += 1;
      else if (rightHit && !leftHit) x -= 1;
      else break;
    }
    xs[i] = Math.max(xs[i - 1] + 2, Math.min(xs[i + 1] - 2, x));
  }

  for (let i = 1; i < ys.length - 1; i++) {
    let y = ys[i];
    const maxShift = Math.max(4, Math.floor((ys[i + 1] - ys[i - 1]) * 0.22));
    for (let s = 0; s < maxShift; s++) {
      const topHit = bandHasArt(data, w, h, 0, w, y - pad, y, sampled);
      const botHit = bandHasArt(data, w, h, 0, w, y, y + pad, sampled);
      if (!topHit && !botHit) break;
      if (topHit && !botHit) y += 1;
      else if (botHit && !topHit) y -= 1;
      else break;
    }
    ys[i] = Math.max(ys[i - 1] + 2, Math.min(ys[i + 1] - 2, y));
  }

  if (xs.length >= 2) {
    let x0 = xs[0];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, x0, x0 + pad, 0, h, sampled)) break;
      x0 = Math.max(0, x0 - 1);
    }
    xs[0] = x0;
    let x1 = xs[xs.length - 1];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, x1 - pad, x1, 0, h, sampled)) break;
      x1 = Math.min(w, x1 + 1);
    }
    xs[xs.length - 1] = x1;
  }
  if (ys.length >= 2) {
    let y0 = ys[0];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, 0, w, y0, y0 + pad, sampled)) break;
      y0 = Math.max(0, y0 - 1);
    }
    ys[0] = y0;
    let y1 = ys[ys.length - 1];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, 0, w, y1 - pad, y1, sampled)) break;
      y1 = Math.min(h, y1 + 1);
    }
    ys[ys.length - 1] = y1;
  }

  return { xCuts: xs, yCuts: ys };
}

function smooth1D(activity: ArrayLike<number>, win = 2): Float32Array {
  const n = activity.length;
  const out = new Float32Array(n);
  const r = win;
  for (let i = 0; i < n; i++) {
    let s = 0,
      c = 0;
    for (let k = -r; k <= r; k++) {
      const j = i + k;
      if (j >= 0 && j < n) {
        s += activity[j];
        c++;
      }
    }
    out[i] = s / c;
  }
  return out;
}

function findContentBounds(activity: ArrayLike<number>) {
  let maxA = 0;
  for (let i = 0; i < activity.length; i++) maxA = Math.max(maxA, activity[i]);
  const thr = maxA * 0.06;
  let start = 0,
    end = activity.length - 1;
  while (start < activity.length && activity[start] < thr) start++;
  while (end > start && activity[end] < thr) end--;
  return { start, end };
}

function findLabelGutter(activity: ArrayLike<number>, from: number, to: number): number {
  const slice = Array.from(activity).slice(from, to);
  const smooth = smooth1D(slice, 4);
  let maxA = 0;
  for (let i = 0; i < smooth.length; i++) maxA = Math.max(maxA, smooth[i]);
  const thr = maxA * 0.2;
  const minW = Math.max(6, Math.floor((to - from) * 0.02));
  let i = Math.floor(slice.length * 0.08);
  while (i < smooth.length) {
    if (smooth[i] <= thr) {
      const start = i;
      while (i < smooth.length && smooth[i] <= thr) i++;
      const end = i - 1;
      if (end - start + 1 >= minW) {
        let mid = start,
          best = smooth[start];
        for (let x = start; x <= end; x++) {
          if (smooth[x] <= best) {
            best = smooth[x];
            mid = x;
          }
        }
        return from + mid;
      }
    } else i++;
  }
  return from;
}

function snapCutsToProjection(cuts: number[], activity: ArrayLike<number>): number[] {
  if (cuts.length < 3) return cuts.slice();
  const cell = Math.max(8, Math.round((cuts[cuts.length - 1] - cuts[0]) / (cuts.length - 1)));
  const radius = Math.max(4, Math.floor(cell * 0.28));
  return cuts.map((cut, idx) => {
    if (idx === 0 || idx === cuts.length - 1) return cut;
    let best = cut;
    let bestVal = activity[Math.min(activity.length - 1, Math.max(0, cut))] ?? 1e9;
    const a = Math.max(0, cut - radius);
    const b = Math.min(activity.length - 1, cut + radius);
    for (let x = a; x <= b; x++) {
      if (activity[x] < bestVal) {
        bestVal = activity[x];
        best = x;
      }
    }
    return best;
  });
}

export function readImageData(img: HTMLImageElement | HTMLCanvasElement, w: number, h: number): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2) return s[mid];
  return Math.round((s[mid - 1] + s[mid]) / 2);
}

function clusterByGap(values: number[], gap: number): number[][] {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const g = groups[groups.length - 1];
    if (sorted[i] - g[g.length - 1] > gap) groups.push([sorted[i]]);
    else g.push(sorted[i]);
  }
  return groups;
}

function nearestCluster(value: number, centers: number[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(value - centers[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function findArtBlobs(data: Uint8ClampedArray, w: number, h: number, bg: BgSample): SpriteBlob[] {
  const step = Math.max(2, Math.floor(Math.min(w, h) / 900));
  const gw = Math.ceil(w / step);
  const gh = Math.ceil(h / step);
  const art = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    const y = Math.min(h - 1, gy * step);
    for (let gx = 0; gx < gw; gx++) {
      const x = Math.min(w - 1, gx * step);
      if (isArtPixel(data, w, x, y, bg)) art[gy * gw + gx] = 1;
    }
  }

  const seen = new Uint8Array(gw * gh);
  const blobs: SpriteBlob[] = [];
  const stack = new Int32Array(gw * gh);
  const dirs = [1, -1, gw, -gw];

  for (let start = 0; start < art.length; start++) {
    if (!art[start] || seen[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let minX = gw,
      minY = gh,
      maxX = 0,
      maxY = 0,
      n = 0;
    while (sp) {
      const i = stack[--sp];
      const gx = i % gw;
      const gy = (i / gw) | 0;
      if (gx < minX) minX = gx;
      if (gy < minY) minY = gy;
      if (gx > maxX) maxX = gx;
      if (gy > maxY) maxY = gy;
      n += 1;
      for (const d of dirs) {
        const j = i + d;
        if (j < 0 || j >= art.length || seen[j] || !art[j]) continue;
        if (d === 1 && gx === gw - 1) continue;
        if (d === -1 && gx === 0) continue;
        seen[j] = 1;
        stack[sp++] = j;
      }
    }
    const x = Math.max(0, minX * step);
    const y = Math.max(0, minY * step);
    const bw = Math.min(w - x, (maxX - minX + 1) * step + step);
    const bh = Math.min(h - y, (maxY - minY + 1) * step + step);
    if (n < 8 || bw < 6 || bh < 6) continue;
    blobs.push({
      x,
      y,
      w: bw,
      h: bh,
      cx: x + bw / 2,
      cy: y + bh / 2
    });
  }
  return blobs;
}

function filterSpriteBlobs(blobs: SpriteBlob[], w: number, h: number): SpriteBlob[] {
  if (!blobs.length) return [];
  const minSide = Math.max(14, Math.round(Math.min(w, h) * 0.018));
  const minArea = Math.max(180, Math.round(w * h * 0.00012));
  const sized = blobs.filter((b) => b.w >= minSide && b.h >= minSide && b.w * b.h >= minArea);
  if (!sized.length) return [];
  const areas = sized.map((b) => b.w * b.h).sort((a, b) => b - a);
  const largest = areas[0];
  const typical = median(areas.slice(0, Math.max(1, Math.ceil(areas.length * 0.4))));
  const areaFloor = Math.max(largest * 0.18, typical * 0.22);
  const maxH = Math.max(...sized.map((b) => b.h));
  const sprites = sized.filter((b) => b.w * b.h >= areaFloor && b.h >= maxH * 0.28 && b.w >= minSide * 1.2);
  return sprites.length ? sprites : sized.filter((b) => b.w * b.h >= largest * 0.25);
}

function layoutFromBlobs(blobs: SpriteBlob[], w: number, h: number, gutterHint: number): SpriteLayout | null {
  if (blobs.length < 1) return null;
  const medW = median(blobs.map((b) => b.w));
  const medH = median(blobs.map((b) => b.h));
  const yGroups = clusterByGap(
    blobs.map((b) => b.cy),
    Math.max(medH * 0.45, 16)
  );
  const xGroups = clusterByGap(
    blobs.map((b) => b.cx),
    Math.max(medW * 0.45, 16)
  );
  const rowCenters = yGroups.map((g) => median(g)).sort((a, b) => a - b);
  const colCenters = xGroups.map((g) => median(g)).sort((a, b) => a - b);
  const rows = rowCenters.length;
  const cols = colCenters.length;
  if (rows < 1 || cols < 1) return null;
  if (blobs.length < Math.max(1, Math.round(cols * rows * 0.35))) return null;

  const assigned = blobs.map((b) => ({
    ...b,
    col: nearestCluster(b.cx, colCenters),
    row: nearestCluster(b.cy, rowCenters)
  }));

  const maxW = Math.max(...assigned.map((b) => b.w));
  const maxH = Math.max(...assigned.map((b) => b.h));

  const gapsX: number[] = [];
  const gapsY: number[] = [];
  for (let r = 0; r < rows; r++) {
    const row = assigned.filter((b) => b.row === r).sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - (row[i - 1].x + row[i - 1].w);
      if (gap > 2) gapsX.push(gap);
    }
  }
  for (let c = 0; c < cols; c++) {
    const col = assigned.filter((b) => b.col === c).sort((a, b) => a.y - b.y);
    for (let i = 1; i < col.length; i++) {
      const gap = col[i].y - (col[i - 1].y + col[i - 1].h);
      if (gap > 2) gapsY.push(gap);
    }
  }

  const pitchX =
    colCenters.length > 1 ? median(colCenters.slice(1).map((v, i) => v - colCenters[i])) : maxW + gutterHint * 2;
  const pitchY =
    rowCenters.length > 1 ? median(rowCenters.slice(1).map((v, i) => v - rowCenters[i])) : maxH + gutterHint * 2;
  const halfGap = Math.floor(Math.min(gapsX.length ? median(gapsX) : pitchX - maxW, gapsY.length ? median(gapsY) : pitchY - maxH) / 2);
  const pad = Math.max(6, gutterHint, Math.min(Math.max(4, halfGap), Math.round(Math.min(maxW, maxH) * 0.18)));

  const cellW = Math.max(8, Math.round(Math.max(maxW + pad * 2, pitchX)));
  const cellH = Math.max(8, Math.round(Math.max(maxH + pad * 2, pitchY)));

  const originCandidatesX = assigned.map((b) => b.x - pad - b.col * cellW);
  const originCandidatesY = assigned.map((b) => b.y - pad - b.row * cellH);
  let originX = Math.max(0, median(originCandidatesX));
  let originY = Math.max(0, median(originCandidatesY));

  if (originX + cols * cellW > w + cellW * 0.05) originX = Math.max(0, w - cols * cellW);
  if (originY + rows * cellH > h + cellH * 0.05) originY = Math.max(0, h - rows * cellH);
  originX = Math.max(0, originX);
  originY = Math.max(0, originY);

  return {
    blobs: assigned,
    cols,
    rows,
    originX: Math.round(originX),
    originY: Math.round(originY),
    cellW,
    cellH,
    pad
  };
}

function gridHitsArt(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  originX: number,
  originY: number,
  cellW: number,
  cellH: number,
  cols: number,
  rows: number,
  bg: BgSample,
  blobs: SpriteBlob[]
) {
  if (!blobs.length) return false;
  const left = Math.min(...blobs.map((b) => b.x));
  const right = Math.max(...blobs.map((b) => b.x + b.w));
  const top = Math.min(...blobs.map((b) => b.y));
  const bot = Math.max(...blobs.map((b) => b.y + b.h));
  const band = 3;
  for (let c = 0; c <= cols; c++) {
    const x = originX + c * cellW;
    if (x < left - 2 || x > right + 2) continue;
    if (bandHasArt(data, w, h, x - band, x + band, top, bot, bg)) return true;
  }
  for (let r = 0; r <= rows; r++) {
    const y = originY + r * cellH;
    if (y < top - 2 || y > bot + 2) continue;
    if (bandHasArt(data, w, h, left, right, y - band, y + band, bg)) return true;
  }
  return false;
}

function fitUniformGrid(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  layout: SpriteLayout,
  bg: BgSample
): SpriteLayout {
  const { cols, rows } = layout;
  let { originX, originY, cellW, cellH, pad } = layout;
  for (let i = 0; i < 10; i++) {
    if (!gridHitsArt(data, w, h, originX, originY, cellW, cellH, cols, rows, bg, layout.blobs)) break;
    cellW += 2;
    cellH += 2;
    originX = Math.max(0, originX - 1);
    originY = Math.max(0, originY - 1);
    pad += 1;
  }
  return { ...layout, originX, originY, cellW, cellH, pad };
}

export function detectSpriteLayout(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  opts?: { gutter?: number }
): SpriteLayout | null {
  const bg = sampleBackground(data, w, h);
  const raw = findArtBlobs(data, w, h, bg);
  const sprites = filterSpriteBlobs(raw, w, h);
  const gutter = Math.max(6, opts?.gutter || 8);
  const layout = layoutFromBlobs(sprites, w, h, gutter);
  if (!layout) return null;
  return fitUniformGrid(data, w, h, layout, bg);
}

export function detectGenericGrid(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  targetCols: number,
  targetRows: number
): { xCuts: number[]; yCuts: number[] } | null {
  const bg = sampleBackground(data, w, h);
  const step = Math.max(1, Math.floor(Math.min(w, h) / 1000));
  const colAct = new Float32Array(w);
  const rowAct = new Float32Array(h);

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (!isArtPixel(data, w, x, y, bg)) continue;
      colAct[x] += 1;
      rowAct[y] += 1;
    }
  }
  for (let x = 1; x < w; x++) if (!colAct[x]) colAct[x] = colAct[x - 1];
  for (let y = 1; y < h; y++) if (!rowAct[y]) rowAct[y] = rowAct[y - 1];

  const xSmooth = smooth1D(colAct, 3);
  const ySmooth = smooth1D(rowAct, 3);
  const xb = findContentBounds(xSmooth);
  const yb = findContentBounds(ySmooth);

  let gridLeft = findLabelGutter(xSmooth, xb.start, Math.min(w - 1, xb.start + Math.floor(w * 0.32)));
  if (gridLeft <= xb.start + 4) gridLeft = xb.start;
  gridLeft = Math.min(w - 2, gridLeft + Math.max(2, Math.floor(w * 0.002)));

  const gridRight = xb.end;
  const gridTop = yb.start;
  const gridBottom = yb.end;

  if (gridRight - gridLeft < targetCols * 8 || gridBottom - gridTop < targetRows * 8) return null;

  let xCuts = buildUniformLocal(gridLeft, gridRight, targetCols);
  let yCuts = buildUniformLocal(gridTop, gridBottom, targetRows);
  xCuts = snapCutsToProjection(xCuts, xSmooth);
  yCuts = snapCutsToProjection(yCuts, ySmooth);
  xCuts = [...new Set(xCuts)].sort((a, b) => a - b);
  yCuts = [...new Set(yCuts)].sort((a, b) => a - b);
  if (xCuts.length !== targetCols + 1) xCuts = buildUniformLocal(gridLeft, gridRight, targetCols);
  if (yCuts.length !== targetRows + 1) yCuts = buildUniformLocal(gridTop, gridBottom, targetRows);
  return { xCuts, yCuts };
}

function buildUniformLocal(start: number, end: number, count: number): number[] {
  const cuts: number[] = [];
  for (let i = 0; i <= count; i++) cuts.push(Math.round(start + (i / count) * (end - start)));
  return cuts;
}
