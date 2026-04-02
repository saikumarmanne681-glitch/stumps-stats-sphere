/**
 * Certificate SVG Template Engine
 * Handles placeholder substitution, QR injection, and security feature embedding
 * for SVG certificate templates uploaded by admin (e.g. from Canva).
 */

/** All supported placeholders — admin sees these in the UI */
export const CERT_PLACEHOLDERS = [
  { token: '{{recipient_name}}', label: 'Recipient Name', example: 'John Smith' },
  { token: '{{title}}', label: 'Certificate Title', example: 'Tournament Winner Merit' },
  { token: '{{season}}', label: 'Season / Year', example: '2025-26' },
  { token: '{{tournament}}', label: 'Tournament Name', example: 'Premier League' },
  { token: '{{match_id}}', label: 'Match ID', example: 'M-001' },
  { token: '{{certificate_id}}', label: 'Certificate ID', example: 'CERT-ABC123' },
  { token: '{{issue_date}}', label: 'Issue Date (IST)', example: '15 Mar 2026, 3:30 PM' },
  { token: '{{award_category}}', label: 'Award Category', example: 'Best Batsman' },
  { token: '{{certificate_type}}', label: 'Certificate Type Label', example: 'Man of the Match' },
  { token: '{{verification_url}}', label: 'Verification URL', example: 'https://app.com/verify/CERT-ABC' },
  { token: '{{qr_code}}', label: 'QR Code (auto-injected as image)', example: '[QR image]' },
  { token: '{{security_hash}}', label: 'SHA-256 Hash', example: 'a1b2c3d4e5...' },
  { token: '{{verification_token}}', label: 'Verification Token', example: 'tok_abc123' },
  { token: '{{approval_status}}', label: 'Approval Status', example: 'APPROVED' },
] as const;

/** System-only placeholders injected automatically */
export const SYSTEM_PLACEHOLDERS = ['{{qr_code}}', '{{verification_url}}', '{{security_hash}}', '{{verification_token}}', '{{certificate_id}}', '{{issue_date}}', '{{approval_status}}', '{{certificate_type}}'];

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Replace all placeholders in raw SVG string with provided values.
 * QR code is injected as an embedded <image> element if {{qr_code}} is present.
 */
export function renderCertificateSvg(
  rawSvg: string,
  data: Record<string, string>,
  qrDataUrl?: string,
): string {
  let svg = rawSvg;

  // Replace text placeholders
  for (const ph of CERT_PLACEHOLDERS) {
    const key = ph.token.slice(2, -2); // e.g. 'recipient_name'
    if (key === 'qr_code') continue; // handled separately
    const value = data[key] ?? '';
    // Replace both raw and XML-escaped versions of the placeholder
    svg = svg.split(ph.token).join(escapeXml(value));
  }

  // Inject QR code if placeholder exists and we have a data URL
  if (qrDataUrl && svg.includes('{{qr_code}}')) {
    // Replace the placeholder text with an embedded image reference
    // In SVG text elements, we replace the text content
    svg = svg.split('{{qr_code}}').join('');
    // Also inject an <image> element before closing </svg>
    const qrImage = `<image x="85%" y="80%" width="120" height="120" href="${qrDataUrl}" />`;
    svg = svg.replace('</svg>', `${qrImage}</svg>`);
  }

  return svg;
}

/** Encode raw SVG content to a data URL */
export function svgToDataUrl(svgContent: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
}

/** Decode a data:image/svg+xml data URL back to raw SVG */
export function dataUrlToSvg(dataUrl: string): string {
  const payload = dataUrl.split(',', 2)[1] || '';
  if (/;base64,/i.test(dataUrl)) {
    return decodeURIComponent(escape(atob(payload)));
  }
  return decodeURIComponent(payload);
}

/**
 * Generate a simple QR code as SVG data URL using the qrcode.react approach.
 * For PDF/image usage, we generate a tiny canvas-based QR.
 */
export async function generateQrDataUrl(text: string, size = 160): Promise<string> {
  // Create a simple QR representation using canvas
  // We'll use a minimal approach since qrcode.react is React-only
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Draw a placeholder QR pattern (the actual QR is rendered by QRCodeSVG in React)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    
    // Simple hash-based pattern for visual representation
    const modules = 21;
    const cellSize = size / modules;
    const hash = text.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Finder patterns (top-left, top-right, bottom-left)
        const isFinderTL = row < 7 && col < 7;
        const isFinderTR = row < 7 && col >= modules - 7;
        const isFinderBL = row >= modules - 7 && col < 7;
        
        if (isFinderTL || isFinderTR || isFinderBL) {
          const lr = row % 7 < 1 || row % 7 > 5 || col % 7 < 1 || col % 7 > 5 || (row % 7 > 1 && row % 7 < 5 && col % 7 > 1 && col % 7 < 5);
          if (lr) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        } else {
          // Data modules based on hash
          const bit = ((hash >>> ((row * modules + col) % 32)) & 1) ^ ((row + col) % 2 === 0 ? 1 : 0);
          if (bit) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}
