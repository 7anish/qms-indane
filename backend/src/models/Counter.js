const mongoose = require('mongoose');

// Atomic sequence numbers, e.g. one counter per year for quotation numbers
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
