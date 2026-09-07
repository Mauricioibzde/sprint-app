export function isArtPixel(data: Uint8ClampedArray, w: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= w) return false;
  const i = (y * w + x) * 4;
  if (i < 0 || i + 3 >= data.length) return false;
  const a = data[i + 3];
  if (a < 28) return false;
  const r = data[i],
    g = data[i + 1],
    b = data[i + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const isGuideGreen = g > 150 && g > r + 40 && g > b + 40;
  const isGuideCyan = b > 150 && g > 120 && r < 80;
  return (a > 200 || lum > 26) && !isGuideGreen && !isGuideCyan;
}

export function bandHasArt(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number
): boolean {
  const xa = Math.max(0, Math.min(x0, x1));
  const xb = Math.min(w, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1));
  const yb = Math.min(h, Math.max(y0, y1));
  if (xb - xa < 1 || yb - ya < 1) return false;
  const step = Math.max(1, Math.floor(Math.min(xb - xa, yb - ya) / 40));
  for (let y = ya; y < yb; y += step) {
    for (let x = xa; x < xb; x += step) {
      if (isArtPixel(data, w, x, y)) return true;
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
  minPad: number
) {
  const xs = xCuts.map((v) => Math.round(v));
  const ys = yCuts.map((v) => Math.round(v));
  const pad = Math.max(4, minPad | 0);

  for (let i = 1; i < xs.length - 1; i++) {
    let x = xs[i];
    const maxShift = Math.max(4, Math.floor((xs[i + 1] - xs[i - 1]) * 0.22));
    for (let s = 0; s < maxShift; s++) {
      const leftHit = bandHasArt(data, w, h, x - pad, x, 0, h);
      const rightHit = bandHasArt(data, w, h, x, x + pad, 0, h);
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
      const topHit = bandHasArt(data, w, h, 0, w, y - pad, y);
      const botHit = bandHasArt(data, w, h, 0, w, y, y + pad);
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
      if (!bandHasArt(data, w, h, x0, x0 + pad, 0, h)) break;
      x0 = Math.max(0, x0 - 1);
    }
    xs[0] = x0;
    let x1 = xs[xs.length - 1];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, x1 - pad, x1, 0, h)) break;
      x1 = Math.min(w, x1 + 1);
    }
    xs[xs.length - 1] = x1;
  }
  if (ys.length >= 2) {
    let y0 = ys[0];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, 0, w, y0, y0 + pad)) break;
      y0 = Math.max(0, y0 - 1);
    }
    ys[0] = y0;
    let y1 = ys[ys.length - 1];
    for (let s = 0; s < pad * 2; s++) {
      if (!bandHasArt(data, w, h, 0, w, y1 - pad, y1)) break;
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

export function detectGenericGrid(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  targetCols: number,
  targetRows: number
): { xCuts: number[]; yCuts: number[] } | null {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 1000));
  const colAct = new Float32Array(w);
  const rowAct = new Float32Array(h);

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 28) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const isGreen = data[i + 1] > 150 && data[i + 1] > data[i] + 40 && data[i + 1] > data[i + 2] + 40;
      if ((a > 200 || lum > 24) && !isGreen) {
        colAct[x] += 1;
        rowAct[y] += 1;
      }
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
