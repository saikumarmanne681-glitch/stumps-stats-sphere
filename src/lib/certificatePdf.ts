import { CertificateRecord } from './v2types';
import { formatInIST } from './time';

function escapePdfText(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]) {
  const textStream = `BT /F1 11 Tf 42 770 Td 15 TL ${lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join(' ')} ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${textStream.length} >> stream\n${textStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
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
  const metadata = (() => {
    try { return item.metadata_json ? JSON.parse(item.metadata_json) : {}; } catch { return {}; }
  })();
  const lines = [
    'CRICKET CLUB • PRESENTATION CERTIFICATE',
    '---------------------------------------',
    `Title: ${item.title}`,
    `Presented To: ${item.recipient_name}`,
    `Tournament: ${metadata.tournament || item.tournament_id || 'N/A'}`,
    `Season: ${metadata.seasonYear || item.season_id || 'N/A'}`,
    `Certificate ID: ${item.certificate_id}`,
    `Type: ${item.certificate_type}`,
    `Status: ${item.approval_status.toUpperCase()}`,
    `Generated: ${formatInIST(item.generated_at)}`,
    `Approved: ${item.approved_at ? formatInIST(item.approved_at) : 'Pending approval signatures'}`,
    'Signatories: Treasurer • Scoring Official • Match Referee',
    `Security Hash: ${item.security_hash}`,
    `Verification QR Payload: ${item.qr_payload}`,
    '',
    'This is an official digital presentation certificate.',
  ];
  return new Blob([buildSimplePdf(lines)], { type: 'application/pdf' });
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
