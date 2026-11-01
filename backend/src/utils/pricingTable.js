const { GST_MODE } = require('../config/constants');

/*
 * The quotation's rates table for emails ({{pricingTable}}), laid out like the PDF:
 * one column per product, yellow month banner, green landed-cost row.
 * Inline styles only, because most email clients ignore <style> blocks.
 */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const amount = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthTitle = (rateMonth) => {
  if (!rateMonth) return '';
  const [y, m] = rateMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();
};

/*
 * Security amounts. Quotations made before security amounts were set per product only have the
 * total, so their per-product rows are hidden when the items don't add up to it.
 */
const securityOf = (q) => {
  const items = q.items || [];
  const sum = Math.round(items.reduce((s, i) => s + (Number(i.securityAmount) || 0), 0) * 100) / 100;
  const total = q.securityDeposit ?? sum;
  return { perItem: sum === Math.round(Number(total) * 100) / 100, total };
};

const rowsFor = (q) => [
  { label: (q.basicLabel || 'BASIC PRICE').toUpperCase(), key: 'basicPrice' },
  { label: 'DISCOUNT', key: 'discount', bold: true },
  { label: 'TAXABLE VALUE', key: 'taxableValue', bold: true },
  {
    label: q.gstMode === GST_MODE.INCLUDED ? `GST @ ${q.gstRate}% (INCLUDED)` : `GST @ ${q.gstRate}%`,
    key: 'gstAmount',
    bold: true,
  },
  { label: 'TOTAL', key: 'total', strong: true },
  { label: 'LANDED COST PER KGS (EXCLUSIVE OF GST)', key: 'landedCostPerKg', strong: true, fill: '#92D050' },
];

const buildPricingTableHtml = (q) => {
  const items = q.items || [];
  if (!items.length) return '';
  const cell = 'border:1px solid #000;padding:6px 10px;font-family:Arial,sans-serif;font-size:13px;color:#111827;';

  const header = `<tr><th colspan="${items.length + 1}" style="${cell}background:#FFFF00;text-align:center;font-weight:bold;">RATES FOR THE MONTH OF ${esc(monthTitle(q.rateMonth))}</th></tr>
<tr><th style="${cell}text-align:left;font-weight:bold;">TYPE OF CYLINDER</th>${items
    .map(
      (i) =>
        `<th style="${cell}text-align:center;font-weight:bold;">${esc(i.name)}<br>${Number(i.capacityKg).toLocaleString('en-IN')} KGS</th>`
    )
    .join('')}</tr>`;

  const body = rowsFor(q)
    .map((r) => {
      const weight = r.bold || r.strong ? 'font-weight:bold;' : '';
      const size = r.strong ? 'font-size:15px;' : '';
      const bg = r.fill ? `background:${r.fill};` : '';
      return `<tr><td style="${cell}${bg}${r.strong ? 'font-weight:bold;' : ''}${size}">${esc(r.label)}</td>${items
        .map((i) => `<td style="${cell}${bg}text-align:right;${weight}${size}">${amount(i[r.key])}</td>`)
        .join('')}</tr>`;
    })
    .join('\n');

  const { perItem, total } = securityOf(q);
  const securityRows = perItem
    ? items
        .map(
          (i) =>
            `<tr><td style="${cell}">${esc(i.name)}</td><td style="${cell}text-align:center;">${Number(i.capacityKg).toLocaleString('en-IN')} KGS</td><td style="${cell}text-align:right;">${amount(i.securityAmount)}</td></tr>`
        )
        .join('\n')
    : '';
  const security = `<tr><th colspan="3" style="${cell}background:#FFFF00;text-align:center;font-weight:bold;">SECURITY AMOUNT</th></tr>
${perItem ? `<tr><th style="${cell}text-align:left;font-weight:bold;">TYPE OF CYLINDER</th><th style="${cell}text-align:center;font-weight:bold;">CAPACITY</th><th style="${cell}text-align:right;font-weight:bold;">SECURITY AMOUNT (RS.)</th></tr>` : ''}
${securityRows}
<tr><td colspan="2" style="${cell}background:#92D050;font-weight:bold;">TOTAL SECURITY AMOUNT</td><td style="${cell}background:#92D050;text-align:right;font-weight:bold;">${amount(total)}</td></tr>`;

  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0;">
${header}
${body}
</table>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0;">
${security}
</table>`;
};

const buildPricingTableText = (q) => {
  const items = q.items || [];
  if (!items.length) return '';
  const lines = [`RATES FOR THE MONTH OF ${monthTitle(q.rateMonth)}`];
  items.forEach((i) => {
    lines.push('', `${i.name} (${Number(i.capacityKg).toLocaleString('en-IN')} KGS)`);
    rowsFor(q).forEach((r) => lines.push(`  ${r.label}: ${amount(i[r.key])}`));
  });

  const { perItem, total } = securityOf(q);
  lines.push('', 'SECURITY AMOUNT');
  if (perItem) {
    items.forEach((i) =>
      lines.push(`  ${i.name} (${Number(i.capacityKg).toLocaleString('en-IN')} KGS): ${amount(i.securityAmount)}`)
    );
  }
  lines.push(`  TOTAL SECURITY AMOUNT: ${amount(total)}`);
  return lines.join('\n');
};

module.exports = { buildPricingTableHtml, buildPricingTableText };
