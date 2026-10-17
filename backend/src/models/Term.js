const mongoose = require('mongoose');

const MAX_POINTS = 100;

const termSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      required: [true, 'Heading is required'],
      trim: true,
      maxlength: 200,
    },
    // Terms & Conditions points, kept in display order
    points: {
      type: [{ type: String, trim: true, maxlength: 2000 }],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length > 0,
          message: 'At least one point is required',
        },
        {
          validator: (arr) => arr.length <= MAX_POINTS,
          message: `A maximum of ${MAX_POINTS} points is allowed`,
        },
        {
          validator: (arr) => arr.every((p) => p && p.trim()),
          message: 'Points cannot be empty',
        },
      ],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

termSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Term = mongoose.model('Term', termSchema);
Term.MAX_POINTS = MAX_POINTS;

module.exports = Term;
