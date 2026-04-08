const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'u',
  'ul',
]);

const ALLOWED_ATTRS = new Set(['class', 'href', 'rel', 'target', 'title']);

const isSafeUrl = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('mailto:')) {
    return true;
  }
  if (normalized.startsWith('/')) return true;
  return false;
};

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment();
    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child, doc);
      if (sanitizedChild) fragment.appendChild(sanitizedChild);
    });
    return fragment;
  }

  const cleanEl = doc.createElement(tag);

  Array.from(element.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) return;
    if (!ALLOWED_ATTRS.has(name)) return;

    if (name === 'href') {
      if (!isSafeUrl(attr.value)) return;
      cleanEl.setAttribute('href', attr.value);
      return;
    }

    if (name === 'target') {
      cleanEl.setAttribute('target', attr.value === '_blank' ? '_blank' : '_self');
      return;
    }

    if (name === 'rel') {
      cleanEl.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    cleanEl.setAttribute(name, attr.value);
  });

  if (tag === 'a' && cleanEl.getAttribute('target') === '_blank') {
    cleanEl.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(element.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, doc);
    if (sanitizedChild) cleanEl.appendChild(sanitizedChild);
  });

  return cleanEl;
}

export function sanitizeHtml(unsafeHtml: string): string {
  if (typeof window === 'undefined') return '';
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(unsafeHtml || ''), 'text/html');
  const doc = document.implementation.createHTMLDocument('');
  const container = doc.createElement('div');

  Array.from(parsed.body.childNodes).forEach((node) => {
    const sanitized = sanitizeNode(node, doc);
    if (sanitized) container.appendChild(sanitized);
  });

  return container.innerHTML;
}
