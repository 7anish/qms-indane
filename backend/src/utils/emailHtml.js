const sanitizeHtml = require('sanitize-html');

/*
 * HTML email helpers. Admin-written HTML is cleaned before sending: scripts, event handlers,
 * iframes and forms are removed; formatting, colours (inline styles), tables, links and images stay.
 */

const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags, // p, div, span, a, b, i, u, strong, em, ul, ol, li, h1-h6, table, ...
  'img',
  'font',
  'center',
  'del',
  's',
  'sub',
  'sup',
];

const sanitizeEmailHtml = (html) =>
  sanitizeHtml(String(html || ''), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ['style', 'align', 'valign', 'width', 'height', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'class'],
      a: ['href', 'target', 'title', 'style'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      font: ['color', 'size', 'face'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowVulnerableTags: false,
  });

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

// Plain-text alternative for HTML emails (shown by clients that do not render HTML)
const htmlToText = (html) =>
  decodeEntities(
    String(html || '')
      // Line breaks in HTML source are not visible, only tags create new lines
      .replace(/\s*\r?\n\s*/g, ' ')
      .replace(/<(br)\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|table|ul|ol)>/gi, '\n\n')
      .replace(/<\/(div|li|tr)>/gi, '\n')
      .replace(/<\/(td|th)>/gi, '\t')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((line) => line.replace(/^[ ]+|[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Outer wrapper giving every email the same base font
const wrapEmailHtml = (inner) =>
  `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.5">${inner}</div>`;

module.exports = { sanitizeEmailHtml, htmlToText, wrapEmailHtml };
