const CompanyEmployee = require('../models/CompanyEmployee');
const { getCompanyById } = require('./company.service');
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

const SHEET = 'Members';
const MAX_ROWS = 5000;

const COLUMNS = [
  { key: 'name', header: 'Name', required: true, width: 26 },
  { key: 'phone', header: 'Phone Number', required: true, width: 16 },
  { key: 'email', header: 'Email', required: true, width: 30 },
  { key: 'designation', header: 'Designation', required: true, width: 24 },
];

const buildTemplate = async (companyId) => {
  const company = await getCompanyById(companyId);
  const wb = newWorkbook();
  addDataSheet(wb, SHEET, COLUMNS);
  return { wb, company };
};

const importFromFile = async (companyId, filePath, createdBy) => {
  await getCompanyById(companyId);
  const wb = await readWorkbook(filePath);
  const rows = readDataSheet(wb, SHEET, COLUMNS, MAX_ROWS);

  const errors = [];
  const push = (row, message) => errors.push({ row, message });
  const seen = new Map(); // email -> first row number
  const wellFormedEmails = [];
  const valid = [];

  rows.forEach(({ rowNumber, data }) => {
    const d = { ...data, email: data.email.toLowerCase() };
    const problems = missingRequired(d, COLUMNS);
    if (d.phone && !isPhone(d.phone)) problems.push(`Invalid Phone Number "${d.phone}"`);
    if (d.email && !isEmail(d.email)) problems.push(`Invalid Email "${d.email}"`);
    if (d.email && seen.has(d.email)) {
      problems.push(`Email ${d.email} is repeated (also on row ${seen.get(d.email)})`);
    } else if (d.email) {
      seen.set(d.email, rowNumber);
      if (isEmail(d.email)) wellFormedEmails.push({ rowNumber, email: d.email });
    }

    if (problems.length) problems.forEach((p) => push(rowNumber, p));
    else valid.push(d);
  });

  // Re-uploading the same file must not create duplicates
  const existing = await CompanyEmployee.find(
    { company: companyId, email: { $in: wellFormedEmails.map((e) => e.email) } },
    'email'
  );
  const existingSet = new Set(existing.map((m) => m.email));
  wellFormedEmails.forEach(({ rowNumber, email }) => {
    if (existingSet.has(email)) push(rowNumber, `A member with email ${email} already exists in this company`);
  });

  throwIfRowErrors(errors);

  const created = await CompanyEmployee.insertMany(
    valid.map((d) => ({
      company: companyId,
      name: d.name,
      phone: d.phone,
      email: d.email,
      designation: d.designation,
      createdBy,
    }))
  );
  return { created: created.length };
};

module.exports = { buildTemplate, importFromFile };
