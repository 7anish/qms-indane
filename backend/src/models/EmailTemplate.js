const mongoose = require('mongoose');
const { EMAIL_FORMAT } = require('../config/emailVariables');

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: 100,
    },
    // Subject and body may contain {{variables}}, see config/emailVariables.js
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: 200,
    },
    // text: plain text (line breaks kept); html: HTML markup (formatting, colours, tables)
    format: { type: String, enum: Object.values(EMAIL_FORMAT), default: EMAIL_FORMAT.TEXT },
    body: {
      type: String,
      required: [true, 'Body is required'],
      maxlength: 50000,
    },
    // Pre-filled CC/BCC when this template is used (can be changed before sending)
    cc: [{ type: String, lowercase: true, trim: true }],
    bcc: [{ type: String, lowercase: true, trim: true }],
    // Pre-selected in the quotation wizard; only one template can be the default
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

emailTemplateSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
