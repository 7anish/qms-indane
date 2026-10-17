const { GST_MODE } = require('../config/constants');

/*
 * Quotation price maths. Mirrored in frontend/src/utils/quotationCalc.js - keep both in sync.
 *
 * GST excluded (default): taxable = basic - discount; gst = taxable * rate; total = taxable + gst
 * GST included:           total = basic - discount;   taxable = total / (1 + rate); gst = total - taxable
 * Landed cost per kg (always exclusive of GST) = taxable / cylinder capacity (kg)
 *
 * Example (GST excluded, 18%, 425 kg): 54454.66 - 5217.80 = 49236.86 taxable,
 * 8862.63 GST, 58099.49 total, 115.85 per kg.
 */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const calcLine = ({ basicPrice, discount = 0, capacityKg }, gstMode, gstRate) => {
  const basic = round2(basicPrice);
  const disc = round2(discount);
  const net = round2(basic - disc);
  const rate = Number(gstRate) / 100;

  let taxableValue;
  let gstAmount;
  let total;
  if (gstMode === GST_MODE.INCLUDED) {
    total = net;
    taxableValue = round2(net / (1 + rate));
    gstAmount = round2(total - taxableValue);
  } else {
    taxableValue = net;
    gstAmount = round2(taxableValue * rate);
    total = round2(taxableValue + gstAmount);
  }

  return {
    basicPrice: basic,
    discount: disc,
    taxableValue,
    gstAmount,
    total,
    landedCostPerKg: capacityKg > 0 ? round2(taxableValue / capacityKg) : 0,
  };
};

module.exports = { round2, calcLine };
