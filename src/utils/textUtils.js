import { EXCERPT_LENGTH } from './constants';

/** Strip HTML tags + decode the handful of entities tentap emits. */
export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word count over plain text (pass entry HTML through stripHtml first). */
export function countWords(text) {
  const t = (text || '').trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Excerpt for EntryCard: strips HTML, cuts at a word boundary, adds ellipsis. */
export function makeExcerpt(html, maxLength = EXCERPT_LENGTH) {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

/** Normalize a raw tag: trim, lowercase, collapse inner whitespace, strip leading #. */
export function normalizeTag(raw) {
  return (raw || '')
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
