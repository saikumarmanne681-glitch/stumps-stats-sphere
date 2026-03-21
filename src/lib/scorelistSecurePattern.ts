function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export interface SecurePatternOptions {
  matchId: string;
  checksum: string;
  timestamp: string;
  enableSecurePattern?: boolean;
}

export interface SecurePatternLayer {
  enabled: boolean;
  microtext: string;
  backgroundImage: string;
  style: string;
  visibleLabel: string;
}

export function buildSecurePatternLayer(options: SecurePatternOptions): SecurePatternLayer {
  const microtext = `MATCH-${options.matchId || 'NA'}-${options.checksum}-${options.timestamp}`;
  if (!options.enableSecurePattern) {
    return { enabled: false, microtext, backgroundImage: '', style: '', visibleLabel: microtext };
  }

  const seed = hashString(microtext);
  const width = 900;
  const height = 1200;
  const spacing = 14 + (seed % 7);
  const amplitude = 4 + (seed % 5);
  const phase = (seed % 360) * (Math.PI / 180);
  const altSpacing = spacing + 9;
  const altAmplitude = amplitude + 2;

  const lines: string[] = [];
  for (let y = -40; y <= height + 40; y += spacing) {
    const c1 = y + Math.sin((y + phase) / 48) * amplitude;
    const c2 = y + Math.cos((y + phase) / 57) * (amplitude + 1);
    const end = y + Math.sin((y + phase) / 63) * amplitude;
    lines.push(`<path d="M -40 ${y.toFixed(2)} C ${width * 0.25} ${c1.toFixed(2)}, ${width * 0.65} ${c2.toFixed(2)}, ${width + 40} ${end.toFixed(2)}" />`);
  }

  for (let y = -60; y <= height + 60; y += altSpacing) {
    const c1 = y + Math.cos((y + phase) / 39) * altAmplitude;
    const c2 = y + Math.sin((y + phase) / 44) * (altAmplitude + 1);
    const end = y + Math.cos((y + phase) / 52) * altAmplitude;
    lines.push(`<path d="M -20 ${y.toFixed(2)} C ${width * 0.3} ${c1.toFixed(2)}, ${width * 0.7} ${c2.toFixed(2)}, ${width + 20} ${end.toFixed(2)}" class="alt" />`);
  }

  const hiddenText = Array.from({ length: 12 }, (_, index) => {
    const x = 42 + (index % 3) * (width / 3.15);
    const y = 96 + index * 86;
    return `<text x="${x}" y="${y}" class="micro">${microtext}</text>`;
  }).join('');

  const visibleLabel = `SECURE PATTERN • ${microtext}`;
  const visibleBands = Array.from({ length: 4 }, (_, index) => {
    const y = 170 + index * 230;
    return `<g transform="translate(${width / 2}, ${y}) rotate(-24)">
      <rect x="-260" y="-18" width="520" height="36" rx="18" class="label-band" />
      <text text-anchor="middle" dominant-baseline="middle" class="visible-label">${visibleLabel}</text>
    </g>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <style>
        .wave { fill: none; stroke: rgba(22, 101, 52, 0.24); stroke-width: 0.9; }
        .alt { fill: none; stroke: rgba(14, 116, 144, 0.18); stroke-width: 0.65; }
        .micro { fill: rgba(22, 101, 52, 0.22); font-size: 7px; letter-spacing: 1.05px; font-family: Arial, sans-serif; }
        .label-band { fill: rgba(255, 255, 255, 0.58); stroke: rgba(22, 101, 52, 0.24); stroke-width: 1; }
        .visible-label { fill: rgba(11, 89, 53, 0.34); font-size: 18px; font-weight: 700; letter-spacing: 1.8px; font-family: Arial, sans-serif; }
      </style>
    </defs>
    <rect width="100%" height="100%" fill="white" fill-opacity="0" />
    <g class="wave">${lines.join('')}</g>
    ${visibleBands}
    ${hiddenText}
  </svg>`;

  return {
    enabled: true,
    microtext,
    backgroundImage: encodeSvg(svg),
    visibleLabel,
    style: `background-image:url("${encodeSvg(svg)}");background-repeat:repeat;background-size:680px 920px;opacity:0.32;`,
  };
}
