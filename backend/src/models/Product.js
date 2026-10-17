const mongoose = require('mongoose');
const fileSchema = require('./schemas/file.schema');
const { PRODUCT_STATUS } = require('../config/constants');

// One entry per price change, oldest first
const priceChangeSchema = new mongoose.Schema(
  {
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    changedOn: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 200,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      maxlength: 30,
    },
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.ACTIVE,
    },
    gasType: {
      type: String,
      required: [true, 'Gas type is required'],
      trim: true,
      maxlength: 50,
    },
    cylinderCapacityKg: {
      type: Number,
      required: [true, 'Cylinder capacity is required'],
      min: [0.01, 'Cylinder capacity must be greater than 0'],
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0, 'Price cannot be negative'],
    },
    previousPrices: {
      type: [priceChangeSchema],
      default: [],
    },
    image: fileSchema,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// SKU is optional but must be unique when present
productSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
productSchema.index({ name: 1 });

/*
 * Price history: whenever currentPrice changes on an existing product, record the change.
 * Set `product.$locals.changedBy = adminId` before save to record who changed it.
 */
productSchema.pre('save', function recordPriceChange(next) {
  if (this.isNew || !this.isModified('currentPrice')) return next();

  const oldPrice = this.$locals.previousPrice;
  if (oldPrice !== undefined && oldPrice !== this.currentPrice) {
    this.previousPrices.push({
      oldPrice,
      newPrice: this.currentPrice,
      changedOn: new Date(),
      changedBy: this.$locals.changedBy,
    });
  }
  next();
});

// Remember the price as loaded from the DB so the pre-save hook knows the old value
productSchema.post('init', function rememberPrice() {
  this.$locals.previousPrice = this.currentPrice;
});

productSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
