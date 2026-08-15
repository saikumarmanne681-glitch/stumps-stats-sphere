/**
 * Advanced guilloche pattern generator (purely decorative / anti-copy visual layer).
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

function escapeXml(value: string) {
  return String(value)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;');
}

export interface GuillocheOptions {
  /** Any stable string (document id + hash) — same seed yields the same pattern. */
  seed: string;
  /** Stroke colour, any CSS colour. Defaults to a deep emerald. */
  color?: string;
  /** Secondary stroke colour, defaults to a muted gold. */
  accentColor?: string;
  /** Stroke opacity 0..1 (default 0.34). */
  opacity?: number;
  size?: number;
  /** Document identifier rendered as a semi-visible engraved text layer. */
  idText?: string;
}

export interface GuillocheLayer {
  seed: number;
  /** data: URI of the tile — repeatable background. */
  dataUri: string;
  /** Ready-to-use inline style for a full-bleed background layer. */
  style: string;
  /** Single rosette medallion (non-tiling) data URI. */
  rosetteDataUri: string;
  /** Repeating semi-visible ID engraving layer (diagonal). */
  idLayerDataUri: string;
  /** Inline style for the ID engraving layer. */
  idLayerStyle: string;
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

/** Flower / star rosette outline built from a modulated radius (dense engraving look). */
function petalPath(
  cx: number,
  cy: number,
  base: number,
  amp: number,
  lobes: number,
  twist: number,
  steps = 720,
) {
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const rad = base + amp * Math.sin(lobes * t + twist);
    const x = cx + rad * Math.cos(t);
    const y = cy + rad * Math.sin(t);
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

/** Build a repeating guilloche tile plus a rosette medallion and an ID engraving layer. */
export function buildGuillocheLayer(options: GuillocheOptions): GuillocheLayer {
  const seed = hashSeed(options.seed || 'guilloche');
  const color = options.color || 'rgba(16, 94, 58, 1)';
  const accent = options.accentColor || 'rgba(176, 141, 55, 1)';
  const opacity = options.opacity ?? 0.34;
  const size = options.size ?? 320;

  const half = size / 2;
  const baseR = half * 0.92;
  const lobes = 7 + (seed % 6);
  const twistBase = (seed % 360) * (Math.PI / 180);

  // 1. Dense central rosette bundle — the classic engraved "sunburst" of a banknote.
  const centralBundle = Array.from({ length: 16 }, (_, index) => {
    const shrink = 1 - index * 0.036;
    const base = baseR * 0.5 * shrink;
    const amp = baseR * 0.3 * shrink;
    const stroke = index % 3 === 0 ? accent : color;
    const strokeOpacity = opacity * (0.55 + (index % 4) * 0.14);
    return `<path d="${petalPath(half, half, base, amp, lobes, twistBase + index * 0.06, 360)}" stroke="${stroke}" stroke-width="0.5" fill="none" stroke-opacity="${strokeOpacity.toFixed(3)}"/>`;
  }).join('');

  // 2. Spirograph interference rings (moiré effect).
  const spiroRings = [0, 1, 2, 3, 4].map((index) => {
    const r = baseR * (0.3 + ((seed >> (index * 3)) % 5) * 0.035) - index * 3;
    const d = baseR * (0.22 + ((seed >> (index * 4 + 2)) % 7) * 0.02);
    const turns = 4 + (((seed >> (index * 5)) % 5) as number);
    const stroke = index % 2 === 0 ? color : accent;
    return `<path d="${spiroPath(baseR - index * 5, r, d, half, half, turns, 560)}" stroke="${stroke}" stroke-width="${(0.45 + index * 0.05).toFixed(2)}" fill="none" stroke-opacity="${(opacity * 0.85).toFixed(3)}"/>`;
  }).join('');

  // 3. Corner medallions so tiles interlock seamlessly across the sheet.
  const cornerRings = [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
  ].map(([cx, cy]) => {
    const bundle = Array.from({ length: 10 }, (_, index) => {
      const shrink = 1 - index * 0.06;
      const base = baseR * 0.2 * shrink;
      const amp = baseR * 0.13 * shrink;
      return `<path d="${petalPath(cx, cy, base, amp, lobes + 2, twistBase - index * 0.08, 360)}" stroke="${index % 2 ? accent : color}" stroke-width="0.45" fill="none" stroke-opacity="${(opacity * 0.7).toFixed(3)}"/>`;
    }).join('');
    return bundle;
  }).join('');

  // 4. Fine wavy line field for the underlying "engine turned" texture.
  const waveField = Array.from({ length: Math.round(size / 11) }, (_, index) => {
    const y = index * 11;
    const amp = 3.2 + (index % 3);
    const pts: string[] = [];
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin((x / size) * Math.PI * 4 + twistBase + index * 0.4) * amp;
      pts.push(`${x} ${yy.toFixed(2)}`);
    }
    return `<path d="M ${pts.join(' L ')}" stroke="${color}" stroke-width="0.3" fill="none" stroke-opacity="${(opacity * 0.28).toFixed(3)}"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g shape-rendering="geometricPrecision">${waveField}${cornerRings}${spiroRings}${centralBundle}</g>
  </svg>`;

  // Rosette medallion — dense, high-detail, for corners / seals.
  const rosetteSize = 260;
  const rHalf = rosetteSize / 2;
  const rosetteOuter = Array.from({ length: 20 }, (_, index) => {
    const shrink = 1 - index * 0.028;
    const base = rHalf * 0.56 * shrink;
    const amp = rHalf * 0.3 * shrink;
    return `<path d="${petalPath(rHalf, rHalf, base, amp, lobes + 4, twistBase + index * 0.06, 420)}" stroke="${index % 3 === 0 ? accent : color}" stroke-width="0.55" fill="none" stroke-opacity="${Math.min(1, opacity * 1.5).toFixed(3)}"/>`;
  }).join('');
  const rosetteInner = Array.from({ length: 16 }, (_, index) => {
    const rr = rHalf * (0.3 - index * 0.014);
    return `<circle cx="${rHalf}" cy="${rHalf}" r="${Math.max(2, rr).toFixed(2)}" stroke="${index % 2 ? accent : color}" stroke-width="0.4" fill="none" stroke-opacity="${Math.min(1, opacity * 1.3).toFixed(3)}"/>`;
  }).join('');
  const rosetteSpiro = [0, 1, 2].map((index) => {
    const R = rHalf * (0.9 - index * 0.14);
    const r = R * (0.32 + index * 0.05);
    return `<path d="${spiroPath(R, r, R * 0.3, rHalf, rHalf, 5 + index, 560)}" stroke="${index % 2 ? accent : color}" stroke-width="0.4" fill="none" stroke-opacity="${Math.min(1, opacity * 1.2).toFixed(3)}"/>`;
  }).join('');
  const rosetteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rosetteSize}" height="${rosetteSize}" viewBox="0 0 ${rosetteSize} ${rosetteSize}">
    <g shape-rendering="geometricPrecision">${rosetteSpiro}${rosetteOuter}${rosetteInner}</g>
  </svg>`;

  // Semi-visible engraved ID layer — repeated diagonal microtext of the document ID.
  const idValue = escapeXml(String(options.idText || options.seed || '').trim() || 'DOCUMENT');
  const idTile = 460;
  const idRepeat = `${idValue}  •  `.repeat(6);
  const idRows = Array.from({ length: 9 }, (_, index) => {
    const y = index * 52 + 26;
    const bold = index % 2 === 0;
    return `<text x="-120" y="${y}" font-family="'Courier New', monospace" font-size="${bold ? 15 : 11}" font-weight="${bold ? 700 : 400}" letter-spacing="${bold ? 3.4 : 2.2}" fill="${bold ? color : accent}" fill-opacity="${(bold ? 0.2 : 0.14).toFixed(2)}">${idRepeat}</text>`;
  }).join('');
  const idSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${idTile}" height="${idTile}" viewBox="0 0 ${idTile} ${idTile}">
    <g transform="rotate(-28 ${idTile / 2} ${idTile / 2})">${idRows}</g>
  </svg>`;
  const idLayerDataUri = encodeSvg(idSvg);

  const dataUri = encodeSvg(svg);

  return {
    seed,
    dataUri,
    rosetteDataUri: encodeSvg(rosetteSvg),
    idLayerDataUri,
    idLayerStyle: `background-image:url("${idLayerDataUri}");background-repeat:repeat;background-size:${idTile}px ${idTile}px;`,
    style: `background-image:url("${dataUri}");background-repeat:repeat;background-size:${size}px ${size}px;`,
  };
}
