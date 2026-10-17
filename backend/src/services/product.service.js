const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { toFileMeta, deleteStoredFile } = require('../utils/file');

const FIELDS = ['name', 'sku', 'description', 'unit', 'status', 'gasType', 'cylinderCapacityKg', 'currentPrice'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listProducts = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.gasType) filter.gasType = query.gasType;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { sku: regex }, { gasType: regex }, { description: regex }];
  }

  const [items, total] = await Promise.all([
    // Price history can grow long; the list only needs the current price
    Product.find(filter, { previousPrices: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

const getProductById = async (id) => {
  const product = await Product.findById(id).populate('previousPrices.changedBy', 'name');
  if (!product) throw ApiError.notFound('Product not found');
  return product;
};

const assertSkuAvailable = async (sku, excludeId) => {
  if (!sku) return;
  const filter = { sku: sku.toUpperCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Product.exists(filter)) throw ApiError.conflict(`SKU ${sku.toUpperCase()} is already used by another product`);
};

const createProduct = async (data, file, adminId) => {
  await assertSkuAvailable(data.sku);

  const doc = { createdBy: adminId, updatedBy: adminId };
  FIELDS.forEach((f) => {
    if (data[f] !== undefined && data[f] !== '') doc[f] = data[f];
  });
  if (file) doc.image = toFileMeta(file);

  return Product.create(doc);
};

const updateProduct = async (id, data, file, adminId) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  if (data.sku && data.sku.toUpperCase() !== product.sku) await assertSkuAvailable(data.sku, id);

  FIELDS.forEach((f) => {
    if (data[f] === undefined) return;
    product[f] = f === 'sku' && data[f] === '' ? undefined : data[f];
  });
  product.updatedBy = adminId;
  product.$locals.changedBy = adminId; // recorded in previousPrices if the price changed

  let staleImage;
  if (file) {
    staleImage = product.image?.path;
    product.image = toFileMeta(file);
  } else if (data.removeImage && product.image) {
    staleImage = product.image.path;
    product.image = undefined;
  }

  await product.save();
  await deleteStoredFile(staleImage);
  return getProductById(id);
};

const deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  await product.deleteOne();
  await deleteStoredFile(product.image?.path);
};

module.exports = { listProducts, getProductById, createProduct, updateProduct, deleteProduct };
