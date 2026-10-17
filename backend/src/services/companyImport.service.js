const Company = require('../models/Company');
const { GST_REGEX, PAN_REGEX } = require('../config/constants');
const {
  newWorkbook,
  addDataSheet,
  readWorkbook,
  readDataSheet,
  missingRequired,
  isPhone,
  isEmail,
  throwIfRowErrors,
} = require('../utils/excel');

const SHEET = 'Companies';
const MAX_ROWS = 1000;

const COLUMNS = [
  { key: 'name', header: 'Company Name', required: true, width: 32 },
  { key: 'address', header: 'Address', required: true, width: 45 },
  { key: 'email', header: 'Email', width: 28 },
  { key: 'phone', header: 'Phone', width: 16 },
  { key: 'gstNumber', header: 'GST Number', required: true, width: 20 },
  { key: 'panNumber', header: 'PAN Number', required: true, width: 15 },
  { key: 'msmeNumber', header: 'MSME Number', required: true, width: 24 },
];

const buildTemplate = () => {
  const wb = newWorkbook();
  addDataSheet(wb, SHEET, COLUMNS);
  return wb;
};

const importFromFile = async (filePath, createdBy) => {
  const wb = await readWorkbook(filePath);
  const rows = readDataSheet(wb, SHEET, COLUMNS, MAX_ROWS);

  const errors = [];
  const push = (row, message) => errors.push({ row, message });
  const seen = new Map(); // gst -> first row number
  const wellFormedGst = []; // checked against the DB even if the row has other errors
  const valid = [];

  rows.forEach(({ rowNumber, data }) => {
    const d = {
      ...data,
      gstNumber: data.gstNumber.toUpperCase().replace(/\s/g, ''),
      panNumber: data.panNumber.toUpperCase().replace(/\s/g, ''),
      msmeNumber: data.msmeNumber.toUpperCase(),
      email: data.email.toLowerCase(),
    };
    const problems = missingRequired(d, COLUMNS);
    if (d.gstNumber && !GST_REGEX.test(d.gstNumber)) problems.push(`Invalid GST Number "${d.gstNumber}"`);
    if (d.panNumber && !PAN_REGEX.test(d.panNumber)) problems.push(`Invalid PAN Number "${d.panNumber}"`);
    if (d.email && !isEmail(d.email)) problems.push(`Invalid Email "${d.email}"`);
    if (d.phone && !isPhone(d.phone)) problems.push(`Invalid Phone "${d.phone}"`);
    if (d.gstNumber && seen.has(d.gstNumber)) {
      problems.push(`GST Number ${d.gstNumber} is repeated (also on row ${seen.get(d.gstNumber)})`);
    } else if (d.gstNumber) {
      seen.set(d.gstNumber, rowNumber);
      if (GST_REGEX.test(d.gstNumber)) wellFormedGst.push({ rowNumber, gst: d.gstNumber });
    }

    if (problems.length) problems.forEach((p) => push(rowNumber, p));
    else valid.push(d);
  });

  const existing = await Company.find({ gstNumber: { $in: wellFormedGst.map((g) => g.gst) } }, 'gstNumber');
  const existingSet = new Set(existing.map((c) => c.gstNumber));
  wellFormedGst.forEach(({ rowNumber, gst }) => {
    if (existingSet.has(gst)) push(rowNumber, `A company with GST Number ${gst} already exists in QMS`);
  });

  throwIfRowErrors(errors);

  const docs = valid.map((d) => {
    const doc = { createdBy };
    COLUMNS.forEach((c) => {
      if (d[c.key]) doc[c.key] = d[c.key];
    });
    return doc;
  });
  const created = await Company.insertMany(docs);
  return { created: created.length };
};

module.exports = { buildTemplate, importFromFile };
