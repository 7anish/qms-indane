import { GST_MODE, formatAmount, monthTitle } from "@/utils/quotationCalc"

/**
 * On-screen version of the PDF rates table: one column per product.
 * lines: [{ key, name, capacityKg, basicPrice, discount, taxableValue, gstAmount, total, landedCostPerKg }]
 */
export default function RateSheetTable({ lines, rateMonth, basicLabel, gstMode, gstRate }) {
  const gstLabel = gstMode === GST_MODE.INCLUDED ? `GST @ ${gstRate || 0}% (INCLUDED)` : `GST @ ${gstRate || 0}%`

  const rows = [
    { label: (basicLabel || "BASIC PRICE").toUpperCase(), key: "basicPrice" },
    { label: "DISCOUNT", key: "discount", bold: true },
    { label: "TAXABLE VALUE", key: "taxableValue", bold: true },
    { label: gstLabel, key: "gstAmount", bold: true },
    { label: "TOTAL", key: "total", strong: true },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-900 text-sm">
        <thead>
          <tr>
            <th colSpan={lines.length + 1} className="bg-yellow-300 border border-gray-900 px-3 py-2 text-center font-bold text-gray-900">
              RATES FOR THE MONTH OF {monthTitle(rateMonth)}
            </th>
          </tr>
          <tr>
            <th className="border border-gray-900 px-3 py-2 text-left font-bold text-gray-900 w-64">TYPE OF CYLINDER</th>
            {lines.map((l) => (
              <th key={l.key} className="border border-gray-900 px-3 py-2 text-center font-bold text-gray-900 min-w-32">
                <div>{l.name}</div>
                <div>{Number(l.capacityKg).toLocaleString("en-IN")} KGS</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={`border border-gray-900 px-3 py-2 text-gray-900 ${r.strong ? "font-bold text-base" : ""}`}>{r.label}</td>
              {lines.map((l) => (
                <td
                  key={l.key}
                  className={`border border-gray-900 px-3 py-2 text-right text-gray-900 tabular-nums ${
                    r.strong ? "font-bold text-base" : r.bold ? "font-semibold" : ""
                  }`}
                >
                  {formatAmount(l[r.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-lime-400">
            <td className="border border-gray-900 px-3 py-2 font-bold text-gray-900">LANDED COST PER KGS (EXCLUSIVE OF GST)</td>
            {lines.map((l) => (
              <td key={l.key} className="border border-gray-900 px-3 py-2 text-right font-bold text-base text-gray-900 tabular-nums">
                {formatAmount(l.landedCostPerKg)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
