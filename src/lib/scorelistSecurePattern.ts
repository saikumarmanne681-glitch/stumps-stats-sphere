function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function encodeSvg(svg: string) {
  // CRITICAL FIX: We must use Base64 encoding. Standard URL encoding breaks
  // <textPath href="#id"> references inside CSS background-images across most browsers.
  try {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  } catch (err) {
    // Fallback for environments without btoa
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
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
  const microtext = `MATCH-${options.matchId || "NA"}-${options.checksum}-${options.timestamp}`;
  if (!options.enableSecurePattern) {
    return { enabled: false, microtext, backgroundImage: "", style: "", visibleLabel: microtext };
  }

  const seed = hashString(microtext);
  const width = 900;
  const height = 1200;
  const spacing = 30 + (seed % 10);
  const amplitude = 8 + (seed % 6);
  const phase = (seed % 360) * (Math.PI / 180);

  const lines: string[] = [];
  const textPaths: string[] = [];

  const repeatedText = `${microtext} • `.repeat(20);

  let pathCounter = 0;

  for (let y = -40; y <= height + 40; y += spacing) {
    pathCounter++;
    // Made ID ultra-unique to prevent SVG caching issues in print queues
    const pathId = `wave-${seed}-${pathCounter}`;

    const c1 = y + Math.sin((y + phase) / 48) * amplitude;
    const c2 = y + Math.cos((y + phase) / 57) * (amplitude + 1);
    const end = y + Math.sin((y + phase) / 63) * amplitude;

    const d = `M -40 ${y.toFixed(2)} C ${width * 0.25} ${c1.toFixed(2)}, ${width * 0.65} ${c2.toFixed(2)}, ${width + 40} ${end.toFixed(2)}`;

    lines.push(`<path id="${pathId}" d="${d}" class="wave" />`);

    textPaths.push(`
      <text class="path-text" dy="-2.5">
        <textPath href="#${pathId}" startOffset="1%">${repeatedText}</textPath>
      </text>
    `);
  }

  const visibleLabel = `SECURE PATTERN • ${microtext}`;
  const visibleBands = Array.from({ length: 4 }, (_, index) => {
    const y = 170 + index * 230;
    return `<g transform="translate(${width / 2}, ${y}) rotate(-24)">
      <rect x="-260" y="-18" width="520" height="36" rx="18" class="label-band" />
      <text text-anchor="middle" dominant-baseline="middle" class="visible-label">${visibleLabel}</text>
    </g>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <style>
        /* Greatly increased opacity to ensure it survives PDF rendering */
        .wave { fill: none; stroke: rgba(11, 89, 53, 0.4); stroke-width: 0.8; }
        
        .path-text { 
          fill: rgba(11, 89, 53, 0.55); 
          font-size: 9px; 
          letter-spacing: 1.8px; 
          font-family: 'Courier New', Courier, monospace; 
          font-weight: 600;
        }
        
        .label-band { fill: rgba(255, 255, 255, 0.85); stroke: rgba(11, 89, 53, 0.4); stroke-width: 1.5; }
        .visible-label { fill: rgba(11, 89, 53, 0.7); font-size: 18px; font-weight: bold; letter-spacing: 2px; font-family: Arial, sans-serif; }
      </style>
    </defs>
    <rect width="100%" height="100%" fill="white" fill-opacity="0" />
    <g>${lines.join("")}</g>
    <g>${textPaths.join("")}</g>
    ${visibleBands}
  </svg>`;

  return {
    enabled: true,
    microtext,
    backgroundImage: encodeSvg(svg),
    visibleLabel,
    // CRITICAL FIX: added z-index:-1 and mix-blend-mode to guarantee layer visibility
    style: `background-image:url("${encodeSvg(svg)}");background-repeat:repeat;background-size:100% auto;opacity:0.65;z-index:-1;mix-blend-mode:multiply;`,
  };
}
