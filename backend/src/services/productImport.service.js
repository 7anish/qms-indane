const Product = require('../models/Product');
const { PRODUCT_STATUS } = require('../config/constants');
const {
  newWorkbook,
  addDataSheet,
  readWorkbook,
  readDataSheet,
  missingRequired,
  throwIfRowErrors,
} = require('../utils/excel');

const SHEET = 'Products';
const MAX_ROWS = 1000;

const COLUMNS = [
  { key: 'name', header: 'Product Name', required: true, width: 32 },
  { key: 'sku', header: 'SKU', width: 16 },
  { key: 'description', header: 'Description', required: true, width: 45 },
  { key: 'unit', header: 'Unit', required: true, width: 14 },
  { key: 'status', header: 'Status', width: 12 }, // Active / Inactive, defaults to Active
  { key: 'gasType', header: 'Gas Type', required: true, width: 18 },
  { key: 'cylinderCapacityKg', header: 'Cylinder Capacity (kg)', required: true, width: 22 },
  { key: 'currentPrice', header: 'Current Price', required: true, width: 16 },
];

const buildTemplate = () => {
  const wb = newWorkbook();
  addDataSheet(wb, SHEET, COLUMNS);
  return wb;
};

// "1,250.50" / "₹ 450" -> number; anything else non-numeric -> NaN
const toNumber = (v) => {
  const cleaned = String(v).replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  return cleaned === '' ? NaN : Number(cleaned);
};

const importFromFile = async (filePath, adminId) => {
  const wb = await readWorkbook(filePath);
  const rows = readDataSheet(wb, SHEET, COLUMNS, MAX_ROWS);

  const errors = [];
  const push = (row, message) => errors.push({ row, message });
  const seenSku = new Map(); // sku -> first row number
  const skuRows = [];
  const valid = [];

  rows.forEach(({ rowNumber, data }) => {
    const problems = missingRequired(data, COLUMNS);
    const sku = data.sku.toUpperCase();
    const status = data.status.toLowerCase() || PRODUCT_STATUS.ACTIVE;
    const capacity = toNumber(data.cylinderCapacityKg);
    const price = toNumber(data.currentPrice);

    if (!Object.values(PRODUCT_STATUS).includes(status)) problems.push(`Status must be Active or Inactive, got "${data.status}"`);
    if (data.cylinderCapacityKg && !(capacity > 0)) problems.push(`Cylinder Capacity must be a number greater than 0, got "${data.cylinderCapacityKg}"`);
    if (data.currentPrice && !(price >= 0)) problems.push(`Current Price must be a number of 0 or more, got "${data.currentPrice}"`);
    if (sku.length > 50) problems.push('SKU is too long (max 50 characters)');
    if (sku && seenSku.has(sku)) {
      problems.push(`SKU ${sku} is repeated (also on row ${seenSku.get(sku)})`);
    } else if (sku) {
      seenSku.set(sku, rowNumber);
      skuRows.push({ rowNumber, sku });
    }

    if (problems.length) {
      problems.forEach((p) => push(rowNumber, p));
      return;
    }
    valid.push({
      name: data.name,
      sku: sku || undefined,
      description: data.description,
      unit: data.unit,
      status,
      gasType: data.gasType,
      cylinderCapacityKg: capacity,
      currentPrice: price,
      createdBy: adminId,
      updatedBy: adminId,
    });
  });

  const existing = await Product.find({ sku: { $in: skuRows.map((s) => s.sku) } }, 'sku');
  const existingSet = new Set(existing.map((p) => p.sku));
  skuRows.forEach(({ rowNumber, sku }) => {
    if (existingSet.has(sku)) push(rowNumber, `SKU ${sku} is already used by another product`);
  });

  throwIfRowErrors(errors);

  const created = await Product.insertMany(valid);
  return { created: created.length };
};

module.exports = { buildTemplate, importFromFile };
