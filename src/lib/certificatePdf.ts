import { CertificateRecord } from './v2types';
import { formatInIST } from './time';

type C3 = [number, number, number];
type FontName = 'F1' | 'F2';

type PdfLine = {
  text: string;
  x: number;
  y: number;
  size?: number;
  font?: FontName;
  color?: C3;
};

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

function sanitizePdfText(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function textWidth(text: string, size = 12) {
  return Math.max(0, String(text || '').length) * size * 0.52;
}

function centerX(text: string, size: number, width = PAGE_WIDTH) {
  return (width - textWidth(text, size)) / 2;
}

function splitByWidth(text: string, maxWidth: number, size: number, maxLines = 3) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['N/A'];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function drawText(line: PdfLine) {
  const c = line.color ?? ([0.15, 0.18, 0.24] as C3);
  const size = line.size ?? 11;
  const font = line.font ?? 'F1';
  const text = sanitizePdfText(line.text);
  return `BT ${c[0]} ${c[1]} ${c[2]} rg /${font} ${size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${text}) Tj ET`;
}

function fillRect(x: number, y: number, w: number, h: number, c: C3) {
  return `${c[0]} ${c[1]} ${c[2]} rg ${x} ${y} ${w} ${h} re f`;
}

function strokeRect(x: number, y: number, w: number, h: number, c: C3, lw = 1) {
  return `${c[0]} ${c[1]} ${c[2]} RG ${lw} w ${x} ${y} ${w} ${h} re S`;
}

function strokeLine(x1: number, y1: number, x2: number, y2: number, c: C3, lw = 1) {
  return `${c[0]} ${c[1]} ${c[2]} RG ${lw} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function buildPalette(theme?: string) {
  const palettes: Record<string, { bg: C3; card: C3; primary: C3; accent: C3; text: C3; muted: C3 }> = {
    classic: { bg: [0.98, 0.97, 0.94], card: [1, 1, 1], primary: [0.1, 0.18, 0.34], accent: [0.72, 0.55, 0.18], text: [0.12, 0.14, 0.18], muted: [0.39, 0.42, 0.46] },
    premium: { bg: [0.95, 0.97, 1], card: [1, 1, 1], primary: [0.12, 0.2, 0.46], accent: [0.2, 0.44, 0.82], text: [0.12, 0.14, 0.2], muted: [0.35, 0.38, 0.45] },
    gold: { bg: [0.99, 0.97, 0.93], card: [1, 1, 1], primary: [0.24, 0.18, 0.05], accent: [0.73, 0.56, 0.14], text: [0.17, 0.14, 0.06], muted: [0.4, 0.34, 0.2] },
    heritage: { bg: [0.99, 0.95, 0.95], card: [1, 1, 1], primary: [0.34, 0.09, 0.11], accent: [0.65, 0.18, 0.2], text: [0.2, 0.12, 0.12], muted: [0.42, 0.3, 0.31] },
    artdeco: { bg: [0.95, 0.99, 0.97], card: [1, 1, 1], primary: [0.04, 0.22, 0.16], accent: [0.05, 0.5, 0.36], text: [0.09, 0.16, 0.12], muted: [0.3, 0.4, 0.35] },
  };
  return palettes[theme || 'classic'] || palettes.classic;
}

function buildCertificatePdf(item: CertificateRecord) {
  const metadata = (() => {
    try {
      return item.metadata_json ? JSON.parse(item.metadata_json) : {};
    } catch {
      return {};
    }
  })();

  const palette = buildPalette(item.certificate_template);
  const tournamentName = String(metadata.tournament || item.tournament_id || 'Tournament');
  const seasonYear = String(metadata.seasonYear || item.season_id || 'N/A');
  const awardCategory = String(metadata.awardCategory || item.title || 'Award');
  const status = String(item.approval_status || 'pending').replaceAll('_', ' ').toUpperCase();
  const isApproved = item.approval_status === 'approved';

  const awardLabel = item.certificate_type === 'winner_team'
    ? 'TOURNAMENT WINNER'
    : item.certificate_type === 'runner_up_team'
      ? 'TOURNAMENT RUNNER-UP'
      : item.certificate_type === 'man_of_match'
        ? 'MAN OF THE MATCH'
        : item.certificate_type === 'man_of_tournament_runs'
          ? 'BEST BATSMAN'
          : item.certificate_type === 'man_of_tournament_wickets'
            ? 'BEST BOWLER'
            : 'ALL-ROUNDER EXCELLENCE';

  const verifyTarget = item.verification_url || item.qr_payload || 'N/A';
  const verifyLines = splitByWidth(verifyTarget, 285, 8, 4);

  const frames: string[] = [
    fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, palette.bg),
    fillRect(26, 26, PAGE_WIDTH - 52, PAGE_HEIGHT - 52, palette.card),
    strokeRect(16, 16, PAGE_WIDTH - 32, PAGE_HEIGHT - 32, palette.primary, 2.8),
    strokeRect(24, 24, PAGE_WIDTH - 48, PAGE_HEIGHT - 48, palette.accent, 0.8),
    fillRect(40, PAGE_HEIGHT - 96, PAGE_WIDTH - 80, 44, palette.primary),
    strokeLine(72, 370, PAGE_WIDTH - 72, 370, palette.accent, 0.8),
    strokeLine(72, 250, PAGE_WIDTH - 72, 250, palette.accent, 0.8),
    fillRect(40, 40, PAGE_WIDTH - 80, 20, palette.primary),
  ];

  const recipientSize = item.recipient_name.length > 34 ? 24 : item.recipient_name.length > 24 ? 28 : 32;
  const signatureRows = (() => {
    try {
      return item.signatures_json ? JSON.parse(item.signatures_json) : [];
    } catch {
      return [];
    }
  })() as Array<{ role?: string; signerName?: string; signedAt?: string }>;

  const lines: PdfLine[] = [
    { text: 'CRICKET CLUB HONORS BOARD', x: centerX('CRICKET CLUB HONORS BOARD', 14), y: PAGE_HEIGHT - 79, size: 14, font: 'F2', color: [1, 0.96, 0.86] },
    { text: 'CERTIFICATE OF EXCELLENCE', x: centerX('CERTIFICATE OF EXCELLENCE', 34), y: PAGE_HEIGHT - 150, size: 34, font: 'F2', color: palette.primary },
    { text: 'This certificate is proudly presented to', x: centerX('This certificate is proudly presented to', 14), y: PAGE_HEIGHT - 184, size: 14, color: palette.muted },
    { text: item.recipient_name, x: centerX(item.recipient_name, recipientSize), y: PAGE_HEIGHT - 225, size: recipientSize, font: 'F2', color: palette.primary },
    { text: `For exceptional performance in ${tournamentName}`, x: centerX(`For exceptional performance in ${tournamentName}`, 12), y: PAGE_HEIGHT - 254, size: 12, color: palette.text },
    { text: awardLabel, x: centerX(awardLabel, 18), y: PAGE_HEIGHT - 282, size: 18, font: 'F2', color: palette.accent },
    { text: awardCategory, x: centerX(awardCategory, 12), y: PAGE_HEIGHT - 304, size: 12, color: palette.text },

    { text: 'MATCH & TOURNAMENT DETAILS', x: 78, y: 353, size: 10, font: 'F2', color: palette.accent },
    { text: `Tournament: ${tournamentName}`, x: 78, y: 336, size: 10.5, color: palette.text },
    { text: `Season: ${seasonYear}`, x: 78, y: 320, size: 10.5, color: palette.text },
    { text: `Issue Date: ${formatInIST(item.generated_at)}`, x: 78, y: 304, size: 10.5, color: palette.text },
    { text: `Certificate ID: ${item.certificate_id}`, x: 78, y: 288, size: 9.5, color: palette.muted },

    { text: 'SECURITY & VERIFICATION', x: 445, y: 353, size: 10, font: 'F2', color: palette.accent },
    { text: `Approval Status: ${status}`, x: 445, y: 336, size: 10, font: 'F2', color: isApproved ? [0.12, 0.42, 0.2] : [0.65, 0.2, 0.1] },
    { text: `Token: ${(item.verification_token || 'N/A').slice(0, 40)}`, x: 445, y: 320, size: 8.5, color: palette.muted },
    { text: `SHA256: ${(item.security_hash || 'N/A').slice(0, 44)}`, x: 445, y: 304, size: 8.2, color: palette.muted },

    { text: 'DIGITAL VERIFICATION URL', x: 78, y: 232, size: 10, font: 'F2', color: palette.accent },

    { text: 'AUTHORIZED SIGNATORIES', x: centerX('AUTHORIZED SIGNATORIES', 11), y: 148, size: 11, font: 'F2', color: palette.primary },

    { text: `SECURED DOCUMENT | ${item.certificate_id} | SHA256 ${String(item.security_hash || '').slice(0, 30)}`, x: 50, y: 47, size: 7, color: [0.85, 0.82, 0.7] },
  ];

  verifyLines.forEach((line, idx) => {
    lines.push({ text: line, x: 78, y: 215 - idx * 12, size: 8.5, color: palette.primary });
  });

  const sigX = [115, 336, 557];
  const sigRole = ['Treasurer', 'Scoring Official', 'Match Referee'];
  sigX.forEach((x, idx) => {
    frames.push(strokeRect(x, 78, 170, 56, palette.primary, 0.7));
    frames.push(strokeLine(x + 12, 106, x + 158, 106, palette.accent, 0.7));
    lines.push({ text: sigRole[idx], x: x + 45, y: 86, size: 9, color: palette.muted });
  });

  signatureRows.forEach((entry) => {
    const idx = sigRole.indexOf(entry.role || '');
    if (idx < 0 || !entry.signerName) return;
    const x = sigX[idx];
    lines.push({ text: entry.signerName, x: x + 12, y: 113, size: 10, font: 'F2', color: palette.primary });
    if (entry.signedAt) lines.push({ text: formatInIST(entry.signedAt), x: x + 12, y: 96, size: 7.5, color: palette.muted });
  });

  frames.push(strokeRect(72, 272, 340, 88, palette.primary, 0.6));
  frames.push(strokeRect(438, 272, 332, 88, palette.primary, 0.6));
  frames.push(strokeRect(438, 172, 74, 74, palette.primary, 0.9));

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const filled = (row + col) % 2 === 0 || (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
      if (filled) frames.push(fillRect(444 + col * 9, 178 + row * 9, 7, 7, palette.primary));
    }
  }

  lines.push({ text: 'SCAN QR', x: 452, y: 164, size: 7, font: 'F2', color: palette.primary });

  const stream = [...frames, ...lines.map(drawText)].join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >> endobj`,
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
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
