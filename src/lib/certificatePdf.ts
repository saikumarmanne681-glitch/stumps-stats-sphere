import { CertificateRecord } from './v2types';
import { formatInIST } from './time';

function escapePdfText(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size?: number;
  font?: 'F1' | 'F2';
  color?: [number, number, number];
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

function buildCertificatePdf(item: CertificateRecord) {
  const metadata = (() => {
    try { return item.metadata_json ? JSON.parse(item.metadata_json) : {}; } catch { return {}; }
  })();
  const width = 842; // A4 landscape
  const height = 595;
  const isPending = item.approval_status !== 'approved';
  const theme = item.certificate_template || 'classic';
  type C3 = [number, number, number];
  const palette = {
    classic: { bg: [0.988, 0.984, 0.965] as C3, primary: [0.08, 0.2, 0.38] as C3, accent: [0.73, 0.56, 0.2] as C3, text: [0.14, 0.14, 0.14] as C3 },
    premium: { bg: [0.962, 0.972, 0.994] as C3, primary: [0.1, 0.22, 0.44] as C3, accent: [0.31, 0.5, 0.88] as C3, text: [0.12, 0.15, 0.22] as C3 },
    gold: { bg: [0.995, 0.976, 0.93] as C3, primary: [0.24, 0.17, 0.05] as C3, accent: [0.69, 0.53, 0.13] as C3, text: [0.2, 0.17, 0.08] as C3 },
  }[theme];

  const recipientFontSize = item.recipient_name.length > 36 ? 27 : item.recipient_name.length > 24 ? 31 : 35;
  const titleFontSize = item.title.length > 36 ? 15 : 17;
  const verificationTarget = item.verification_url || item.qr_payload || 'N/A';
  const verificationLines = splitTextByWidth(`Verify: ${verificationTarget}`, 640, 9);
  const awardHeader = item.certificate_type === 'winner_team'
    ? 'WINNER'
    : item.certificate_type === 'runner_up_team'
      ? 'RUNNER-UP'
      : item.certificate_type === 'man_of_match'
        ? 'MAN OF THE MATCH'
        : 'SPECIAL AWARD';

  const signatureMetadata = (() => {
    try {
      return item.signatures_json ? JSON.parse(item.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const lines: PdfTextLine[] = [
    { text: 'CRICKET CLUB HONORS BOARD', x: centerTextX('CRICKET CLUB HONORS BOARD', 13, width), y: 550, size: 13, font: 'F2', color: palette.bg },
    { text: 'CERTIFICATE OF EXCELLENCE', x: centerTextX('CERTIFICATE OF EXCELLENCE', 34, width), y: 486, size: 34, font: 'F2', color: palette.primary },
    { text: 'This certificate is proudly presented to', x: centerTextX('This certificate is proudly presented to', 15, width), y: 446, size: 15, color: palette.text },
    { text: item.recipient_name, x: centerTextX(item.recipient_name, recipientFontSize, width), y: 396, size: recipientFontSize, font: 'F2', color: palette.primary },
    { text: `For exceptional performance in ${String(metadata.tournament || item.tournament_id || 'Tournament')}`, x: centerTextX(`For exceptional performance in ${String(metadata.tournament || item.tournament_id || 'Tournament')}`, 13, width), y: 364, size: 13, color: palette.text },
    { text: `[${awardHeader}] ${item.title}`, x: centerTextX(`[${awardHeader}] ${item.title}`, titleFontSize, width), y: 338, size: titleFontSize, font: 'F2', color: palette.accent },

    { text: `Tournament: ${metadata.tournament || item.tournament_id || 'N/A'}`, x: 82, y: 266, size: 12, color: palette.text },
    { text: `Season: ${metadata.seasonYear || item.season_id || 'N/A'}`, x: 82, y: 246, size: 12, color: palette.text },
    { text: `Award Category: ${metadata.awardCategory || metadata.tournament || 'N/A'}`, x: 82, y: 226, size: 11, color: palette.text },
    { text: `Issue Date: ${formatInIST(item.generated_at)}`, x: 82, y: 206, size: 12, color: palette.text },
    { text: `Certificate ID: ${item.certificate_id}`, x: 464, y: 266, size: 11, color: palette.text },
    { text: `Verification Token: ${item.verification_token || 'N/A'}`, x: 464, y: 246, size: 10, color: palette.text },
    { text: `Approval Status: ${item.approval_status}`, x: 464, y: 226, size: 10.5, color: palette.text },
    { text: `SHA-256 Digest: ${item.security_hash}`, x: 82, y: 184, size: 8.5, color: [0.22, 0.22, 0.22] },

    { text: 'Verification Link', x: 82, y: 160, size: 9, font: 'F2', color: palette.primary },
    { text: 'Authorized Signatories', x: centerTextX('Authorized Signatories', 14, width), y: 164, size: 14, font: 'F2', color: palette.primary },
    { text: 'Treasurer', x: 120, y: 88, size: 11, color: palette.text },
    { text: 'Scoring Official', x: 355, y: 88, size: 11, color: palette.text },
    { text: 'Match Referee', x: 615, y: 88, size: 11, color: palette.text },
  ];

  verificationLines.forEach((line, index) => {
    lines.push({ text: line, x: 82, y: 144 - (index * 11), size: 8.5, color: [0.24, 0.24, 0.24] });
  });

  signatureMetadata.forEach((entry: { role?: string; signerName?: string; signedAt?: string }, index: number) => {
    if (index > 2 || !entry?.role || !entry?.signerName) return;
    const x = [88, 323, 583][index];
    lines.push({ text: `${entry.signerName}`, x, y: 108, size: 10, color: [0.2, 0.2, 0.2] });
    lines.push({ text: `${entry.role}`, x, y: 96, size: 9, color: [0.28, 0.28, 0.28] });
    if (entry.signedAt) {
      lines.push({ text: formatInIST(entry.signedAt), x, y: 84, size: 8.5, color: [0.34, 0.34, 0.34] });
    }
  });

  const background = [
    `${palette.bg.join(' ')} rg 0 0 ${width} ${height} re f`,
    '1 1 1 rg 16 16 810 563 re f',
    `${palette.accent.join(' ')} RG 5 w 16 16 ${width - 32} ${height - 32} re S`,
    `${palette.primary.join(' ')} RG 1.2 w 28 28 ${width - 56} ${height - 56} re S`,
    `${palette.primary.join(' ')} RG 0.8 w 40 40 ${width - 80} ${height - 80} re S`,
    `${palette.primary.join(' ')} rg 40 528 ${width - 80} 34 re f`,
    `${palette.accent.join(' ')} rg 40 38 ${width - 80} 10 re f`,
    `${palette.primary.join(' ')} RG 0.8 w 68 168 706 110 re S`,
    `${palette.primary.join(' ')} RG 0.8 w 68 56 706 118 re S`,
    `${palette.accent.join(' ')} RG 0.8 w 180 381 482 0 m S`,
    `${palette.accent.join(' ')} RG 1.1 w 88 118 188 0 m S 323 118 188 0 m S 583 118 188 0 m S`,
    `${palette.primary.join(' ')} RG 0.9 w 78 74 200 58 re S`,
    `${palette.primary.join(' ')} RG 0.9 w 313 74 200 58 re S`,
    `${palette.primary.join(' ')} RG 0.9 w 573 74 200 58 re S`,
  ];

  const watermark = isPending
    ? [
      'q',
      '0.82 0.18 0.18 rg',
      'BT /F2 50 Tf 1 0 0 1 228 304 Tm (PENDING APPROVAL) Tj ET',
      'Q',
    ]
    : [];

  const contentOps = [
    ...background,
    ...watermark,
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
