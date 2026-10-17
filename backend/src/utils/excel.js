const ExcelJS = require('exceljs');
const validator = require('validator');
const ApiError = require('./ApiError');

/*
 * Shared helpers for Excel templates and imports.
 * Templates are a single sheet holding only the header row.
 * A column is { key, header, required?, width? }; mandatory headers get a trailing " *".
 */

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const headerLabel = (col) => (col.required ? `${col.header} *` : col.header);
const normalizeHeader = (h) => String(h || '').replace(/\*/g, '').trim().toLowerCase();

const newWorkbook = () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'QMS';
  wb.created = new Date();
  return wb;
};

const addDataSheet = (wb, name, columns) => {
  const sheet = wb.addWorksheet(name);
  // Text format everywhere so phone numbers and IDs keep leading zeros
  sheet.columns = columns.map((c) => ({ header: headerLabel(c), key: c.key, width: c.width || 20, style: { numFmt: '@' } }));

  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // blue-600
    cell.alignment = { vertical: 'middle' };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
};

const sendWorkbook = async (res, wb, fileName) => {
  res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await wb.xlsx.write(res);
  res.end();
};

const readWorkbook = async (filePath) => {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(filePath);
  } catch {
    throw ApiError.badRequest('Could not read the Excel file. Please upload the .xlsx template.');
  }
  return wb;
};

// Turn any ExcelJS cell value (number, rich text, hyperlink, formula, date) into trimmed text
const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((r) => r.text).join('').trim();
    if (value.text !== undefined) return cellText(value.text);
    if (value.result !== undefined) return cellText(value.result);
    return '';
  }
  return String(value).trim();
};

/**
 * Read the first sheet of an uploaded template into [{ rowNumber, data }].
 * Columns are matched by header text, so reordering columns is tolerated.
 * Throws a 400 when the sheet or a mandatory column is missing, or there is no data.
 */
const readDataSheet = (wb, sheetName, columns, maxRows) => {
  const sheet = wb.worksheets[0];
  if (!sheet) throw ApiError.badRequest('The Excel file has no sheets. Please download the template.');

  const colIndex = {};
  sheet.getRow(1).eachCell((cell, idx) => {
    const col = columns.find((c) => normalizeHeader(c.header) === normalizeHeader(cellText(cell.value)));
    if (col) colIndex[col.key] = idx;
  });
  const missing = columns.filter((c) => c.required && !colIndex[c.key]);
  if (missing.length) {
    throw ApiError.badRequest(`Missing column(s) in "${sheetName}": ${missing.map((c) => c.header).join(', ')}`);
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    columns.forEach((c) => {
      data[c.key] = colIndex[c.key] ? cellText(row.getCell(colIndex[c.key]).value) : '';
    });
    if (Object.values(data).some(Boolean)) rows.push({ rowNumber, data });
  });

  if (!rows.length) throw ApiError.badRequest(`The "${sheetName}" sheet has no data rows to import`);
  if (rows.length > maxRows) {
    throw ApiError.badRequest(`Too many rows (${rows.length}). Maximum is ${maxRows} per file.`);
  }
  return rows;
};

const missingRequired = (data, columns) =>
  columns.filter((c) => c.required && !data[c.key]).map((c) => `${c.header} is required`);

const isPhone = (v) => validator.isMobilePhone(String(v).replace(/[\s-]/g, ''), 'any');
const isEmail = (v) => validator.isEmail(String(v));

// All-or-nothing: if any row failed validation, reject the whole file with the row list
const throwIfRowErrors = (errors) => {
  if (!errors.length) return;
  errors.sort((a, b) => a.row - b.row);
  throw new ApiError(422, `Import failed: ${errors.length} problem(s) found. Nothing was imported.`, errors);
};

module.exports = {
  newWorkbook,
  addDataSheet,
  sendWorkbook,
  readWorkbook,
  readDataSheet,
  missingRequired,
  isPhone,
  isEmail,
  throwIfRowErrors,
};
