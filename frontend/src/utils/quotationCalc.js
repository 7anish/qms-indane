/*
 * Quotation price maths - mirror of backend/src/utils/quotationCalc.js (keep both in sync).
 * The backend recalculates everything on save; this copy only drives the live preview in the wizard.
 */

export const GST_MODE = { EXCLUDED: "excluded", INCLUDED: "included" }
export const DEFAULT_GST_RATE = 18

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export const calcLine = ({ basicPrice, discount = 0, capacityKg }, gstMode, gstRate) => {
  const basic = round2(Number(basicPrice) || 0)
  const disc = round2(Number(discount) || 0)
  const net = round2(basic - disc)
  const rate = (Number(gstRate) || 0) / 100

  let taxableValue
  let gstAmount
  let total
  if (gstMode === GST_MODE.INCLUDED) {
    total = net
    taxableValue = round2(net / (1 + rate))
    gstAmount = round2(total - taxableValue)
  } else {
    taxableValue = net
    gstAmount = round2(taxableValue * rate)
    total = round2(taxableValue + gstAmount)
  }

  return {
    basicPrice: basic,
    discount: disc,
    taxableValue,
    gstAmount,
    total,
    landedCostPerKg: capacityKg > 0 ? round2(taxableValue / capacityKg) : 0,
  }
}

// Plain number with Indian grouping, e.g. 54,454.66 (matches the PDF)
export const formatAmount = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const monthTitle = (rateMonth) => {
  if (!rateMonth) return ""
  const [y, m] = rateMonth.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" }).toUpperCase()
}
