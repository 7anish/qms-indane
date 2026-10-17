const { VARIABLE_NAMES } = require('../config/emailVariables');

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Replace {{name}} with values[name]. Unknown names are left untouched so mistakes stay visible.
 * options.html: HTML-escape the values (for HTML bodies)
 * options.raw:  values inserted as-is even in HTML mode (e.g. the generated pricing table)
 * options.keep: names to leave as {{name}} (filled in later)
 */
const renderTemplate = (text, values, options = {}) => {
  const { html = false, raw = {}, keep = [] } = options;
  return String(text || '').replace(VARIABLE_PATTERN, (match, name) => {
    if (keep.includes(name)) return match;
    if (Object.prototype.hasOwnProperty.call(raw, name)) return String(raw[name] ?? '');
    if (!Object.prototype.hasOwnProperty.call(values, name)) return match;
    return html ? escapeHtml(values[name]) : String(values[name] ?? '');
  });
};

// Variable names used in the text that are not supported
const findUnknownVariables = (text) => {
  const unknown = new Set();
  for (const [, name] of String(text || '').matchAll(VARIABLE_PATTERN)) {
    if (!VARIABLE_NAMES.has(name)) unknown.add(name);
  }
  return [...unknown];
};

module.exports = { renderTemplate, findUnknownVariables, escapeHtml };
