// Mirror of backend/src/utils/template.js, used for live previews
const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g

export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

/**
 * options.html: HTML-escape values; options.raw: values inserted as-is (e.g. the pricing table HTML)
 */
export const renderTemplate = (text, values, options = {}) => {
  const { html = false, raw = {} } = options
  return String(text || "").replace(VARIABLE_PATTERN, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(raw, name)) return String(raw[name] ?? "")
    if (!Object.prototype.hasOwnProperty.call(values, name)) return match
    return html ? escapeHtml(values[name]) : String(values[name] ?? "")
  })
}

export const findUnknownVariables = (text, knownNames) => {
  const unknown = new Set()
  for (const [, name] of String(text || "").matchAll(VARIABLE_PATTERN)) {
    if (!knownNames.has(name)) unknown.add(name)
  }
  return [...unknown]
}

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/* ---------- plain text <-> HTML (used when switching an email's format) ---------- */

// Paragraphs become <p>, single line breaks become <br>; {{variables}} are kept
export const textToHtml = (text) =>
  String(text || "")
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("\n")

export const htmlToText = (html) => {
  const doc = new DOMParser().parseFromString(
    String(html || "")
      .replace(/\s*\n\s*/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6]|table|ul|ol)>/gi, "\n\n")
      .replace(/<\/(div|li|tr)>/gi, "\n")
      .replace(/<\/(td|th)>/gi, "\t")
      .replace(/<li[^>]*>/gi, "- "),
    "text/html"
  )
  return (doc.body.textContent || "")
    .split("\n")
    .map((l) => l.replace(/^ +| +$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// Short plain excerpt of a template body for cards and lists
export const bodyExcerpt = (body, format) => (format === "html" ? htmlToText(body) : String(body || ""))

/**
 * Body HTML of a plain-text email as the backend sends it: line breaks kept and {{pricingTable}}
 * shown as a real table. values are filled in first (escaped).
 */
export const plainEmailToHtml = (text, values, pricingTableHtml) => {
  const marker = `__PRICING_TABLE_${Date.now()}__`
  const filled = renderTemplate(text, values, { raw: { pricingTable: marker } })
  return escapeHtml(filled).replace(/\n/g, "<br>").split(marker).join(pricingTableHtml || "")
}

// Full HTML document for sandboxed preview iframes
export const previewDocument = (innerHtml) =>
  `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:12px;font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.5">${innerHtml}</body></html>`
