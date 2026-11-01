const Market = require('../models/Market');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { toFileMeta, deleteStoredFile } = require('../utils/file');

const IMAGE_FIELDS = ['ratesWithGst', 'ratesWithoutGst'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listMarkets = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.search) filter.title = new RegExp(escapeRegex(query.search), 'i');

  const [items, total] = await Promise.all([
    Market.find(filter, { previousRates: 0 }).sort({ title: 1 }).skip(skip).limit(limit),
    Market.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

const getMarketById = async (id) => {
  const market = await Market.findById(id).populate('previousRates.replacedBy', 'name');
  if (!market) throw ApiError.notFound('Market not found');
  return market;
};

const assertTitleAvailable = async (title, excludeId) => {
  const filter = { title: new RegExp(`^${escapeRegex(title.trim())}$`, 'i') };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Market.exists(filter)) throw ApiError.conflict(`A market named "${title.trim()}" already exists`);
};

const createMarket = async (data, files, adminId) => {
  await assertTitleAvailable(data.title);
  const doc = { title: data.title, ratesMonth: data.ratesMonth, createdBy: adminId, updatedBy: adminId };
  IMAGE_FIELDS.forEach((f) => {
    if (files[f]) doc[f] = toFileMeta(files[f]);
  });
  return Market.create(doc);
};

/**
 * Uploading images for a different month keeps the current set in previousRates.
 * Re-uploading within the same month (e.g. to fix a wrong image) just replaces the image.
 */
const updateMarket = async (id, data, files, adminId) => {
  const market = await Market.findById(id);
  if (!market) throw ApiError.notFound('Market not found');

  if (data.title !== undefined && data.title.trim().toLowerCase() !== market.title.toLowerCase()) {
    await assertTitleAvailable(data.title, id);
  }

  const newImages = IMAGE_FIELDS.filter((f) => files[f]);
  const monthChanged = data.ratesMonth !== undefined && data.ratesMonth !== market.ratesMonth;
  const staleFiles = [];

  if (monthChanged && newImages.length && (market.ratesWithGst || market.ratesWithoutGst)) {
    // New month: archive the current set (its files stay on disk)
    market.previousRates.push({
      ratesMonth: market.ratesMonth,
      ratesWithGst: market.ratesWithGst,
      ratesWithoutGst: market.ratesWithoutGst,
      replacedOn: new Date(),
      replacedBy: adminId,
    });
    // An image not re-uploaded for the new month is cleared, so old rates are never sent as new
    IMAGE_FIELDS.forEach((f) => {
      market[f] = files[f] ? toFileMeta(files[f]) : undefined;
    });
  } else {
    newImages.forEach((f) => {
      if (market[f]?.path) staleFiles.push(market[f].path);
      market[f] = toFileMeta(files[f]);
    });
  }

  if (data.title !== undefined) market.title = data.title;
  if (data.ratesMonth !== undefined) market.ratesMonth = data.ratesMonth;
  market.updatedBy = adminId;
  await market.save();
  await Promise.all(staleFiles.map(deleteStoredFile));
  return getMarketById(id);
};

// Quotations keep their own copy of an attached image, so every file can be removed
const deleteMarket = async (id) => {
  const market = await Market.findById(id);
  if (!market) throw ApiError.notFound('Market not found');
  await market.deleteOne();
  const sets = [market, ...market.previousRates];
  await Promise.all(sets.flatMap((s) => IMAGE_FIELDS.map((f) => deleteStoredFile(s[f]?.path))));
};

module.exports = { listMarkets, getMarketById, createMarket, updateMarket, deleteMarket };
