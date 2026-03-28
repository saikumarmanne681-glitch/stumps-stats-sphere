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
  const width = 842;
  const height = 595;
  const isPending = item.approval_status !== 'approved';
  const theme = item.certificate_template || 'classic';
  const palette = {
    classic: { bg: [0.99, 0.98, 0.93], primary: [0.1, 0.23, 0.4], accent: [0.71, 0.52, 0.15] },
    premium: { bg: [0.95, 0.97, 1], primary: [0.14, 0.2, 0.44], accent: [0.26, 0.47, 0.86] },
    gold: { bg: [0.99, 0.97, 0.9], primary: [0.22, 0.17, 0.05], accent: [0.69, 0.53, 0.12] },
  }[theme];

  const certificateLines: PdfTextLine[] = [
    { text: 'CRICKET CLUB OF EXCELLENCE', x: 267, y: 535, size: 12, color: palette.accent },
    { text: 'OFFICIAL PRESENTATION CERTIFICATE', x: 205, y: 505, size: 26, font: 'F2', color: palette.primary },
    { text: 'This certificate is proudly presented to', x: 285, y: 456, size: 13, color: [0.18, 0.18, 0.18] },
    { text: item.recipient_name, x: 270, y: 414, size: 28, font: 'F2', color: palette.primary },
    { text: item.title, x: 305, y: 380, size: 15, color: [0.15, 0.15, 0.15] },
    { text: `Tournament: ${metadata.tournament || item.tournament_id || 'N/A'}`, x: 90, y: 300, size: 12 },
    { text: `Season: ${metadata.seasonYear || item.season_id || 'N/A'}`, x: 90, y: 280, size: 12 },
    { text: `Issue Date: ${formatInIST(item.generated_at)}`, x: 90, y: 260, size: 12 },
    { text: `Certificate ID: ${item.certificate_id}`, x: 520, y: 300, size: 11 },
    { text: `Verification Token: ${item.verification_token || 'N/A'}`, x: 520, y: 280, size: 11 },
    { text: `SHA-256 Digest: ${item.security_hash}`, x: 392, y: 260, size: 9, color: [0.2, 0.2, 0.2] },
    { text: 'Authorized Signatories', x: 345, y: 166, size: 12, font: 'F2', color: palette.primary },
    { text: 'Treasurer', x: 130, y: 104, size: 11 },
    { text: 'Scoring Official', x: 365, y: 104, size: 11 },
    { text: 'Match Referee', x: 630, y: 104, size: 11 },
    { text: `Verify at: ${item.verification_url || item.qr_payload}`, x: 90, y: 64, size: 10, color: [0.2, 0.2, 0.2] },
  ];

  const signatureMetadata = (() => {
    try {
      return item.signatures_json ? JSON.parse(item.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  signatureMetadata.forEach((entry: { role?: string; signerName?: string; signedAt?: string }, index: number) => {
    if (index > 2 || !entry?.role || !entry?.signerName) return;
    const x = [90, 325, 590][index];
    certificateLines.push({
      text: `${entry.signerName} • ${entry.role}`,
      x,
      y: 122,
      size: 10,
      color: [0.25, 0.25, 0.25],
    });
    if (entry.signedAt) {
      certificateLines.push({
        text: formatInIST(entry.signedAt),
        x,
        y: 112,
        size: 9,
        color: [0.35, 0.35, 0.35],
      });
    }
  });

  const background = [
    `${palette.bg.join(' ')} rg 0 0 ${width} ${height} re f`,
    `${palette.accent.join(' ')} RG 5 w 24 24 ${width - 48} ${height - 48} re S`,
    `${palette.primary.join(' ')} RG 1.5 w 36 36 ${width - 72} ${height - 72} re S`,
    `${palette.primary.join(' ')} rg 43 508 756 40 re f`,
    `${palette.accent.join(' ')} rg 43 47 756 16 re f`,
    `${palette.accent.join(' ')} RG 2 w 95 145 190 0 m S 330 145 190 0 m S 595 145 190 0 m S`,
    `${palette.accent.join(' ')} rg 70 320 36 36 re f`,
  ];

  const watermark = isPending
    ? [
      'q',
      '0.88 0.2 0.2 rg',
      '0.18 0.18 0.18 RG',
      'BT /F2 52 Tf 1 0 0 1 215 305 Tm (PENDING APPROVAL) Tj ET',
      'Q',
    ]
    : [];

  const contentOps = [
    ...background,
    ...watermark,
    ...certificateLines.map(drawText),
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
