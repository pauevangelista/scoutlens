// Pure pixel analysis for the lighting criteria. No browser or native APIs here, so it can be tested on raw arrays.
// Nothing here measures how bright a face or a person is: only clipping, edge sharpness (independent of contrast) and the tint of neutral areas.
import type { CastParams, ClipParams, SharpnessParams } from '@/scoring/rubric';

export type Cast = {
  /** CIELAB a* of the neutral areas: positive is magenta, negative is green. */
  a: number;
  /** CIELAB b* of the neutral areas: positive is yellow, negative is blue. */
  b: number;
  /** Distance from grey, sqrt(a² + b²). */
  chroma: number;
};

export type PhotoAnalysis = {
  /** Share of pixels clipped to white, 0 to 1. */
  highlightShare: number | null;
  /** Share of pixels clipped to black, 0 to 1. */
  shadowShare: number | null;
  /** Edge sharpness of the strongest-edged tiles, independent of edge contrast. Higher is sharper; 0 when there are no edges. */
  sharpness: number | null;
  /** Tint of neutral areas, or 'no-neutral' when no area is close enough to grey to judge. */
  cast: Cast | 'no-neutral' | null;
};

export type AnalysisParams = {
  highlights?: ClipParams;
  shadows?: ClipParams;
  sharpness?: SharpnessParams;
  cast?: CastParams;
};

/** Analyses RGBA pixels (4 bytes per pixel, row-major). Criteria without params come back as null. */
export function analyzePixels(rgba: Uint8ClampedArray, width: number, height: number, params: AnalysisParams): PhotoAnalysis {
  const n = width * height;
  let highlights = 0;
  let shadows = 0;
  const hi = params.highlights?.clipLevel ?? Infinity;
  const lo = params.shadows?.clipLevel ?? -Infinity;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    if (r >= hi || g >= hi || b >= hi) highlights++;
    if (r <= lo && g <= lo && b <= lo) shadows++;
  }
  return {
    highlightShare: params.highlights ? highlights / n : null,
    shadowShare: params.shadows ? shadows / n : null,
    sharpness: params.sharpness ? tiledEdgeSharpness(rgba, width, height, params.sharpness) : null,
    cast: params.cast ? neutralCast(rgba, width, height, params.cast) : null,
  };
}

/**
 * Edge sharpness that does not depend on edge contrast: per tile, the energy of the Laplacian divided by the energy
 * of the gradient. Both grow with the square of the contrast, so it cancels, and what is left depends only on the
 * edge profile: about 0.67 for an ideal step, 0.3 for a Gaussian blur of 1 pixel, 0.1 for 2 pixels. A light
 * [1 2 1] blur first keeps 8-bit rounding on faint edges from looking like detail. Tiles are ranked by gradient
 * energy only to choose which edges to judge (the strongest share), and their sums are pooled.
 */
/** In-place [1 2 1] / 4 blur along rows, then columns. Edges of the image are left as they are. */
function smooth121(a: Float32Array, width: number, height: number): void {
  const row = new Float32Array(Math.max(width, height));
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width - 1; x++) row[x] = (a[y * width + x - 1] + 2 * a[y * width + x] + a[y * width + x + 1]) / 4;
    for (let x = 1; x < width - 1; x++) a[y * width + x] = row[x];
  }
  for (let x = 0; x < width; x++) {
    for (let y = 1; y < height - 1; y++) row[y] = (a[(y - 1) * width + x] + 2 * a[y * width + x] + a[(y + 1) * width + x]) / 4;
    for (let y = 1; y < height - 1; y++) a[y * width + x] = row[y];
  }
}

function tiledEdgeSharpness(rgba: Uint8ClampedArray, width: number, height: number, p: SharpnessParams): number {
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    gray[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  smooth121(gray, width, height);
  const grid = p.tileGrid;
  const lapSq = new Float64Array(grid * grid);
  const gradSq = new Float64Array(grid * grid);
  const counts = new Uint32Array(grid * grid);
  for (let y = 1; y < height - 1; y++) {
    const ty = Math.min(grid - 1, Math.floor((y * grid) / height));
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      const gx = gray[i + 1] - gray[i];
      const gy = gray[i + width] - gray[i];
      const t = ty * grid + Math.min(grid - 1, Math.floor((x * grid) / width));
      lapSq[t] += lap * lap;
      gradSq[t] += gx * gx + gy * gy;
      counts[t]++;
    }
  }
  const order = Array.from(gradSq.keys())
    .filter((t) => counts[t] > 0)
    .sort((a, b) => gradSq[b] / counts[b] - gradSq[a] / counts[a]);
  if (!order.length) return 0;
  // Noise adds the same energy everywhere and would make faint edges look sharp. Estimate it per pixel from the
  // flattest share of tiles (the plain background in the standard shots) and take it off before dividing.
  const pool = (tiles: number[]) => {
    let l = 0, g = 0, n = 0;
    for (const t of tiles) {
      l += lapSq[t];
      g += gradSq[t];
      n += counts[t];
    }
    return { l, g, n };
  };
  const take = Math.max(1, Math.ceil(order.length * p.topTileShare));
  const noise = pool(order.slice(-Math.max(1, Math.ceil(order.length * p.noiseTileShare))));
  const top = pool(order.slice(0, take));
  const lap = top.l - (top.n * noise.l) / noise.n;
  const grad = top.g - (top.n * noise.g) / noise.n;
  return grad > 0 ? Math.max(0, lap) / grad : 0;
}

const LINEAR = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** Tint of the background, read from a band around the edges where the plain background sits in the standard shots. */
function neutralCast(rgba: Uint8ClampedArray, width: number, height: number, p: CastParams): Cast | 'no-neutral' {
  const bw = Math.round(width * p.borderShare);
  const bh = Math.round(height * p.borderShare);
  const as: number[] = [];
  const bs: number[] = [];
  const chromas: number[] = [];
  for (let px = 0; px < width * height; px++) {
    const x = px % width;
    const y = (px - x) / width;
    if (x >= bw && x < width - bw && y >= bh && y < height - bh) continue;
    const i = px * 4;
    const r = LINEAR[rgba[i]], g = LINEAR[rgba[i + 1]], b = LINEAR[rgba[i + 2]];
    // sRGB (D65) to XYZ, normalised by the D65 white point.
    const fx = labF((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
    const fy = labF(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const fz = labF((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    const L = 116 * fy - 16;
    if (L < p.minLightness || L > p.maxLightness) continue;
    const a = 500 * (fx - fy);
    const bb = 200 * (fy - fz);
    as.push(a);
    bs.push(bb);
    chromas.push(Math.hypot(a, bb));
  }
  if (chromas.length < 100) return 'no-neutral';
  // Within the edge band, the least saturated share of light pixels stands in for "should be grey".
  const order = chromas.map((_, i) => i).sort((x, y) => chromas[x] - chromas[y]);
  const k = Math.max(1, Math.floor(order.length * p.neutralShare));
  let sa = 0, sb = 0, sc = 0;
  for (let j = 0; j < k; j++) {
    const i = order[j];
    sa += as[i];
    sb += bs[i];
    sc += chromas[i];
  }
  if (sc / k > p.maxNeutralChroma) return 'no-neutral';
  const a = sa / k;
  const b = sb / k;
  return { a, b, chroma: Math.hypot(a, b) };
}
