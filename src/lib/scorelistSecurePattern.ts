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
  // Slightly wider spacing to accommodate text clearly
  const spacing = 24 + (seed % 7); 
  const amplitude = 6 + (seed % 5);
  const phase = (seed % 360) * (Math.PI / 180);
  
  const lines: string[] = [];
  const textPaths: string[] = [];

  // Create a long repeated string so it fills the entire line horizontally
  const repeatedText = `${microtext} • `.repeat(15);

  let pathCounter = 0;

  for (let y = -40; y <= height + 40; y += spacing) {
    pathCounter++;
    const pathId = `wave-path-${pathCounter}`;
    
    const c1 = y + Math.sin((y + phase) / 48) * amplitude;
    const c2 = y + Math.cos((y + phase) / 57) * (amplitude + 1);
    const end = y + Math.sin((y + phase) / 63) * amplitude;
    
    const d = `M -40 ${y.toFixed(2)} C ${width * 0.25} ${c1.toFixed(2)}, ${width * 0.65} ${c2.toFixed(2)}, ${width + 40} ${end.toFixed(2)}`;
    
    // 1. Draw the physical wave line
    lines.push(`<path id="${pathId}" d="${d}" class="wave" />`);
    
    // 2. Attach text to the exact same path using <textPath>
    textPaths.push(`
      <text class="path-text" dy="-2">
        <textPath href="#${pathId}" startOffset="2%">${repeatedText}</textPath>
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
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <style>
        /* Faint lines */
        .wave { fill: none; stroke: rgba(22, 101, 52, 0.15); stroke-width: 0.6; }
        
        /* Text that curves along the path */
        .path-text { 
          fill: rgba(22, 101, 52, 0.28); 
          font-size: 8px; 
          letter-spacing: 1.5px; 
          font-family: 'Courier New', Courier, monospace; 
          opacity: 0.7;
        }
        
        .label-band { fill: rgba(255, 255, 255, 0.65); stroke: rgba(22, 101, 52, 0.24); stroke-width: 1; }
        .visible-label { fill: rgba(11, 89, 53, 0.4); font-size: 18px; font-weight: 700; letter-spacing: 1.8px; font-family: Arial, sans-serif; }
      </style>
    </defs>
    <rect width="100%" height="100%" fill="white" fill-opacity="0" />
    <g>${lines.join('')}</g>
    <g>${textPaths.join('')}</g>
    ${visibleBands}
  </svg>`;

  return {
    enabled: true,
    microtext,
    backgroundImage: encodeSvg(svg),
    visibleLabel,
    style: `background-image:url("${encodeSvg(svg)}");background-repeat:repeat;background-size:100% auto;opacity:0.4;`,
  };
}
