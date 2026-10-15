// Pure pixel analysis for the lighting criteria. No browser or native APIs here, so it can be tested on raw arrays.
// Nothing here measures how bright a face or a person is: only clipping, edge strength and the tint of neutral areas.
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
  /** Mean Laplacian variance of the sharpest tiles. */
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
    sharpness: params.sharpness ? tiledLaplacianVariance(rgba, width, height, params.sharpness) : null,
    cast: params.cast ? neutralCast(rgba, width, height, params.cast) : null,
  };
}

function tiledLaplacianVariance(rgba: Uint8ClampedArray, width: number, height: number, p: SharpnessParams): number {
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    gray[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  const grid = p.tileGrid;
  const sums = new Float64Array(grid * grid);
  const sq = new Float64Array(grid * grid);
  const counts = new Uint32Array(grid * grid);
  for (let y = 1; y < height - 1; y++) {
    const ty = Math.min(grid - 1, Math.floor((y * grid) / height));
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      const t = ty * grid + Math.min(grid - 1, Math.floor((x * grid) / width));
      sums[t] += lap;
      sq[t] += lap * lap;
      counts[t]++;
    }
  }
  const variances: number[] = [];
  for (let t = 0; t < grid * grid; t++) {
    if (counts[t] === 0) continue;
    const mean = sums[t] / counts[t];
    variances.push(sq[t] / counts[t] - mean * mean);
  }
  variances.sort((a, b) => b - a);
  const top = variances.slice(0, Math.max(1, Math.ceil(variances.length * p.topTileShare)));
  return top.reduce((a, b) => a + b, 0) / top.length;
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
