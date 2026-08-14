/**
 * Guilloche pattern generator (purely decorative / anti-copy visual layer).
 *
 * IMPORTANT: this module is presentation-only. It never participates in
 * hashing, signing or verification of scorelists / certificates.
 */

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
}

export interface GuillocheOptions {
  /** Any stable string (document id + hash) — same seed yields the same pattern. */
  seed: string;
  /** Stroke colour, any CSS colour. Defaults to a deep emerald. */
  color?: string;
  /** Secondary stroke colour, defaults to a muted gold. */
  accentColor?: string;
  /** Stroke opacity 0..1 (default 0.22). */
  opacity?: number;
  size?: number;
}

export interface GuillocheLayer {
  seed: number;
  /** data: URI of the tile — repeatable background. */
  dataUri: string;
  /** Ready-to-use inline style for a full-bleed background layer. */
  style: string;
  /** Single rosette medallion (non-tiling) data URI. */
  rosetteDataUri: string;
}

function spiroPath(
  R: number,
  r: number,
  d: number,
  cx: number,
  cy: number,
  turns: number,
  steps: number,
) {
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const k = (R - r) / r;
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(k * t);
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${points.join(' L ')}`;
}

/** Build a repeating guilloche tile plus a rosette medallion. */
export function buildGuillocheLayer(options: GuillocheOptions): GuillocheLayer {
  const seed = hashSeed(options.seed || 'guilloche');
  const color = options.color || 'rgba(16, 94, 58, 1)';
  const accent = options.accentColor || 'rgba(176, 141, 55, 1)';
  const opacity = options.opacity ?? 0.22;
  const size = options.size ?? 320;

  const half = size / 2;
  const baseR = half * 0.86;
  const rings = [0, 1, 2, 3].map((index) => {
    const r = baseR * (0.34 + ((seed >> (index * 3)) % 5) * 0.035) - index * 4;
    const d = baseR * (0.2 + ((seed >> (index * 4 + 2)) % 7) * 0.02);
    const turns = 3 + (((seed >> (index * 5)) % 4) as number);
    const stroke = index % 2 === 0 ? color : accent;
    return `<path d="${spiroPath(baseR - index * 6, r, d, half, half, turns, 720)}" stroke="${stroke}" stroke-width="${(0.55 + index * 0.08).toFixed(2)}" fill="none" stroke-opacity="${opacity.toFixed(3)}"/>`;
  }).join('');

  const cornerRings = [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
  ].map(([cx, cy], index) => {
    const r = baseR * 0.22 + index * 2;
    const d = baseR * 0.14;
    return `<path d="${spiroPath(baseR * 0.5, r, d, cx, cy, 3 + (index % 3), 480)}" stroke="${index % 2 ? accent : color}" stroke-width="0.5" fill="none" stroke-opacity="${(opacity * 0.75).toFixed(3)}"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g shape-rendering="geometricPrecision">${rings}${cornerRings}</g>
  </svg>`;

  const rosetteSize = 220;
  const rHalf = rosetteSize / 2;
  const rosetteRings = [0, 1, 2, 3, 4].map((index) => {
    const R = rHalf * (0.92 - index * 0.1);
    const r = R * (0.3 + ((seed >> (index * 2)) % 6) * 0.04);
    const d = R * 0.28;
    return `<path d="${spiroPath(R, r, d, rHalf, rHalf, 4 + (index % 3), 720)}" stroke="${index % 2 ? accent : color}" stroke-width="0.6" fill="none" stroke-opacity="${Math.min(1, opacity * 1.8).toFixed(3)}"/>`;
  }).join('');
  const rosetteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rosetteSize}" height="${rosetteSize}" viewBox="0 0 ${rosetteSize} ${rosetteSize}">
    <g shape-rendering="geometricPrecision">${rosetteRings}</g>
  </svg>`;

  const dataUri = encodeSvg(svg);

  return {
    seed,
    dataUri,
    rosetteDataUri: encodeSvg(rosetteSvg),
    style: `background-image:url("${dataUri}");background-repeat:repeat;background-size:${size}px ${size}px;`,
  };
}
