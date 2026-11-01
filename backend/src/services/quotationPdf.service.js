const PDFDocument = require('pdfkit');
const { GST_MODE } = require('../config/constants');

/*
 * Renders a quotation to a PDF Buffer. Used both for the live preview (unsaved data)
 * and for the PDF saved with the quotation, so both always look the same.
 * Layout of the rates table follows the company's existing monthly rate sheet.
 */

const PAGE = { size: 'A4', margin: 40 };
const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#000000',
  headerFill: '#FFFF00', // yellow month banner
  landedFill: '#92D050', // green landed-cost row
  accent: '#2563EB',
};
const PRODUCTS_PER_TABLE = 4;
const LABEL_COL_WIDTH = 215;

const money = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthTitle = (rateMonth) => {
  const [y, m] = rateMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const ensureSpace = (doc, needed) => {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
};

function drawHeader(doc, q) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const top = doc.y;

  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.accent).text('QUOTATION', left, top);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(`Quotation No: ${q.quotationNumber}`, left, top + 2, { width, align: 'right' })
    .text(`Date: ${formatDate(q.createdAt || Date.now())}`, { width, align: 'right' });

  doc.y = Math.max(doc.y, top + 30) + 8;
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(1).strokeColor(COLORS.accent).stroke();
  doc.moveDown(0.8);

  const c = q.companySnapshot;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('TO', left);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.text).text(c.name);
  doc.font('Helvetica').fontSize(10);
  if (c.address) doc.text(c.address, { width: width * 0.6 });
  if (c.gstNumber) doc.text(`GSTIN: ${c.gstNumber}`);
  const contact = [c.phone, c.email].filter(Boolean).join('  |  ');
  if (contact) doc.text(contact);
  doc.moveDown(1);
}

