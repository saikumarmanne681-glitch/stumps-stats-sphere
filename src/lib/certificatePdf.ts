const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;

export async function downloadCertificatePdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const mount = document.createElement('div');
  const clone = element.cloneNode(true) as HTMLElement;

  mount.style.position = 'fixed';
  mount.style.left = '-10000px';
  mount.style.top = '0';
  mount.style.width = '297mm';
  mount.style.height = '210mm';
  mount.style.background = '#ffffff';
  mount.style.pointerEvents = 'none';
  mount.style.overflow = 'hidden';
  mount.style.zIndex = '-1';

  clone.style.width = '100%';
  clone.style.height = '100%';
  clone.style.maxWidth = 'none';
  clone.style.aspectRatio = '297 / 210';
  clone.style.margin = '0';
  clone.style.borderRadius = '0';
  clone.style.boxShadow = 'none';

  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const image = canvas.toDataURL('image/png');
    pdf.addImage(image, 'PNG', 0, 0, A4_LANDSCAPE_WIDTH_MM, A4_LANDSCAPE_HEIGHT_MM, undefined, 'FAST');
    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(mount);
  }
}