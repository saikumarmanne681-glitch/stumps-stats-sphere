import { CertificateRecord } from './v2types';
import { formatInIST } from './time';

function escapePdfText(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

type C3 = [number, number, number];

type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size?: number;
  font?: 'F1' | 'F2';
  color?: C3;
};

function estimateTextWidth(text: string, size = 12) {
  return Math.max(0, String(text || '').length) * size * 0.52;
}

function centerTextX(text: string, size: number, canvasWidth: number) {
  return (canvasWidth - estimateTextWidth(text, size)) / 2;
}

function splitTextByWidth(text: string, maxWidth: number, size: number) {
  const safe = String(text || '').trim();
  if (!safe) return ['N/A'];
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, size) <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function drawText(line: PdfTextLine) {
  const [r, g, b] = line.color ?? [0.08, 0.13, 0.2];
  const size = line.size ?? 12;
  const font = line.font ?? 'F1';
  return `BT ${r} ${g} ${b} rg /${font} ${size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`;
}

/** Draw a filled rectangle */
function rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
  return `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f`;
}

/** Draw a stroked rectangle */
function strokeRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, lw = 1) {
  return `${r} ${g} ${b} RG ${lw} w ${x} ${y} ${w} ${h} re S`;
}

/** Draw a line */
function line(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, lw = 1) {
  return `${r} ${g} ${b} RG ${lw} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

/** Generate corner ornament lines */
function cornerOrnaments(x: number, y: number, size: number, color: C3, mirror: [boolean, boolean]) {
  const [mx, my] = mirror;
  const dx = mx ? -1 : 1;
  const dy = my ? -1 : 1;
  const [cr, cg, cb] = color;
  const ops: string[] = [];
  // L-shaped corner
  ops.push(line(x, y, x + dx * size, y, cr, cg, cb, 1.8));
  ops.push(line(x, y, x, y + dy * size, cr, cg, cb, 1.8));
  // Inner L
  ops.push(line(x + dx * 6, y + dy * 6, x + dx * (size - 8), y + dy * 6, cr, cg, cb, 0.6));
  ops.push(line(x + dx * 6, y + dy * 6, x + dx * 6, y + dy * (size - 8), cr, cg, cb, 0.6));
  // Diamond dot
  const cx = x + dx * 10;
  const cy = y + dy * 10;
  ops.push(`${cr} ${cg} ${cb} rg ${cx - 2} ${cy} m ${cx} ${cy + 2} l ${cx + 2} ${cy} l ${cx} ${cy - 2} l f`);
  return ops;
}

/** Generate repeating decorative border dots */
function decorativeBorderDots(x1: number, y1: number, x2: number, y2: number, color: C3, spacing = 18) {
  const [r, g, b] = color;
  const ops: string[] = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(length / spacing);
  for (let i = 0; i <= steps; i++) {
    const t = i / Math.max(steps, 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    ops.push(`${r} ${g} ${b} rg ${cx - 1} ${cy - 1} 2 2 re f`);
  }
  return ops;
}

function buildCertificatePdf(item: CertificateRecord) {
  const metadata = (() => {
    try { return item.metadata_json ? JSON.parse(item.metadata_json) : {}; } catch { return {}; }
  })();
  const width = 842; // A4 landscape
  const height = 595;
  const isPending = item.approval_status !== 'approved';
  const isRevoked = item.approval_status === 'revoked';
  const theme = item.certificate_template || 'classic';

  const palettes = {
    classic: {
      bgOuter: [0.98, 0.97, 0.94] as C3,
      bgInner: [1, 0.995, 0.98] as C3,
      headerBg: [0.1, 0.18, 0.34] as C3,
      primary: [0.1, 0.2, 0.42] as C3,
      accent: [0.72, 0.55, 0.18] as C3,
      accentLight: [0.88, 0.76, 0.45] as C3,
      text: [0.12, 0.14, 0.18] as C3,
      muted: [0.35, 0.38, 0.42] as C3,
      security: [0.15, 0.35, 0.22] as C3,
    },
    premium: {
      bgOuter: [0.94, 0.95, 0.98] as C3,
      bgInner: [0.97, 0.98, 1] as C3,
      headerBg: [0.08, 0.15, 0.36] as C3,
      primary: [0.1, 0.22, 0.5] as C3,
      accent: [0.25, 0.48, 0.85] as C3,
      accentLight: [0.55, 0.72, 0.95] as C3,
      text: [0.1, 0.12, 0.2] as C3,
      muted: [0.32, 0.36, 0.44] as C3,
      security: [0.12, 0.28, 0.5] as C3,
    },
    gold: {
      bgOuter: [0.99, 0.97, 0.92] as C3,
      bgInner: [1, 0.99, 0.95] as C3,
      headerBg: [0.2, 0.15, 0.04] as C3,
      primary: [0.28, 0.2, 0.04] as C3,
      accent: [0.72, 0.55, 0.1] as C3,
      accentLight: [0.88, 0.74, 0.32] as C3,
      text: [0.18, 0.15, 0.06] as C3,
      muted: [0.4, 0.35, 0.2] as C3,
      security: [0.35, 0.28, 0.08] as C3,
    },
  };
  const p = palettes[theme] || palettes.classic;

  const recipientFontSize = item.recipient_name.length > 36 ? 24 : item.recipient_name.length > 24 ? 28 : 33;
  const verificationTarget = item.verification_url || item.qr_payload || 'N/A';
  const verificationLines = splitTextByWidth(verificationTarget, 320, 8);
  const awardHeader = item.certificate_type === 'winner_team'
    ? 'TOURNAMENT WINNER'
    : item.certificate_type === 'runner_up_team'
      ? 'TOURNAMENT RUNNER-UP'
      : item.certificate_type === 'man_of_match'
        ? 'MAN OF THE MATCH'
        : item.certificate_type === 'man_of_tournament_runs'
          ? 'BEST BATSMAN'
          : item.certificate_type === 'man_of_tournament_wickets'
            ? 'BEST BOWLER'
            : 'OUTSTANDING ALL-ROUNDER';

  const signatureMetadata = (() => {
    try { return item.signatures_json ? JSON.parse(item.signatures_json) : []; } catch { return []; }
  })();

  // ═══════════════════════════════════════════════════════
  // BACKGROUND & BORDERS
  // ═══════════════════════════════════════════════════════
  const background: string[] = [
    // Outer fill
    rect(0, 0, width, height, ...p.bgOuter),
    // Inner panel
    rect(20, 20, width - 40, height - 40, ...p.bgInner),

    // Thick outer border
    strokeRect(12, 12, width - 24, height - 24, ...p.accent, 4),
    // Double inner border
    strokeRect(22, 22, width - 44, height - 44, ...p.primary, 1.5),
    strokeRect(28, 28, width - 56, height - 56, ...p.accent, 0.6),

    // Decorative dot borders
    ...decorativeBorderDots(34, 34, width - 34, 34, p.accentLight, 14),
    ...decorativeBorderDots(34, height - 34, width - 34, height - 34, p.accentLight, 14),
    ...decorativeBorderDots(34, 34, 34, height - 34, p.accentLight, 14),
    ...decorativeBorderDots(width - 34, 34, width - 34, height - 34, p.accentLight, 14),

    // Corner ornaments
    ...cornerOrnaments(38, 38, 40, p.accent, [false, false]),
    ...cornerOrnaments(width - 38, 38, 40, p.accent, [true, false]),
    ...cornerOrnaments(38, height - 38, 40, p.accent, [false, true]),
    ...cornerOrnaments(width - 38, height - 38, 40, p.accent, [true, true]),

    // Header ribbon
    rect(36, height - 84, width - 72, 46, ...p.headerBg),
    // Accent stripe below header
    rect(36, height - 88, width - 72, 4, ...p.accent),

    // Bottom accent bar
    rect(36, 36, width - 72, 6, ...p.accent),

    // Subtle horizontal dividers
    line(80, 370, width - 80, 370, ...p.accentLight, 0.5),
    line(80, 180, width - 80, 180, ...p.accentLight, 0.5),

    // Security strip on the left
    `q`,
    rect(36, 90, 6, height - 180, ...p.security),
    `Q`,

    // Security strip on the right
    `q`,
    rect(width - 42, 90, 6, height - 180, ...p.security),
    `Q`,
  ];

  // ═══════════════════════════════════════════════════════
  // TEXT CONTENT
  // ═══════════════════════════════════════════════════════
  const headerText = 'CRICKET CLUB HONORS BOARD';
  const certOfExcellence = 'CERTIFICATE OF EXCELLENCE';
  const presentedTo = 'This certificate is proudly presented to';
  const tournamentName = String(metadata.tournament || item.tournament_id || 'Tournament');
  const performanceText = `For exceptional performance in ${tournamentName}`;
  const titleText = `\u2014  ${awardHeader}  \u2014`;
  const certTitle = item.title;
  const seasonYear = metadata.seasonYear || item.season_id || 'N/A';
  const awardCategory = metadata.awardCategory || tournamentName;

  const lines: PdfTextLine[] = [
    // Header ribbon text
    { text: headerText, x: centerTextX(headerText, 14, width), y: height - 72, size: 14, font: 'F2', color: [1, 0.95, 0.82] as C3 },

    // Stars decoration
    { text: '\u2605  \u2605  \u2605', x: centerTextX('\u2605  \u2605  \u2605', 16, width), y: height - 100, size: 16, font: 'F1', color: p.accent },

    // Certificate of Excellence
    { text: certOfExcellence, x: centerTextX(certOfExcellence, 32, width), y: height - 138, size: 32, font: 'F2', color: p.primary },

    // Decorative underline text
    { text: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', x: centerTextX('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', 10, width), y: height - 150, size: 10, color: p.accentLight },

    // Presented to
    { text: presentedTo, x: centerTextX(presentedTo, 14, width), y: height - 176, size: 14, color: p.muted },

    // Recipient name (large)
    { text: item.recipient_name, x: centerTextX(item.recipient_name, recipientFontSize, width), y: height - 218, size: recipientFontSize, font: 'F2', color: p.primary },

    // Gold underline for name
    // (handled via line drawing below)

    // Performance text
    { text: performanceText, x: centerTextX(performanceText, 12, width), y: height - 248, size: 12, color: p.text },

    // Award header (bold accent)
    { text: titleText, x: centerTextX(titleText, 18, width), y: height - 278, size: 18, font: 'F2', color: p.accent },

    // Certificate title
    { text: certTitle, x: centerTextX(certTitle, 13, width), y: height - 300, size: 13, font: 'F2', color: p.text },
  ];

  // Name underline
  const nameWidth = estimateTextWidth(item.recipient_name, recipientFontSize);
  const nameStartX = (width - nameWidth) / 2;
  background.push(line(nameStartX, height - 224, nameStartX + nameWidth, height - 224, ...p.accent, 1.2));

  // ═══════════════════════════════════════════════════════
  // DETAILS SECTION (left & right columns)
  // ═══════════════════════════════════════════════════════
  const detailY = 340;
  const detailLines: PdfTextLine[] = [
    // Left column
    { text: 'TOURNAMENT DETAILS', x: 72, y: detailY, size: 9, font: 'F2', color: p.accent },
    { text: `Tournament: ${tournamentName}`, x: 72, y: detailY - 18, size: 10.5, color: p.text },
    { text: `Season: ${seasonYear}`, x: 72, y: detailY - 34, size: 10.5, color: p.text },
    { text: `Award Category: ${awardCategory}`, x: 72, y: detailY - 50, size: 10, color: p.text },
    { text: `Issue Date: ${formatInIST(item.generated_at)}`, x: 72, y: detailY - 66, size: 10.5, color: p.text },

    // Right column
    { text: 'SECURITY & VERIFICATION', x: 480, y: detailY, size: 9, font: 'F2', color: p.security },
    { text: `Certificate ID: ${item.certificate_id}`, x: 480, y: detailY - 18, size: 9.5, color: p.text },
    { text: `Verification Token: ${(item.verification_token || 'N/A').substring(0, 24)}...`, x: 480, y: detailY - 34, size: 8.5, color: p.muted },
    { text: `Approval: ${item.approval_status.toUpperCase()}`, x: 480, y: detailY - 50, size: 10, font: 'F2', color: item.approval_status === 'approved' ? p.security : [0.7, 0.15, 0.1] as C3 },
    { text: `SHA-256: ${(item.security_hash || '').substring(0, 32)}...`, x: 480, y: detailY - 66, size: 7.5, color: p.muted },
  ];
  lines.push(...detailLines);

  // Detail section boxes
  background.push(strokeRect(64, detailY - 76, 370, 90, ...p.primary, 0.5));
  background.push(strokeRect(472, detailY - 76, 310, 90, ...p.security, 0.5));

  // ═══════════════════════════════════════════════════════
  // VERIFICATION SECTION
  // ═══════════════════════════════════════════════════════
  const verifyY = 236;
  lines.push({ text: 'DIGITAL VERIFICATION', x: 72, y: verifyY, size: 9, font: 'F2', color: p.security });
  lines.push({ text: 'Scan QR code or visit URL to verify authenticity:', x: 72, y: verifyY - 16, size: 8.5, color: p.muted });
  verificationLines.forEach((vl, i) => {
    lines.push({ text: vl, x: 72, y: verifyY - 30 - i * 11, size: 8, color: p.primary });
  });

  // QR code placeholder box (with label — actual QR is in the UI, but we show a visual indicator)
  const qrBoxX = 480;
  const qrBoxY = verifyY - 48;
  background.push(strokeRect(qrBoxX, qrBoxY, 60, 60, ...p.primary, 0.8));
  // Inner pattern to suggest QR
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const filled = (row + col) % 2 === 0 || (row < 2 && col < 2) || (row < 2 && col > 3) || (row > 3 && col < 2);
      if (filled) {
        background.push(rect(qrBoxX + 4 + col * 9, qrBoxY + 4 + row * 9, 7, 7, ...p.primary));
      }
    }
  }
  lines.push({ text: 'QR VERIFY', x: qrBoxX + 4, y: qrBoxY - 10, size: 7, font: 'F2', color: p.primary });

  // Verification URL next to QR
  lines.push({ text: 'Verification URL:', x: qrBoxX + 70, y: qrBoxY + 46, size: 8, font: 'F2', color: p.security });
  const shortUrl = verificationTarget.length > 50 ? verificationTarget.substring(0, 50) + '...' : verificationTarget;
  lines.push({ text: shortUrl, x: qrBoxX + 70, y: qrBoxY + 32, size: 7.5, color: p.primary });
  lines.push({ text: `Token: ${(item.verification_token || 'N/A').substring(0, 20)}...`, x: qrBoxX + 70, y: qrBoxY + 18, size: 7, color: p.muted });
  lines.push({ text: `Integrity: SHA-256 Tamper-Evident`, x: qrBoxX + 70, y: qrBoxY + 4, size: 7, color: p.security });

  // ═══════════════════════════════════════════════════════
  // AUTHORIZED SIGNATORIES
  // ═══════════════════════════════════════════════════════
  const sigY = 148;
  const sigLabel = 'AUTHORIZED SIGNATORIES';
  lines.push({ text: sigLabel, x: centerTextX(sigLabel, 11, width), y: sigY + 20, size: 11, font: 'F2', color: p.primary });

  const sigRoles = ['Treasurer', 'Scoring Official', 'Match Referee'];
  const sigPositions = [130, 358, 596];
  const sigBoxWidth = 170;

  sigRoles.forEach((role, idx) => {
    const sx = sigPositions[idx];
    // Signature box
    background.push(strokeRect(sx, sigY - 46, sigBoxWidth, 58, ...p.primary, 0.7));
    // Inner accent line (signature line)
    background.push(line(sx + 10, sigY - 16, sx + sigBoxWidth - 10, sigY - 16, ...p.accent, 0.8));
    // Role label
    lines.push({ text: role, x: sx + (sigBoxWidth - estimateTextWidth(role, 9)) / 2, y: sigY - 38, size: 9, color: p.muted });
  });

  // Fill in actual signatures
  signatureMetadata.forEach((entry: { role?: string; signerName?: string; signedAt?: string }, index: number) => {
    if (index > 2 || !entry?.role || !entry?.signerName) return;
    const roleIdx = sigRoles.indexOf(entry.role);
    if (roleIdx === -1) return;
    const sx = sigPositions[roleIdx];
    lines.push({ text: entry.signerName, x: sx + 10, y: sigY - 6, size: 10, font: 'F2', color: p.primary });
    lines.push({ text: `(${entry.role})`, x: sx + 10, y: sigY - 22, size: 7.5, color: p.muted });
    if (entry.signedAt) {
      lines.push({ text: formatInIST(entry.signedAt), x: sx + 10, y: sigY - 30, size: 7, color: p.muted });
    }
    // Check mark
    lines.push({ text: '\u2713', x: sx + sigBoxWidth - 20, y: sigY - 4, size: 14, font: 'F2', color: p.security });
  });

  // ═══════════════════════════════════════════════════════
  // SECURITY FOOTER STRIP
  // ═══════════════════════════════════════════════════════
  const footerY = 50;
  background.push(rect(36, footerY - 4, width - 72, 18, ...p.headerBg));
  const securityText = `SECURED DOCUMENT  \u2022  SHA-256: ${(item.security_hash || '').substring(0, 40)}  \u2022  ${item.certificate_id}`;
  lines.push({ text: securityText, x: 52, y: footerY, size: 7, font: 'F1', color: [0.85, 0.82, 0.7] as C3 });

  // ═══════════════════════════════════════════════════════
  // WATERMARKS
  // ═══════════════════════════════════════════════════════
  const watermarkOps: string[] = [];

  // Semi-visible diagonal watermark (always present for security)
  watermarkOps.push('q');
  watermarkOps.push('0.88 0.88 0.88 rg');
  // Rotated text for diagonal watermark
  const cos45 = 0.7071;
  const sin45 = 0.7071;
  watermarkOps.push(`BT /F2 28 Tf ${cos45} ${sin45} ${-sin45} ${cos45} 180 220 Tm (VERIFIED MATCH RECORD) Tj ET`);
  watermarkOps.push(`BT /F2 28 Tf ${cos45} ${sin45} ${-sin45} ${cos45} 280 140 Tm (VERIFIED MATCH RECORD) Tj ET`);
  watermarkOps.push('Q');

  // Pending/Revoked prominent watermark
  if (isPending || isRevoked) {
    const watermarkLabel = isRevoked ? 'REVOKED' : 'PENDING APPROVAL';
    watermarkOps.push('q');
    watermarkOps.push(isRevoked ? '0.78 0.12 0.12 rg' : '0.75 0.55 0.1 rg');
    watermarkOps.push(`BT /F2 52 Tf ${cos45} ${sin45} ${-sin45} ${cos45} 200 180 Tm (${watermarkLabel}) Tj ET`);
    watermarkOps.push('Q');
  }

  // Approved seal
  if (item.approval_status === 'approved') {
    // Circle-like seal in bottom right
    const sealX = width - 130;
    const sealY = 78;
    // Outer ring
    watermarkOps.push('q');
    watermarkOps.push(`${p.security[0]} ${p.security[1]} ${p.security[2]} RG 2 w`);
    // Approximate circle with curves
    watermarkOps.push(`${sealX} ${sealY + 28} m ${sealX + 15} ${sealY + 28} ${sealX + 28} ${sealY + 15} ${sealX + 28} ${sealY} c ${sealX + 28} ${sealY - 15} ${sealX + 15} ${sealY - 28} ${sealX} ${sealY - 28} c ${sealX - 15} ${sealY - 28} ${sealX - 28} ${sealY - 15} ${sealX - 28} ${sealY} c ${sealX - 28} ${sealY + 15} ${sealX - 15} ${sealY + 28} ${sealX} ${sealY + 28} c S`);
    // Inner ring
    watermarkOps.push(`${sealX} ${sealY + 22} m ${sealX + 12} ${sealY + 22} ${sealX + 22} ${sealY + 12} ${sealX + 22} ${sealY} c ${sealX + 22} ${sealY - 12} ${sealX + 12} ${sealY - 22} ${sealX} ${sealY - 22} c ${sealX - 12} ${sealY - 22} ${sealX - 22} ${sealY - 12} ${sealX - 22} ${sealY} c ${sealX - 22} ${sealY + 12} ${sealX - 12} ${sealY + 22} ${sealX} ${sealY + 22} c S`);
    watermarkOps.push('Q');
    lines.push({ text: 'OFFICIALLY', x: sealX - 22, y: sealY + 6, size: 8, font: 'F2', color: p.security });
    lines.push({ text: 'CERTIFIED', x: sealX - 20, y: sealY - 6, size: 8, font: 'F2', color: p.security });
    lines.push({ text: '\u2713', x: sealX - 4, y: sealY - 20, size: 14, font: 'F2', color: p.security });
  }

  // ═══════════════════════════════════════════════════════
  // ASSEMBLE PDF
  // ═══════════════════════════════════════════════════════
  const contentOps = [
    ...background,
    ...watermarkOps,
    ...lines.map(drawText),
  ];
  const textStream = contentOps.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >> endobj`,
    `4 0 obj << /Length ${textStream.length} >> stream\n${textStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function getCertificatePdfBlob(item: CertificateRecord) {
  return new Blob([buildCertificatePdf(item)], { type: 'application/pdf' });
}

export function previewCertificatePdf(item: CertificateRecord) {
  const blob = getCertificatePdfBlob(item);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadCertificatePdf(item: CertificateRecord) {
  const blob = getCertificatePdfBlob(item);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.certificate_id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
