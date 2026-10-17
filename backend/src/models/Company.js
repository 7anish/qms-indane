const mongoose = require('mongoose');
const fileSchema = require('./schemas/file.schema');
const { COMPANY_STATUS, GST_REGEX, PAN_REGEX } = require('../config/constants');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: 500,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    phone: {
      type: String,
      trim: true,
    },

    gstNumber: {
      type: String,
      required: [true, 'GST number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [GST_REGEX, 'Invalid GST number'],
    },
    gstCertificate: fileSchema,

    panNumber: {
      type: String,
      required: [true, 'PAN number is required'],
      uppercase: true,
      trim: true,
      match: [PAN_REGEX, 'Invalid PAN number'],
    },
    panFront: fileSchema,
    panBack: fileSchema,

    msmeNumber: {
      type: String,
      required: [true, 'MSME number is required'],
      uppercase: true,
      trim: true,
    },
    msmeCertificate: fileSchema,

    status: {
      type: String,
      enum: Object.values(COMPANY_STATUS),
      default: COMPANY_STATUS.ACTIVE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

companySchema.index({ name: 1 });

companySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Company', companySchema);
