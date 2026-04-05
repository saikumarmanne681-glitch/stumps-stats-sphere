const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const SVG_PLACEHOLDER_TEXT = 'QR available in online verification view';

// Fixed pixel dimensions for consistent PDF rendering
const RENDER_WIDTH = 1400;
const RENDER_HEIGHT = Math.round(RENDER_WIDTH * (210 / 297));

async function waitForFonts() {
  if (!('fonts' in document)) return;
  try {
    await document.fonts.ready;
  } catch {
    // Ignore
  }
}

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

async function settleCloneImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  if (images.length === 0) return;
  await Promise.all(images.map((image) => new Promise<void>((resolve) => {
    if (image.complete) { resolve(); return; }
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  })));
}

function sanitizeCloneForPdf(root: HTMLElement, strict = false) {
  const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
  nodes.forEach((el) => {
    const node = el as HTMLElement;
    if (!node.style) return;

    // Remove Tailwind classes that can cause rendering issues
    if (node.classList) {
      const badClasses = Array.from(node.classList).filter(c =>
        c.startsWith('backdrop-') || c.startsWith('scrollbar-') || c === 'overflow-hidden'
      );
      badClasses.forEach(c => node.classList.remove(c));
    }

    const inlineBackground = node.style.backgroundImage;
    const computedBackground = window.getComputedStyle(node).backgroundImage;
    const backgroundSource = inlineBackground || computedBackground;
    if (backgroundSource && backgroundSource !== 'none') {
      const urls = [...backgroundSource.matchAll(/url\((['"]?)(.*?)\1\)/gi)].map((match) => match[2] || '');
      const unsafeFound = urls.some((candidate) => !isSafeAssetUrl(candidate));
      if (unsafeFound || strict) node.style.backgroundImage = 'none';
    }

    if (node instanceof HTMLImageElement) {
      const source = node.currentSrc || node.src || '';
      if (strict || !isSafeAssetUrl(source)) {
        node.crossOrigin = 'anonymous';
        node.src = TRANSPARENT_PIXEL;
      }
    }

    if (strict && node instanceof SVGElement) {
      const placeholder = document.createElement('div');
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.textAlign = 'center';
      placeholder.style.fontSize = '9px';
      placeholder.style.color = '#5b6660';
      placeholder.style.border = '1px solid rgba(16, 24, 40, 0.15)';
      placeholder.style.borderRadius = '8px';
      placeholder.style.background = 'rgba(255, 255, 255, 0.8)';
      placeholder.style.width = `${node.clientWidth || 96}px`;
      placeholder.style.height = `${node.clientHeight || 96}px`;
      placeholder.textContent = SVG_PLACEHOLDER_TEXT;
      node.replaceWith(placeholder);
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

  // Use fixed pixel dimensions instead of mm for consistent rendering
  mount.style.position = 'fixed';
  mount.style.left = '-10000px';
  mount.style.top = '0';
  mount.style.width = `${RENDER_WIDTH}px`;
  mount.style.height = `${RENDER_HEIGHT}px`;
  mount.style.background = '#ffffff';
  mount.style.pointerEvents = 'none';
  mount.style.overflow = 'visible';
  mount.style.zIndex = '-1';
  mount.style.opacity = '0';

  clone.style.width = `${RENDER_WIDTH}px`;
  clone.style.height = `${RENDER_HEIGHT}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.borderRadius = '0';
  clone.style.boxShadow = 'none';
  clone.style.overflow = 'visible';
  clone.style.boxSizing = 'border-box';

  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    await waitForFonts();
    await settleCloneImages(clone);
    sanitizeCloneForPdf(clone);

    let canvas;
    try {
      canvas = await html2canvas(clone, {
        scale: 2,
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        allowTaint: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        width: RENDER_WIDTH,
        height: RENDER_HEIGHT,
        windowWidth: RENDER_WIDTH,
        windowHeight: RENDER_HEIGHT,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      canvas.toDataURL('image/png');
    } catch {
      sanitizeCloneForPdf(clone, true);
      canvas = await html2canvas(clone, {
        scale: 1.5,
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        allowTaint: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        width: RENDER_WIDTH,
        height: RENDER_HEIGHT,
        windowWidth: RENDER_WIDTH,
        windowHeight: RENDER_HEIGHT,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
    }

    if (!canvas) throw new Error('Could not render certificate canvas');

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
