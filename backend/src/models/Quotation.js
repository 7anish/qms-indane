const mongoose = require('mongoose');
const fileSchema = require('./schemas/file.schema');
const { QUOTATION_STATUS, GST_MODE, DEFAULT_GST_RATE } = require('../config/constants');

/*
 * Lifecycle: draft -> ready -> sent
 * - draft: only the raw wizard inputs in `draft` (may be incomplete); no number, no PDF
 * - ready/sent: company, products, terms and recipients are stored as snapshots (plus a ref to
 *   the source), so an issued quotation never changes when the source records are edited later.
 */

function isFinal() {
  // `this` is the document (or a subdocument whose parent is the quotation)
  const doc = typeof this.ownerDocument === 'function' ? this.ownerDocument() : this;
  return doc.status !== QUOTATION_STATUS.DRAFT;
}

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: String,
    gasType: String,
    unit: String,
    capacityKg: { type: Number, required: true },
    basicPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxableValue: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    total: { type: Number, required: true },
    landedCostPerKg: { type: Number, required: true },
  },
  { _id: false }
);

const termSnapshotSchema = new mongoose.Schema(
  {
    term: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' },
    heading: { type: String, required: true },
    points: [String],
  },
  { _id: false }
);

const recipientSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyEmployee' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    designation: String,
  },
  { _id: false }
);

// Raw wizard inputs of an unfinished quotation, so the wizard can be resumed
const draftSchema = new mongoose.Schema(
  {
    items: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        basicPrice: { type: Number, min: 0 },
        discount: { type: Number, min: 0 },
      },
    ],
    rateMonth: String,
    basicLabel: String,
    gstMode: { type: String, enum: Object.values(GST_MODE) },
    gstRate: { type: Number, min: 0, max: 100 },
    securityDeposit: { type: Number, min: 0 },
    terms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Term' }],
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CompanyEmployee' }],
    emailTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    step: { type: Number, default: 0 },
  },
  { _id: false }
);

const emailLogSchema = new mongoose.Schema(
  {
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    to: [String],
    cc: [String],
    bcc: [String],
    subject: String,
    format: { type: String, enum: ['text', 'html'] },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    mode: { type: String, enum: ['mock', 'smtp'] }, // mock = saved to outbox, not delivered
    messageId: String,
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    // e.g. QT-2026-0001, assigned when the quotation is completed
    quotationNumber: { type: String, required: isFinal },

    status: { type: String, enum: Object.values(QUOTATION_STATUS), default: QUOTATION_STATUS.DRAFT, index: true },

    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    companySnapshot: {
      name: { type: String, required: true },
      address: String,
      email: String,
      phone: String,
      gstNumber: String,
    },

    rateMonth: { type: String, required: isFinal, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // YYYY-MM
    basicLabel: { type: String, default: 'BASIC BY IOCL', trim: true, maxlength: 60 },

    items: {
      type: [itemSchema],
      validate: {
        validator(arr) {
          return !isFinal.call(this) || arr.length > 0;
        },
        message: 'At least one product is required',
      },
    },

    gstMode: { type: String, enum: Object.values(GST_MODE), default: GST_MODE.EXCLUDED },
    gstRate: { type: Number, default: DEFAULT_GST_RATE, min: 0, max: 100 },

    securityDeposit: { type: Number, required: isFinal, min: 0 },

    terms: [termSnapshotSchema],

    // Template pre-selected when sending this quotation by email
    emailTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },

    recipients: {
      type: [recipientSchema],
      validate: {
        validator(arr) {
          return !isFinal.call(this) || arr.length > 0;
        },
        message: 'Select at least one employee to send the quotation to',
      },
    },

    draft: draftSchema,

    pdf: fileSchema,
    emails: [emailLogSchema],
    lastSentAt: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// Drafts have no number, so uniqueness only applies once a number is assigned
quotationSchema.index(
  { quotationNumber: 1 },
  { unique: true, partialFilterExpression: { quotationNumber: { $type: 'string' } } }
);

quotationSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Quotation', quotationSchema);
