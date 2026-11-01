const mongoose = require('mongoose');
const fileSchema = require('./schemas/file.schema');

/*
 * A market (e.g. "Bhiwadi Market") with its RSP (Retail Selling Price) rate images.
 * The images are replaced every month; when a new month's images are uploaded, the previous
 * month's set is kept in previousRates.
 */

const rateSetSchema = new mongoose.Schema(
  {
    ratesMonth: String, // YYYY-MM
    ratesWithGst: fileSchema,
    ratesWithoutGst: fileSchema,
    replacedOn: { type: Date, default: Date.now },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { _id: false }
);

const marketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 100,
    },
    // Month the current images are for
    ratesMonth: {
      type: String,
      required: [true, 'Rates month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Rates month must be in YYYY-MM format'],
    },
    ratesWithGst: fileSchema,
    ratesWithoutGst: fileSchema,
    previousRates: { type: [rateSetSchema], default: [] }, // oldest first
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

marketSchema.index({ title: 1 });

marketSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Market', marketSchema);
