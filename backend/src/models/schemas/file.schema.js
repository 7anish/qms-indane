const mongoose = require('mongoose');

// Metadata for a file stored under the uploads directory
const fileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: String,
    mimeType: String,
    size: Number,
    path: { type: String, required: true }, // relative to uploads root, e.g. companies/abc.pdf
    url: { type: String, required: true }, // e.g. /uploads/companies/abc.pdf
  },
  { _id: false, timestamps: { createdAt: 'uploadedAt', updatedAt: false } }
);

module.exports = fileSchema;
