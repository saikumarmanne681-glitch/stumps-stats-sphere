const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function isSafeAssetUrl(url: string): boolean {
  const value = String(url || '').trim();
  if (!value) return true;
  if (value.startsWith('data:') || value.startsWith('blob:')) return true;
  try {
    const parsed = new URL(value, window.location.href);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function sanitizeCloneForPdf(root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  nodes.forEach((node) => {
    const inlineBackground = node.style.backgroundImage;
    const computedBackground = window.getComputedStyle(node).backgroundImage;
    const backgroundSource = inlineBackground || computedBackground;
    if (backgroundSource && backgroundSource !== 'none') {
      const urls = [...backgroundSource.matchAll(/url\((['"]?)(.*?)\1\)/gi)].map((match) => match[2] || '');
      const unsafeFound = urls.some((candidate) => !isSafeAssetUrl(candidate));
      if (unsafeFound) node.style.backgroundImage = 'none';
    }

    if (node instanceof HTMLImageElement) {
      const source = node.currentSrc || node.src || '';
      if (!isSafeAssetUrl(source)) {
        node.crossOrigin = 'anonymous';
        node.src = TRANSPARENT_PIXEL;
      }
    }
  });
}

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

  const renderCanvas = () => html2canvas(clone, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: clone.scrollWidth,
    height: clone.scrollHeight,
    windowWidth: clone.scrollWidth,
    windowHeight: clone.scrollHeight,
  });

  try {
    // Prevent avoidable cross-origin tainting issues before first render attempt.
    sanitizeCloneForPdf(clone);
    let canvas;
    try {
      canvas = await renderCanvas();
      canvas.toDataURL('image/png');
    } catch {
      // Fallback path: remove external assets that can taint canvas and block export.
      sanitizeCloneForPdf(clone);
      canvas = await renderCanvas();
    }

    if (!canvas) {
      throw new Error('Could not render certificate canvas');
    }

    const image = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    pdf.addImage(image, 'PNG', 0, 0, A4_LANDSCAPE_WIDTH_MM, A4_LANDSCAPE_HEIGHT_MM, undefined, 'FAST');
    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(mount);
  }
}