function drawRatesTable(doc, q, items) {
  const left = doc.page.margins.left;
  const tableWidth = doc.page.width - left - doc.page.margins.right;
  const colWidth = (tableWidth - LABEL_COL_WIDTH) / items.length;
  const pad = 6;
  const gstLabel =
    q.gstMode === GST_MODE.INCLUDED ? `GST @ ${q.gstRate}% (INCLUDED)` : `GST @ ${q.gstRate}%`;

  const rows = [
    { type: 'banner', text: `RATES FOR THE MONTH OF ${monthTitle(q.rateMonth)}` },
    {
      label: 'TYPE OF CYLINDER',
      bold: true,
      values: items.map((it) => `${it.name}\n${Number(it.capacityKg).toLocaleString('en-IN')} KGS`),
      align: 'center',
    },
    { label: (q.basicLabel || 'BASIC PRICE').toUpperCase(), values: items.map((it) => money(it.basicPrice)) },
    { label: 'DISCOUNT', values: items.map((it) => money(it.discount)), boldValues: true },
    { label: 'TAXABLE VALUE', values: items.map((it) => money(it.taxableValue)), boldValues: true },
    { label: gstLabel, values: items.map((it) => money(it.gstAmount)), boldValues: true },
    { label: 'TOTAL', values: items.map((it) => money(it.total)), bold: true, size: 12 },
    {
      label: 'LANDED COST PER KGS (EXCLUSIVE OF GST)',
      values: items.map((it) => money(it.landedCostPerKg)),
      bold: true,
      size: 12,
      fill: COLORS.landedFill,
    },
  ];

  // Measure every row first so the whole table can be kept on one page
  const measured = rows.map((row) => {
    const size = row.size || 10;
    if (row.type === 'banner') {
      doc.font('Helvetica-Bold').fontSize(11);
      return { ...row, height: doc.heightOfString(row.text, { width: tableWidth - pad * 2 }) + pad * 2 };
    }
    doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const labelH = doc.heightOfString(row.label, { width: LABEL_COL_WIDTH - pad * 2 });
    doc.font(row.bold || row.boldValues ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const valueH = Math.max(...row.values.map((v) => doc.heightOfString(v, { width: colWidth - pad * 2 })));
    return { ...row, height: Math.max(labelH, valueH) + pad * 2 };
  });

  ensureSpace(doc, measured.reduce((sum, r) => sum + r.height, 0) + 10);
  let y = doc.y;
  doc.lineWidth(0.75).strokeColor(COLORS.border);

  measured.forEach((row) => {
    const size = row.size || 10;

    if (row.type === 'banner') {
      doc.rect(left, y, tableWidth, row.height).fillAndStroke(COLORS.headerFill, COLORS.border);
      doc
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(row.text, left + pad, y + pad, { width: tableWidth - pad * 2, align: 'center' });
      y += row.height;
      return;
    }

    if (row.fill) doc.rect(left, y, tableWidth, row.height).fill(row.fill);
    doc.rect(left, y, LABEL_COL_WIDTH, row.height).stroke();
    doc
      .fillColor(COLORS.text)
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .text(row.label, left + pad, y + pad, { width: LABEL_COL_WIDTH - pad * 2 });

    row.values.forEach((value, i) => {
      const x = left + LABEL_COL_WIDTH + i * colWidth;
      doc.rect(x, y, colWidth, row.height).stroke();
      doc
        .fillColor(COLORS.text)
        .font(row.bold || row.boldValues ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(size)
        .text(value, x + pad, y + pad, { width: colWidth - pad * 2, align: row.align || 'right' });
    });
    y += row.height;
  });

  doc.x = left;
  doc.y = y + 14;
}

// Security amount per product (one row each) with the total at the bottom
function drawSecurityTable(doc, q) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const pad = 6;
  const cols = [
    { header: 'S.NO.', width: 45, align: 'center' },
    { header: 'TYPE OF CYLINDER', width: width - 45 - 110 - 150, align: 'left' },
    { header: 'CAPACITY', width: 110, align: 'center' },
    { header: 'SECURITY AMOUNT (RS.)', width: 150, align: 'right' },
  ];

  const rows = [
    { type: 'banner', text: 'SECURITY AMOUNT' },
    { cells: cols.map((c) => c.header), bold: true, headerRow: true },
    ...q.items.map((it, i) => ({
      cells: [
        String(i + 1),
        it.name,
        `${Number(it.capacityKg).toLocaleString('en-IN')} KGS`,
        money(it.securityAmount),
      ],
    })),
    { type: 'total', label: 'TOTAL SECURITY AMOUNT', value: money(q.securityDeposit) },
  ];

  const measured = rows.map((row) => {
    if (row.type === 'banner') {
      doc.font('Helvetica-Bold').fontSize(11);
      return { ...row, height: doc.heightOfString(row.text, { width: width - pad * 2 }) + pad * 2 };
    }
    doc.font(row.bold || row.type === 'total' ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    if (row.type === 'total') return { ...row, height: doc.heightOfString(row.label) + pad * 2 };
    const h = Math.max(...row.cells.map((cell, i) => doc.heightOfString(cell, { width: cols[i].width - pad * 2 })));
    return { ...row, height: h + pad * 2 };
  });

  // Keep the table on one page when it fits; very long lists continue on the next page
  const pageSpace = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const tableHeight = measured.reduce((sum, r) => sum + r.height, 0) + 10;
  ensureSpace(doc, tableHeight <= pageSpace ? tableHeight : measured.slice(0, 3).reduce((sum, r) => sum + r.height, 0));
  let y = doc.y;
  doc.lineWidth(0.75).strokeColor(COLORS.border);

  measured.forEach((row) => {
    if (y + row.height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.y;
      doc.lineWidth(0.75).strokeColor(COLORS.border);
    }

    if (row.type === 'banner') {
      doc.rect(left, y, width, row.height).fillAndStroke(COLORS.headerFill, COLORS.border);
      doc
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(row.text, left + pad, y + pad, { width: width - pad * 2, align: 'center' });
    } else if (row.type === 'total') {
      const valueWidth = cols[3].width;
      doc.rect(left, y, width, row.height).fill(COLORS.landedFill);
      doc.rect(left, y, width - valueWidth, row.height).stroke();
      doc.rect(left + width - valueWidth, y, valueWidth, row.height).stroke();
      doc
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(row.label, left + pad, y + pad, { width: width - valueWidth - pad * 2 })
        .text(row.value, left + width - valueWidth + pad, y + pad, { width: valueWidth - pad * 2, align: 'right' });
    } else {
      let x = left;
      row.cells.forEach((cell, i) => {
        doc.rect(x, y, cols[i].width, row.height).stroke();
        doc
          .fillColor(COLORS.text)
          .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(10)
          .text(cell, x + pad, y + pad, { width: cols[i].width - pad * 2, align: row.headerRow ? 'center' : cols[i].align });
        x += cols[i].width;
      });
    }
    y += row.height;
  });

  doc.x = left;
  doc.y = y + 18;
}

// Every selected point, from all the chosen terms, as one numbered list under "Terms & Conditions"
function drawTerms(doc, q) {
  const points = (q.terms || []).flatMap((term) => term.points || []);
  if (!points.length) return;
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  ensureSpace(doc, 60);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.accent).text('TERMS & CONDITIONS', left);
  doc.moveDown(0.4);

  points.forEach((point, i) => {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
    ensureSpace(doc, doc.heightOfString(point, { width: width - 28 }) + 4);
    const y = doc.y;
    doc.text(`${i + 1}.`, left + 4, y, { width: 22 });
    doc.text(point, left + 28, y, { width: width - 28 });
    doc.moveDown(0.25);
  });
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would make pdfkit start a new page, so lift the margin briefly
    const { bottom: bottomMargin } = doc.page.margins;
    doc.page.margins.bottom = 0;
    const bottom = doc.page.height - bottomMargin + 12;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `This is a computer-generated quotation.   Page ${i + 1} of ${range.count}`,
        doc.page.margins.left,
        bottom,
        { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center', lineBreak: false }
      );
    doc.page.margins.bottom = bottomMargin;
  }
}

/**
 * @param {object} q quotation-shaped data: quotationNumber, createdAt, companySnapshot, rateMonth,
 *   basicLabel, items[], gstMode, gstRate, securityDeposit, terms[]
 * @returns {Promise<Buffer>}
 */
const renderQuotationPdf = (q) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...PAGE, bufferPages: true, info: { Title: `Quotation ${q.quotationNumber}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, q);
    chunk(q.items, PRODUCTS_PER_TABLE).forEach((items) => drawRatesTable(doc, q, items));
    drawSecurityTable(doc, q);
    drawTerms(doc, q);
    drawFooter(doc);
    doc.end();
  });

module.exports = { renderQuotationPdf };
